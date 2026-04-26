/**
 * api.ts – Reusable data adapters
 *
 * DATA FLOW (per protocol):
 *   1. Call FastAPI backend (which calls World Bank / ECB live APIs)
 *   2. FastAPI auto-falls back to mock_data.json if live APIs fail
 *   3. Frontend also has its own mock fallback if FastAPI itself is offline
 */

import type { Corridor, Provider, TimelineRow, ChannelRow, GovernanceData } from '@/types'
import MOCK from '@/data/mock_data.json'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Safe fetch — falls back to mock if backend offline ───────────────────────
async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    console.warn(`[RealRails] Backend offline — frontend mock active for: ${url}`)
    return fallback
  }
}

// ── Frontend mock helpers (last resort if backend is also down) ───────────────

function mockTimeline(corridorId?: string): TimelineRow[] {
  const M = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const rows: TimelineRow[] = []
  const list = corridorId
    ? (MOCK.corridors as Corridor[]).filter(c => c.id === corridorId)
    : (MOCK.corridors as Corridor[])
  list.forEach(c => {
    const base = c.volume_bn_usd * 1e9 / 12
    for (let y = 2020; y <= 2024; y++) {
      for (let m = 1; m <= 12; m++) {
        if (y === 2024 && m > 6) break
        const vol = base * (1 + (y-2020)*0.045) * (1 + 0.15*Math.sin((m-11)*Math.PI/6))
        ;(['formal','informal'] as const).forEach(ch => {
          rows.push({
            year_month: `${y}-${String(m).padStart(2,'0')}`,
            label:      `${M[m]} '${String(y).slice(2)}`,
            channel:    ch,
            volume_usd: Math.round(vol * c[ch]),
            tx_count:   Math.round(vol * c[ch] / 280),
            avg_tx_usd: 265,
          })
        })
      }
    }
  })
  return rows
}
function mockProviders(amount: number, corridorId?: string): Provider[] {
  const allProviders = MOCK.providers as any[]
  const filtered = corridorId
    ? allProviders.filter(p => p.corridor_id === corridorId)
    : allProviders
  const list = (filtered.length > 0 ? filtered : allProviders).map(p => ({
    ...p,
    fee_usd:      +(p.fee_pct / 100 * amount + p.fee_flat).toFixed(2),
    net_received: +(amount - (p.fee_pct / 100 * amount + p.fee_flat)).toFixed(2),
  }))
  const avg = list.reduce((s, p) => s + (p.fee_usd ?? 0), 0) / list.length
  return list
    .map(p => {
      const d = +(((p.fee_usd! - avg) / avg) * 100).toFixed(1)
      return { ...p, vs_avg_pct: d, vs_avg_label: `${Math.abs(d).toFixed(1)}% ${d > 0 ? 'above' : 'below'} regional avg` }
    })
    .sort((a, b) => (a.fee_usd ?? 0) - (b.fee_usd ?? 0))
}

function mockChannels(corridorId?: string): ChannelRow[] {
  const list = corridorId
    ? (MOCK.corridors as Corridor[]).filter(c => c.id === corridorId)
    : (MOCK.corridors as Corridor[])
  return list.map(c => ({
    corridor_id:    c.id,
    corridor_label: c.label,
    formal_bn:      +(c.volume_bn_usd * c.formal).toFixed(2),
    informal_bn:    +(c.volume_bn_usd * c.informal).toFixed(2),
    formal_pct:     +(c.formal * 100).toFixed(1),
    informal_pct:   +(c.informal * 100).toFixed(1),
    hawala_risk:    (c.informal > 0.35 ? 'HIGH' : c.informal > 0.2 ? 'MEDIUM' : 'LOW') as 'HIGH'|'MEDIUM'|'LOW',
    g20_compliant:  c.avg_cost_pct <= 5,
  }))
}

// ── Exported API functions ────────────────────────────────────────────────────

export async function getCorridors(): Promise<{ corridors: Corridor[]; dataSource: string }> {
  // Backend tries World Bank live first, enriches with GDP data
  const d = await safeFetch<{ corridors: Corridor[]; data_source: string }>(
    `${API}/api/corridors`,
    { corridors: MOCK.corridors as Corridor[], data_source: 'frontend_mock' }
  )
  return { corridors: d.corridors, dataSource: d.data_source }
}

export async function getTimeline(corridorId?: string): Promise<TimelineRow[]> {
  const url = `${API}/api/timeline${corridorId ? `?corridor=${corridorId}` : ''}`
  return safeFetch(url, mockTimeline(corridorId))
}

export async function getCostAnalysis(amount: number, corridorId?: string): Promise<Provider[]> {
  const url = `${API}/api/cost-analysis?amount=${amount}${corridorId ? `&corridor=${corridorId}` : ''}`
  return safeFetch(url, mockProviders(amount, corridorId))
}

export async function getChannelComparison(corridorId?: string): Promise<ChannelRow[]> {
  const url = `${API}/api/informal-vs-formal${corridorId ? `?corridor=${corridorId}` : ''}`
  return safeFetch(url, mockChannels(corridorId))
}

export async function getGovernance(): Promise<GovernanceData> {
  try {
    const res = await fetch(`${API}/api/governance`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    // Normalize: backend might return { regulators:[...] } directly
    // or wrapped as { governance: { regulators:[...] } }
    const gov = data?.governance ?? data
    if (!gov?.regulators) throw new Error('Missing regulators')
    return gov as GovernanceData
  } catch {
    console.warn('[RealRails] Governance API offline — using mock')
    const fallback = MOCK.governance as GovernanceData
    return {
      regulators:          fallback?.regulators          ?? [],
      swift_coverage_pct:  fallback?.swift_coverage_pct  ?? 92,
      avg_settlement_days: fallback?.avg_settlement_days ?? 1.4,
    }
  }
}

export async function getFxRates(): Promise<Record<string, { rate_vs_eur: number; source: string }>> {
  // Backend calls ECB live API, falls back to mock rates
  const d = await safeFetch<{ rates: Record<string, { rate_vs_eur: number; source: string }> }>(
    `${API}/api/fx-rates`,
    {
      rates: {
        GBP: { rate_vs_eur: 0.856, source: 'frontend_mock' },
        MXN: { rate_vs_eur: 18.2,  source: 'frontend_mock' },
        INR: { rate_vs_eur: 89.5,  source: 'frontend_mock' },
        NGN: { rate_vs_eur: 1620,  source: 'frontend_mock' },
        PHP: { rate_vs_eur: 61.3,  source: 'frontend_mock' },
        PKR: { rate_vs_eur: 298.0, source: 'frontend_mock' },
        AED: { rate_vs_eur: 3.92,  source: 'frontend_mock' },
      }
    }
  )
  return d.rates
}
