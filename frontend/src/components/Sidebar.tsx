'use client'
/**
 * Sidebar.tsx – Intelligence Sidebar (30% width)
 * Section A: Title & High-level Metric
 * Section B: Why This Matters
 * Section C: Who Controls the Rail
 * Section D: Functional Filters & Tooltips
 * Section E: Download Sample Data
 */
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Corridor, Provider, TimelineRow, ChannelRow, GovernanceData } from '@/types'
import { getTimeline, getCostAnalysis, getChannelComparison, getGovernance } from '@/lib/api'
import { Info, Shield, SlidersHorizontal, Download, Zap, Globe, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'

const TimelineChart = dynamic(() => import('./TimelineChart'), { ssr: false })
const ProviderChart = dynamic(() => import('./ProviderChart'), { ssr: false })

interface Props {
  corridor:           Corridor | undefined
  channel:            'all' | 'formal' | 'informal'
  sendAmount:         number
  onChannelChange:    (v: 'all' | 'formal' | 'informal') => void
  onSendAmountChange: (v: number) => void
}

// ── Human Cost Calculator ─────────────────────────────────────────────────
// Minimum wage data (USD/hr, 2024 estimates) for receiving countries
// Sources: ILO, World Bank labor stats — labeled as estimates
const RECEIVING_COUNTRY_WAGES: Record<string, { hourlyUSD: number; label: string; currency: string }> = {
  'US-MX':  { hourlyUSD: 0.93,  label: 'Mexico',      currency: 'MXN' },
  'US-IN':  { hourlyUSD: 0.28,  label: 'India',        currency: 'INR' },
  'UK-NG':  { hourlyUSD: 0.21,  label: 'Nigeria',      currency: 'NGN' },
  'EU-PH':  { hourlyUSD: 0.95,  label: 'Philippines',  currency: 'PHP' },
  'UAE-PK': { hourlyUSD: 0.18,  label: 'Pakistan',     currency: 'PKR' },
  'US-PH':  { hourlyUSD: 0.95,  label: 'Philippines',  currency: 'PHP' },
  'UAE-IN': { hourlyUSD: 0.28,  label: 'India (Kerala)', currency: 'INR' },
}

function calcHumanCost(corridorId: string, feeUSD: number): string | null {
  const w = RECEIVING_COUNTRY_WAGES[corridorId]
  if (!w || !feeUSD || feeUSD <= 0) return null
  const hours = feeUSD / w.hourlyUSD
  if (hours < 1)   return `This fee = ${Math.round(hours * 60)} mins of work at ${w.label} min. wage`
  if (hours < 8)   return `This fee = ${hours.toFixed(1)} hrs of work at ${w.label} min. wage`
  const days = hours / 8
  return `This fee = ${days.toFixed(1)} day${days >= 2 ? 's' : ''} of work at ${w.label} min. wage`
}

const TREND_ICON = {
  up:   <TrendingUp   className="w-3.5 h-3.5 text-rr-green" />,
  down: <TrendingDown className="w-3.5 h-3.5 text-rr-amber" />,
  flat: <Minus        className="w-3.5 h-3.5 text-rr-muted" />,
}

export default function Sidebar({ corridor, channel, sendAmount, onChannelChange, onSendAmountChange }: Props) {
  const [timeline,   setTimeline]   = useState<TimelineRow[]>([])
  const [providers,  setProviders]  = useState<Provider[]>([])
  const [channels,   setChannels]   = useState<ChannelRow[]>([])
  const [governance, setGovernance] = useState<GovernanceData | null>(null)
  const [tab,        setTab]        = useState<'timeline' | 'providers' | 'channels'>('timeline')

  useEffect(() => { getTimeline(corridor?.id).then(setTimeline) },         [corridor?.id])
  useEffect(() => { getCostAnalysis(sendAmount, corridor?.id).then(setProviders) }, [sendAmount, corridor?.id])
  useEffect(() => { getChannelComparison(corridor?.id).then(setChannels) }, [corridor?.id])
  useEffect(() => { getGovernance().then(setGovernance) },                  [])

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href     = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/download-sample`
    a.download = 'remittance_sample_data.csv'
    a.click()
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!corridor) {
    return (
      <div className="glass h-full flex flex-col items-center justify-center gap-3 text-rr-muted">
        <Globe className="w-10 h-10 opacity-20" />
        <p className="text-sm">Select a corridor on the map</p>
        <p className="text-[10px] text-center px-6 opacity-60">Click any arc line or use the corridor tabs above</p>
      </div>
    )
  }

  const formalPct   = Math.round(corridor.formal   * 100)
  const informalPct = Math.round(corridor.informal * 100)
  const best        = [...providers].sort((a, b) => (a.fee_usd ?? 99) - (b.fee_usd ?? 99))[0]
  const channelRow  = channels.find(c => c.corridor_id === corridor.id)

  return (
    <div className="glass h-full overflow-y-auto flex flex-col text-sm">

      {/* ══════════════════════════════════════════════════
          SECTION A — Title & High-level Metric
      ══════════════════════════════════════════════════ */}
      <div className="p-4 border-b border-rr-border">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-mono text-rr-muted uppercase tracking-widest">Active Corridor</p>
          {TREND_ICON[corridor.trend]}
        </div>
        <h2 className="text-rr-cyan font-semibold text-base leading-tight">{corridor.label}</h2>
        <p className="text-[10px] text-rr-muted mt-0.5">via {corridor.primary_provider} · Payment Rail</p>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded p-2.5" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <p className="text-[10px] text-rr-muted">Annual Volume</p>
            <p className="text-rr-cyan font-mono font-bold text-sm" >
              ${channel === 'formal'
                ? (corridor.volume_bn_usd * corridor.formal).toFixed(1)
                : channel === 'informal'
                ? (corridor.volume_bn_usd * corridor.informal).toFixed(1)
                : corridor.volume_bn_usd}B
            </p>
            <p className="text-[9px] text-rr-muted mt-0.5">
             {channel === 'all' ? 'World Bank est.' : `${channel} channel only`}
            </p>
          </div>
          <div className="rounded p-2.5" style={{ background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.2)' }}>
            <p className="text-[10px] text-rr-muted">Avg Transfer Cost</p>
            <p className={`font-mono font-bold text-sm ${corridor.avg_cost_pct > 4 ? 'text-rr-amber' : 'text-rr-green'}`}>
              {corridor.avg_cost_pct}%
            </p>
            <p className="text-[9px] text-rr-muted mt-0.5">
              {corridor.avg_cost_pct > 5 ? 'Above G20 5% target' : corridor.avg_cost_pct > 4 ? 'Near G20 limit' : 'G20 compliant'}
            </p>
          </div>

          {/* Formal vs Informal bar */}
          <div className="col-span-2 rounded p-2.5" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <p className="text-[10px] text-rr-muted mb-1.5">Formal vs Informal Channel Split</p>
            <div className="w-full h-2 rounded-full bg-rr-border overflow-hidden">
              <div className="h-full rounded-full bg-rr-green transition-all duration-700"
                style={{ width: `${formalPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1.5">
              <span className="text-rr-green font-medium">Formal {formalPct}%</span>
              <span className="text-rr-amber font-medium">Informal {informalPct}%</span>
            </div>
            {channelRow && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {channelRow.hawala_risk === 'HIGH'
                  ? <AlertTriangle className="w-3 h-3 text-rr-amber" />
                  : <CheckCircle   className="w-3 h-3 text-rr-green" />}
                <span className="text-[10px]" style={{ color: channelRow.hawala_risk === 'HIGH' ? '#F59E0B' : '#34D399' }}>
                  Hawala risk: {channelRow.hawala_risk}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION B — Why This Matters
      ══════════════════════════════════════════════════ */}
      <div className="p-4 border-b border-rr-border">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-rr-indigo shrink-0" />
          <p className="text-[10px] font-mono text-rr-muted uppercase tracking-widest">Why This Matters</p>
        </div>
        <p className="text-rr-muted text-xs leading-relaxed">
          This corridor moves{' '}
          <span className="text-rr-text font-semibold">${corridor.volume_bn_usd}B/year</span> — often the{' '}
          <span className="text-rr-cyan">largest single source of foreign income</span> for receiving households.
          {' '}Every 1% cost reduction saves families millions annually.
          {(() => {
            const avgFee = providers.reduce((s, p) => s + (p.fee_usd ?? 0), 0) / (providers.length || 1)
            const humanCost = calcHumanCost(corridor.id, avgFee)
            return humanCost ? (
              <span className="text-rr-amber font-medium"> {humanCost} on average across all providers.</span>
            ) : null
          })()}
          {informalPct > 30 && (
            <span className="text-rr-amber">
              {' '}The {informalPct}% informal share signals significant hawala activity — a financial inclusion and AML risk.
            </span>
          )}
          {corridor.avg_cost_pct > 5 && (
            <span className="text-rr-amber">
              {' '}Cost exceeds the G20 SDG target of 5% — regulatory reform is needed.
            </span>
          )}
        </p>
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION C — Who Controls the Rail
      ══════════════════════════════════════════════════ */}
      <div className="p-4 border-b border-rr-border">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-3.5 h-3.5 text-rr-green shrink-0" />
          <p className="text-[10px] font-mono text-rr-muted uppercase tracking-widest">Who Controls the Rail</p>
        </div>

        {governance ? (
          <>
            <div className="space-y-2.5">
              {(governance.regulators ?? []).map(r => (
                <div key={r.region} className="flex gap-2.5 items-start">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}35` }}>
                    {r.region}
                  </span>
                  <div>
                    <p className="text-rr-text text-[11px] font-medium leading-tight">{r.body}</p>
                    <p className="text-rr-muted text-[10px] mt-0.5">{r.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-rr-border">
              <div className="text-center rounded p-2" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                <p className="text-rr-cyan font-mono font-bold">{governance.swift_coverage_pct}%</p>
                <p className="text-rr-muted text-[9px]">SWIFT Coverage</p>
              </div>
              <div className="text-center rounded p-2" style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)' }}>
                <p className="text-rr-indigo font-mono font-bold">{governance.avg_settlement_days}d</p>
                <p className="text-rr-muted text-[9px]">Avg Settlement</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-rr-muted text-xs">Loading governance data…</p>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION D — Functional Filters & Tooltips
      ══════════════════════════════════════════════════ */}
      <div className="p-4 border-b border-rr-border flex-1">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-rr-amber shrink-0" />
          <p className="text-[10px] font-mono text-rr-muted uppercase tracking-widest">Filters & Analysis</p>
        </div>

        {/* Channel filter */}
        <div className="mb-3">
          <p className="text-[10px] text-rr-muted mb-1.5">Channel Filter</p>
          <div className="flex gap-1">
            {(['all', 'formal', 'informal'] as const).map(ch => (
              <button key={ch} onClick={() => onChannelChange(ch)}
                className={`flex-1 py-1.5 rounded text-[10px] font-medium capitalize transition-all duration-150 ${
                  channel === ch
                    ? 'bg-rr-cyan text-rr-bg glow-cyan'
                    : 'text-rr-muted border border-rr-border hover:border-rr-cyan hover:text-rr-cyan'
                }`}>
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Cost slider */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] text-rr-muted">Send Amount</p>
            <span className="text-rr-cyan font-mono text-xs font-semibold">${sendAmount}</span>
          </div>
          <input type="range" min={50} max={2000} step={50} value={sendAmount}
            onChange={e => onSendAmountChange(+e.target.value)}
            className="w-full h-1.5 rounded-full cursor-pointer accent-[#38BDF8]"
            style={{ background: `linear-gradient(to right, #38BDF8 ${((sendAmount-50)/1950)*100}%, #1F2937 ${((sendAmount-50)/1950)*100}%)` }}
          />
          <div className="flex justify-between text-[9px] text-rr-muted mt-1">
            <span>$50</span><span>$500</span><span>$1,000</span><span>$2,000</span>
          </div>
          {/* ── Human Cost Translation (per case study "Zero Clerical Code") ── */}
          {best && corridor && (() => {
            const humanCost = calcHumanCost(corridor.id, best.fee_usd ?? 0)
            return humanCost ? (
              <div className="mt-2 flex items-start gap-2 p-2 rounded text-[10px]"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <AlertTriangle className="w-3 h-3 text-rr-amber shrink-0 mt-0.5" />
                <span className="text-rr-muted leading-relaxed">
                  <span className="text-rr-amber font-semibold">{humanCost}</span>
                  {' '}— using best available rate ({best.name}).
                  <span className="text-rr-muted"> (ILO min. wage est.)</span>
                </span>
              </div>
            ) : null
          })()}
        </div>

        {/* Tab switch */}
        <div className="flex gap-1 mb-2">
          {(['timeline', 'providers', 'channels'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded text-[9px] font-medium transition-all duration-150 ${
                tab === t
                  ? 'bg-rr-surface border border-rr-cyan text-rr-cyan'
                  : 'text-rr-muted border border-rr-border hover:text-rr-cyan'
              }`}>
              {t === 'timeline' ? 'Timeline' : t === 'providers' ? 'Providers' : 'Channels'}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className="h-56">
          {tab === 'timeline'  && <TimelineChart data={timeline}  channel={channel} />}
          {tab === 'providers' && <ProviderChart providers={providers} />}
          {tab === 'channels'  && (
            <div className="h-full flex flex-col justify-center gap-2 px-1">
              {channels.slice(0, 4).map(c => (
                <div key={c.corridor_id}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-rr-muted truncate">{c.corridor_label}</span>
                    <span className={c.hawala_risk === 'HIGH' ? 'text-rr-amber' : 'text-rr-green'}>{c.hawala_risk}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-rr-border overflow-hidden">
                    <div className="h-full rounded-full bg-rr-green" style={{ width: `${c.formal_pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-rr-muted mt-0.5">
                    <span>Formal {c.formal_pct}%</span>
                    <span>Informal {c.informal_pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intelligence callout */}
        {tab === 'providers' && best && (
          <div className="mt-2 flex items-start gap-2 p-2 rounded text-[10px]"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <Zap className="w-3 h-3 text-rr-green shrink-0 mt-0.5" />
            <span className="text-rr-muted leading-relaxed">
              Best rate: <span className="text-rr-green font-semibold">{best.name}</span> — recipient gets{' '}
              <span className="text-rr-text font-mono">${best.net_received?.toFixed(2)}</span> of your ${sendAmount}.
              Saves <span className="text-rr-green font-mono">${((providers.reduce((s,p)=>s+(p.fee_usd??0),0)/providers.length)-(best.fee_usd??0)).toFixed(2)}</span> vs avg.
            </span>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="mt-2 flex items-start gap-2 p-2 rounded text-[10px]"
            style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)' }}>
            <TrendingUp className="w-3 h-3 text-rr-cyan shrink-0 mt-0.5" />
            <span className="text-rr-muted leading-relaxed">
              Temporal view 2020–2024. Formal volumes peak in <span className="text-rr-cyan">Dec–Jan</span> (holiday remittances).
              YoY growth avg <span className="text-rr-cyan">4.5%</span>.
            </span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          SECTION E — Download Sample Data
      ══════════════════════════════════════════════════ */}
      <div className="p-4">
        <button onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-xs font-semibold
            border border-rr-cyan text-rr-cyan hover:bg-rr-cyan hover:text-rr-bg
            transition-all duration-200 glow-cyan">
          <Download className="w-3.5 h-3.5" />
          Download Sample Data (.csv)
        </button>
        <p className="text-[9px] text-rr-muted text-center mt-1.5">
  100 rows · World Bank / ECB structure · Mock data
</p>
<p className="text-[9px] text-rr-muted text-center mt-0.5">
  World Bank RPW · ECB Data Portal · Data vintage: Q4 2024
</p>
      </div>

    </div>
  )
}
