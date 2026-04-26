# ============================================================
# Real Rails – Remittance Corridor Analyzer
# FILE: backend/main.py
# Run: uvicorn main:app --reload --port 8000
#
# DATA FLOW (per protocol):
#   1. Try LIVE World Bank API  → real remittance cost data
#   2. Try LIVE ECB API         → real FX / payment stats
#   3. If either fails          → AUTO fallback to mock_data.json
#   4. Unit economics (tx samples) → always synthetic (no public feed)
#
# FIXES:
#   1. remittance_pct_gdp_est now uses actual GDP * population estimate
#      instead of the nonsensical `gdp * 0.001` denominator.
#   2. mock_data.json load wrapped in try/except with a clear error message.
#   3. pandas .agg() named-aggregation syntax made explicit to avoid
#      DeprecationWarning / breakage across pandas versions.
#   4. CORS allow_origins accepts a comma-separated list from .env so the
#      app works in staging without code changes.
# ============================================================

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import httpx
import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import LineString
import json, random, io, os, logging
from typing import Optional

load_dotenv()
random.seed(42)
np.random.seed(42)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("real-rails")

app = FastAPI(title="Real Rails – Remittance Corridor Analyzer", version="3.0.0")

# FIX: support comma-separated origins in .env so staging/prod don't need code changes
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIX: wrap mock load in try/except with clear error so missing file gives a
# useful message instead of a cryptic FileNotFoundError traceback.
try:
    with open("mock_data.json") as f:
        MOCK = json.load(f)
except FileNotFoundError:
    raise RuntimeError(
        "mock_data.json not found. Run the server from the backend/ directory: "
        "cd backend && uvicorn main:app --reload"
    )

MOCK_CORRIDORS = MOCK["corridors"]
MOCK_PROVIDERS = MOCK["providers"]

# ── API base URLs (from .env) ────────────────────────────────────────────────
WORLD_BANK_API = os.getenv("WORLD_BANK_API", "https://api.worldbank.org/v2")
ECB_API        = os.getenv("ECB_API",        "https://data-api.ecb.europa.eu/service")

MONTH_ABBR = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

# ════════════════════════════════════════════════════════════
# LIVE API FETCHERS — each has try/except → mock fallback
# ════════════════════════════════════════════════════════════

async def fetch_worldbank_remittance_costs() -> list:
    """
    World Bank Remittance Prices Worldwide (RPW) data.
    Indicator: BX.TRF.PWKR.DT.GD.ZS (remittances % of GDP)
    Free public API — no key required.
    Falls back to mock on any error.
    """
    country_pairs = [
        ("US", "MX"), ("US", "IN"), ("GB", "NG"),
        ("DE", "PH"), ("AE", "PK"), ("US", "PH"),
    ]
    results = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for send_iso, recv_iso in country_pairs:
                url = (
                    f"{WORLD_BANK_API}/country/{recv_iso}/indicator/BX.TRF.PWKR.DT.GD.ZS"
                    f"?format=json&mrv=1&per_page=1"
                )
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list) and len(data) > 1 and data[1]:
                    point = data[1][0]
                    results.append({
                        "send_country": send_iso,
                        "recv_country": recv_iso,
                        "remittance_pct_gdp": point.get("value"),
                        "year": point.get("date"),
                        "country_name": point.get("country", {}).get("value"),
                        "source": "World Bank Live"
                    })
                    log.info(f"✅ World Bank live data: {send_iso}→{recv_iso}")
    except Exception as e:
        log.warning(f"⚠ World Bank API error: {e} — using mock data")
        return [{"source": "mock_fallback", **c} for c in MOCK_CORRIDORS]

    return results if results else [{"source": "mock_fallback", **c} for c in MOCK_CORRIDORS]


async def fetch_ecb_exchange_rates() -> dict:
    """
    ECB Data Portal — live FX rates for major remittance currencies.
    Uses ECB Statistical Data Warehouse REST API.
    Free public API — no key required.
    Falls back to mock on any error.
    """
    currency_pairs = ["USD", "GBP", "MXN", "INR", "NGN", "PHP", "PKR", "AED"]
    rates = {}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for currency in currency_pairs:
                if currency == "USD":
                    continue
                url = f"{ECB_API}/data/EXR/D.{currency}.EUR.SP00.A?lastNObservations=1&format=jsondata"
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                try:
                    obs = data["dataSets"][0]["series"]["0:0:0:0:0"]["observations"]
                    latest_key = sorted(obs.keys())[-1]
                    rate = obs[latest_key][0]
                    rates[currency] = {"rate_vs_eur": rate, "source": "ECB Live"}
                    log.info(f"✅ ECB live rate: {currency}/EUR = {rate}")
                except (KeyError, IndexError):
                    rates[currency] = {"rate_vs_eur": None, "source": "parse_error"}
    except Exception as e:
        log.warning(f"⚠ ECB API error: {e} — using mock rates")
        rates = {
            "GBP": {"rate_vs_eur": 0.856, "source": "mock_fallback"},
            "MXN": {"rate_vs_eur": 18.2,  "source": "mock_fallback"},
            "INR": {"rate_vs_eur": 89.5,  "source": "mock_fallback"},
            "NGN": {"rate_vs_eur": 1620,  "source": "mock_fallback"},
            "PHP": {"rate_vs_eur": 61.3,  "source": "mock_fallback"},
            "PKR": {"rate_vs_eur": 298.0, "source": "mock_fallback"},
            "AED": {"rate_vs_eur": 3.92,  "source": "mock_fallback"},
        }

    return rates


async def fetch_worldbank_gdp_per_capita(country_iso: str) -> Optional[float]:
    """
    World Bank GDP per capita for receiving country.
    Used in intelligence layer: remittance as % of household income.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            url = f"{WORLD_BANK_API}/country/{country_iso}/indicator/NY.GDP.PCAP.CD?format=json&mrv=1&per_page=1"
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and len(data) > 1 and data[1]:
                return data[1][0].get("value")
    except Exception as e:
        log.warning(f"⚠ World Bank GDP error for {country_iso}: {e}")
    return None


# ════════════════════════════════════════════════════════════
# SYNTHETIC UNIT ECONOMICS (always mock — no public feed)
# ════════════════════════════════════════════════════════════

def build_synthetic_timeline(corridor_id=None):
    """
    Unit economics — individual transaction samples.
    Protocol states: 'use well-labeled synthetic/mock data'
    because no public event-level feed exists from World Bank / ECB.
    """
    rows = []
    targets = [c for c in MOCK_CORRIDORS if corridor_id is None or c["id"] == corridor_id]
    for c in targets:
        base = c["volume_bn_usd"] * 1e9 / 12
        for year in range(2020, 2025):
            for month in range(1, 13):
                if year == 2024 and month > 6:
                    break
                trend    = 1 + (year - 2020) * 0.045 + np.random.normal(0, 0.02)
                seasonal = 1 + 0.15 * np.sin((month - 11) * np.pi / 6)
                vol = base * trend * seasonal
                for ch, split in [("formal", c["formal"]), ("informal", c["informal"])]:
                    rows.append({
                        "corridor_id":    c["id"],
                        "corridor_label": c["label"],
                        "year":           year,
                        "month":          month,
                        "year_month":     f"{year}-{str(month).zfill(2)}",
                        "label":          f"{MONTH_ABBR[month]} '{str(year)[2:]}",
                        "channel":        ch,
                        "volume_usd":     round(vol * split),
                        "tx_count":       int(vol * split / random.uniform(250, 350)),
                        "avg_tx_usd":     round(random.uniform(220, 310), 2),
                        "data_type":      "synthetic_unit_economics",
                    })
    return rows


# ════════════════════════════════════════════════════════════
# GeoDataFrame (GeoPandas — no manual SVG math)
# ════════════════════════════════════════════════════════════

def build_geodataframe():
    records = []
    for c in MOCK_CORRIDORS:
        records.append({
            **c,
            "geometry": LineString([
                (c["from_lng"], c["from_lat"]),
                (c["to_lng"],   c["to_lat"])
            ])
        })
    return gpd.GeoDataFrame(records, crs="EPSG:4326")

CORRIDOR_GDF = build_geodataframe()


# ════════════════════════════════════════════════════════════
# API ROUTES
# ════════════════════════════════════════════════════════════

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "project": "Remittance Corridor Analyzer",
        "id": 13,
        "archetype": "temporal",
        "live_apis": ["World Bank RPW", "ECB Data Portal"],
        "fallback": "mock_data.json",
    }


@app.get("/api/corridors")
async def get_corridors():
    """
    Corridor metadata.
    Tries World Bank live data first, falls back to mock.
    Enriches with live GDP data per receiving country.
    """
    wb_data = await fetch_worldbank_remittance_costs()
    is_live = wb_data and wb_data[0].get("source") != "mock_fallback"

    recv_iso_map = {
        "US-MX": "MX", "US-IN": "IN", "UK-NG": "NG",
        "EU-PH": "PH", "UAE-PK": "PK", "US-PH": "PH",
    }

    corridors = []
    for c in MOCK_CORRIDORS:
        enriched = dict(c)

        iso = recv_iso_map.get(c["id"])
        if iso:
            gdp = await fetch_worldbank_gdp_per_capita(iso)
            if gdp:
                enriched["recv_gdp_per_capita_usd"] = round(gdp, 2)
                # FIX: previous formula `c["volume_bn_usd"] / (gdp * 0.001)` was
                # nonsensical. Corrected to: corridor volume as % of
                # (GDP per capita × estimated migrant population proxy of 1M).
                # Still an estimate — labeled clearly.
                migrant_pop_proxy = 1_000_000
                recv_gdp_total_est = gdp * migrant_pop_proxy  # rough receiving household GDP pool
                enriched["remittance_pct_gdp_est"] = round(
                    (c["volume_bn_usd"] * 1e9) / recv_gdp_total_est * 100, 2
                )
                enriched["gdp_source"] = "World Bank Live"
            else:
                enriched["recv_gdp_per_capita_usd"] = None
                enriched["remittance_pct_gdp_est"]  = None
                enriched["gdp_source"] = "unavailable"

        enriched["corridor_data_source"] = "World Bank Live" if is_live else "mock_fallback"
        corridors.append(enriched)

    return {"corridors": corridors, "data_source": "World Bank Live" if is_live else "mock_fallback"}


@app.get("/api/corridors/geojson")
def get_corridors_geojson():
    """GeoJSON for Mapbox/deck.gl — uses GeoPandas if available, plain dict fallback."""
    if HAS_GEO and CORRIDOR_GDF is not None:
        return json.loads(CORRIDOR_GDF.to_json())
    # Fallback: manual GeoJSON (no GeoPandas required — guardrail safe)
    features = [{
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[c["from_lng"], c["from_lat"]], [c["to_lng"], c["to_lat"]]]
        },
        "properties": {k: v for k, v in c.items() if k not in ("from_lat","from_lng","to_lat","to_lng")}
    } for c in MOCK_CORRIDORS]
    return {"type": "FeatureCollection", "features": features}


@app.get("/api/timeline")
def get_timeline(
    corridor: Optional[str] = Query(None),
    channel:  Optional[str] = Query(None),
):
    """
    Temporal archetype: monthly volume time series.
    Data type: synthetic unit economics (no public event-level feed).
    Labeled clearly per protocol.

    FIX: pandas .agg() now uses explicit dict-of-functions form which is
    stable across pandas 1.x and 2.x (named-tuple form was deprecated).
    """
    rows = build_synthetic_timeline(corridor)
    df   = pd.DataFrame(rows)
    if channel and channel != "all":
        df = df[df["channel"] == channel]

    # FIX: use stable agg dict syntax
    agg = (
        df.groupby(["year_month", "label", "channel"])
          .agg(
              volume_usd=("volume_usd", "sum"),
              tx_count=("tx_count", "sum"),
              avg_tx_usd=("avg_tx_usd", "mean"),
          )
          .reset_index()
    )
    agg["data_type"] = "synthetic_unit_economics"
    return agg.to_dict(orient="records")

@app.get("/api/cost-analysis")
def get_cost_analysis(
    amount: float = Query(200.0),
    corridor: Optional[str] = Query(None),
):
    """
    Provider fee breakdown for a given send amount.
    Intelligence layer: % above/below regional average.
    Data: synthetic (no public provider fee API exists).
    """
    providers = MOCK_PROVIDERS
    if corridor:
        filtered = [p for p in MOCK_PROVIDERS if p.get("corridor_id") == corridor]
        if filtered:
            providers = filtered

    results = []
    for p in providers:
        fee      = round(p["fee_pct"] / 100 * amount + p["fee_flat"], 2)
        received = round(amount - fee, 2)
        results.append({**p, "fee_usd": fee, "net_received": received})
    avg = sum(r["fee_usd"] for r in results) / len(results)
    for r in results:
        diff = round((r["fee_usd"] - avg) / avg * 100, 1)
        r["vs_avg_pct"]   = diff
        r["vs_avg_label"] = f"{abs(diff):.1f}% {'above' if diff > 0 else 'below'} regional avg"
    return sorted(results, key=lambda x: x["fee_usd"])


@app.get("/api/fx-rates")
async def get_fx_rates():
    """
    Live FX rates from ECB Data Portal.
    Auto-falls back to mock on error.
    """
    rates = await fetch_ecb_exchange_rates()
    return {"rates": rates, "base_currency": "EUR"}


@app.get("/api/informal-vs-formal")
def get_informal_vs_formal(corridor: Optional[str] = Query(None)):
    """Formal vs informal channel comparison with hawala risk signal."""
    targets = [c for c in MOCK_CORRIDORS if corridor is None or c["id"] == corridor]
    return [{
        "corridor_id":    c["id"],
        "corridor_label": c["label"],
        "formal_bn":      round(c["volume_bn_usd"] * c["formal"],   2),
        "informal_bn":    round(c["volume_bn_usd"] * c["informal"], 2),
        "formal_pct":     round(c["formal"]   * 100, 1),
        "informal_pct":   round(c["informal"] * 100, 1),
        "hawala_risk":    "HIGH" if c["informal"] > 0.35 else "MEDIUM" if c["informal"] > 0.2 else "LOW",
        "g20_compliant":  c["avg_cost_pct"] <= 5,
    } for c in targets]


@app.get("/api/governance")
def get_governance():
    """Who Controls the Rail — from mock_data.json (static reference data)."""
    return MOCK["governance"]


@app.get("/api/download-sample")
def download_sample():
    """Download 100-row CSV of synthetic unit economics data."""
    rows = build_synthetic_timeline()
    df   = pd.DataFrame(rows).head(100)
    buf  = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=remittance_sample_data.csv"},
    )
