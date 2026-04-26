# Remittance Corridor Analyzer
### Real Rails Intelligence Library · PoC ID 13 · Payment Rail

> **Visualizing the cost, speed, and route quality of global remittance corridors.**  
> Built for everyday viewers, builders, and allocators who want to understand how migrant workers move money home — and what it really costs them.

---

## Overview

The Remittance Corridor Analyzer is a production-style intelligence dashboard that maps and analyzes **7 major remittance corridors** covering **$179B+ in annual cross-border flows**. It integrates live data from the World Bank Remittance Prices API and ECB Data Portal, with a clean dark UI built on the Real Rails DNA design system.

The dashboard exposes:
- **Where money flows** — interactive Leaflet world map with corridor arcs
- **What it costs** — avg transfer cost % vs G20 5% target
- **Who controls it** — provider benchmarking and regulatory layer
- **How it moves** — formal vs informal channel split with hawala risk signal
- **Temporal trends** — monthly volume timeline from 2020–2024

---

## Live Demo

```
Frontend → http://localhost:3000
Backend  → http://localhost:8000
API Docs → http://localhost:8000/docs
```

---

## Corridors Covered

| Corridor | Volume/yr | Avg Cost | Formal | Informal |
|---|---|---|---|---|
| USA → Mexico | $61.1B | 3.1% | 74% | 26% |
| USA → India | $32.7B | 2.4% ✅ | 91% | 9% |
| UAE → India | $20.1B | 4.2% | 78% | 22% |
| UK → Nigeria | $21.3B | 4.8% | 61% | 39% |
| UAE → Pakistan | $18.5B | 5.2% ⚠️ | 55% | 45% |
| EU → Philippines | $14.9B | 3.7% | 82% | 18% |
| USA → Philippines | $11.2B | 3.3% | 86% | 14% |

> ⚠️ Above G20 5% cost target &nbsp;&nbsp; ✅ G20 compliant

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.5 | React framework |
| React | 18 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4.1 | Styling |
| Leaflet + React Leaflet | 1.9.4 / 4.2.1 | Interactive corridor map |
| Recharts | 2.12.7 | Timeline + Provider charts |
| D3.js | 7.9.0 | Data utilities |
| TanStack Table | 8.19.3 | Data tables |
| Lucide React | 0.400.0 | Icons |
| Radix UI | latest | Accessible UI primitives |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.111.0 | REST API framework |
| Uvicorn | 0.29.0 | ASGI server |
| Pandas | 2.2.2 | Data processing |
| NumPy | 1.26.4 | Numerical computing |
| GeoPandas | 0.14.4 | Geospatial data |
| Shapely | 2.0.4 | Geometry operations |
| httpx | 0.27.0 | Async HTTP client |
| python-dotenv | 1.0.1 | Environment variables |

### Data Sources
| Source | Type | Usage |
|---|---|---|
| World Bank Remittance Prices API | Live | Corridor cost data |
| ECB Data Portal | Live | FX rates (EUR pairs) |
| Synthetic Unit Economics | Mock | Transaction-level samples |

---

## Project Structure

```
remittance-corridor-analyzer/
├── backend/
│   ├── main.py              # FastAPI app — all API routes
│   ├── mock_data.json       # Fallback data (corridors, providers, governance)
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx         # Main dashboard (70/30 layout)
    │   │   ├── layout.tsx       # Root layout
    │   │   └── globals.css      # Real Rails DNA styles
    │   ├── components/
    │   │   ├── CorridorMap.tsx  # Leaflet world map with arc lines
    │   │   ├── Sidebar.tsx      # Intelligence sidebar (30%)
    │   │   ├── TimelineChart.tsx # Monthly volume area chart
    │   │   └── ProviderChart.tsx # Provider fee bar chart
    │   ├── lib/
    │   │   └── api.ts           # Data adapters with 3-tier fallback
    │   ├── data/
    │   │   └── mock_data.json   # Frontend fallback data
    │   └── types/
    │       └── index.ts         # TypeScript type definitions
    ├── tailwind.config.js       # Real Rails DNA colour tokens
    ├── next.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- pip

---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run the server
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

### Environment Variables

**`backend/.env`**
```env
ALLOWED_ORIGINS=http://localhost:3000
WORLD_BANK_API=https://api.worldbank.org/v2
ECB_API=https://data-api.ecb.europa.eu/service
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Data Flow

```
1. Frontend calls FastAPI backend
         ↓
2. Backend tries World Bank Live API → real remittance cost data
         ↓
3. Backend tries ECB API → real FX rates
         ↓
4. If either fails → AUTO fallback to mock_data.json
         ↓
5. If backend is offline → Frontend uses own mock data
         ↓
6. Unit economics (tx samples) → always synthetic (no public feed)
```

The header badge shows **LIVE** (green) or **MOCK** (amber) so users always know the data status.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check + project metadata |
| GET | `/api/corridors` | All corridor data (World Bank enriched) |
| GET | `/api/corridors/geojson` | GeoJSON for mapping |
| GET | `/api/timeline` | Monthly volume time series |
| GET | `/api/cost-analysis` | Provider fee breakdown by corridor |
| GET | `/api/fx-rates` | Live FX rates from ECB |
| GET | `/api/informal-vs-formal` | Channel comparison with hawala risk |
| GET | `/api/governance` | Who controls the rail |
| GET | `/api/download-sample` | Download 100-row CSV |

---

## Key Features

### 🗺️ Interactive Corridor Map
- Dark CartoDB basemap via Leaflet
- Corridor arcs with cyan highlight on selection
- Click to select — sidebar updates automatically
- Tooltip with cost %, volume, speed per corridor

### 📊 Provider Benchmarking
- 3–4 providers per corridor (corridor-specific, not global)
- Sorted cheapest → most expensive
- Cyan bars = below average, Indigo bars = above average
- Average reference line
- Human cost calculator (fee in hours of local minimum wage)

### 📈 Temporal Timeline
- Monthly volume 2020–2024
- Formal vs Informal channel split
- Year boundary reference lines
- COVID dip marker (Apr 2020)
- Seasonal holiday spike visible in December

### 🔍 Intelligence Sidebar
- **Section A** — Active corridor KPIs
- **Section B** — Why This Matters (plain English)
- **Section C** — Who Controls the Rail (regulators)
- **Section D** — Filters & Analysis
- **Section E** — Download Sample Data

### ⚡ Filters
- Channel filter: All / Formal / Informal
- Send amount slider: $50 → $2,000
- All charts update dynamically

---

## Design System

Built on the **Real Rails DNA**:

| Token | Value | Usage |
|---|---|---|
| Background | `#030712` | Obsidian Black — all surfaces |
| Surface | `#0B1117` | Cards and panels |
| Primary | `#38BDF8` | Cyan — highlights and CTAs |
| Secondary | `#818CF8` | Indigo — badges and labels |
| Success | `#34D399` | Green — G20 compliant, formal |
| Warning | `#F87171` | Red — alerts |
| Amber | `#FBBF24` | Above G20 target, informal |
| Font Primary | Space Grotesk | Body and headings |
| Font Mono | IBM Plex Mono | Labels, codes, KPIs |
| Layout | 70 / 30 | Main stage / Intelligence sidebar |

---

## Quality Assurance

| Document | Result |
|---|---|
| VAR (Visualization Audit Report) | ✅ 28/28 PASS |
| UAT (User Acceptance Testing) | ✅ 50/50 test cases |
| DNA Compliance | ✅ Full Real Rails DNA |
| Data Attribution | ✅ World Bank + ECB labeled |

---

## Data Attribution

- **World Bank Remittance Prices Worldwide** — corridor cost data
- **ECB Data Portal** — FX rates (EUR pairs)
- **Synthetic Unit Economics** — transaction-level samples (clearly labeled, not real data)
- **ILO Minimum Wage Estimates** — human cost calculator
- Data vintage: **Q4 2024**

---

## License

MIT — Real Rails Intelligence Library  
PoC ID 13 · Payment Rail · Temporal Archetype · Episode + LinkedIn Format
