'use client'
/**
 * page.tsx — Main Dashboard
 * Real Rails · Remittance Corridor Analyzer · ID 13
 * Temporal Archetype · Payment Rail
 * Layout: 70% Main Stage + 30% Intelligence Sidebar
 *
 * v4.0 — New Features:
 *   1. Corridor Heatmap     — arcs colour-coded by volume intensity
 *   2. Cost vs Income       — scatter chart in main stage
 *   3. Player Breakdown     — in sidebar Players tab
 *   4. FX Margin Visualizer — in sidebar FX Margin tab
 *   5. Volume Flow Tracker  — in sidebar Volume tab
 */

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Corridor } from '@/types'
import { getCorridors, getHeatmap, getCostIncomeOverlay, getVolumeFlow } from '@/lib/api'
import MOCK from '@/data/mock_data.json'
import Sidebar from '@/components/Sidebar'
import { Activity, Globe, TrendingUp, AlertCircle, Radio, CloudOff } from 'lucide-react'

const CorridorMap = dynamic(() => import('@/components/CorridorMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <Globe className="w-8 h-8 text-rr-cyan animate-pulse" />
      <p className="text-sm text-rr-muted font-mono tracking-wide">LOADING MAP ENGINE</p>
    </div>
  ),
})

const CostIncomeChart = dynamic(() => import('@/components/CostIncomeChart'), { ssr: false })

export default function Dashboard() {
  const [corridors,    setCorridors]    = useState<Corridor[]>(MOCK.corridors as Corridor[])
  const [selectedId,   setSelectedId]   = useState('US-MX')
  const [channel,      setChannel]      = useState<'all' | 'formal' | 'informal'>('all')
  const [amount,       setAmount]       = useState(200)
  const [dataSource,   setDataSource]   = useState<string>('frontend_mock')
  const [heatmapData,  setHeatmapData]  = useState<any[]>([])
  const [costIncome,   setCostIncome]   = useState<any[]>([])
  const [volumeFlow,   setVolumeFlow]   = useState<any>(null)
  const [mainTab,      setMainTab]      = useState<'map' | 'costincome' | 'volume'>('map')

  useEffect(() => {
    getCorridors().then(({ corridors: data, dataSource: src }) => {
      setCorridors(data)
      setDataSource(src)
    })
    getHeatmap().then(setHeatmapData)
    getCostIncomeOverlay().then(setCostIncome)
    getVolumeFlow().then(setVolumeFlow)
  }, [])

  const active      = corridors.find(c => c.id === selectedId)
  const totalVolume = corridors.reduce((s, c) => s + c.volume_bn_usd, 0).toFixed(0)
  const highRisk    = corridors.filter(c => c.avg_cost_pct > 5).length
  const isLive      = dataSource === 'World Bank Live'

  // Get heatmap colour for selected corridor
  const heatEntry   = heatmapData.find(h => h.corridor_id === selectedId)
  const heatColor   = heatEntry?.heat_color ?? '#38BDF8'

  return (
    <div className="flex flex-col h-screen bg-rr-bg overflow-hidden">

      {/* ══════════ TOP HEADER ══════════ */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b border-rr-border shrink-0"
        style={{ background: 'rgba(17, 57, 96, 0.97)', backdropFilter: 'blur(8px)' }}>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rr-cyan pulse" />
            <span className="text-[10px] font-mono text-rr-muted uppercase tracking-widest">Real Rails</span>
          </div>
          <span className="text-rr-border">|</span>
          <h1 className="text-rr-text text-sm font-semibold tracking-tight">
            Remittance Corridor Analyzer
          </h1>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-rr-indigo"
            style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)' }}>
            PAYMENT RAIL · ID 13
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded text-rr-amber"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            TEMPORAL
          </span>
        </div>

        <div className="flex items-center gap-5 text-[10px]">
          <div className="flex items-center gap-1.5 text-rr-muted">
            <TrendingUp className="w-3 h-3 text-rr-green" />
            <span>Tracked Volume</span>
            <span className="text-rr-cyan font-mono font-semibold">${totalVolume}B/yr</span>
          </div>
          <div className="flex items-center gap-1.5 text-rr-muted">
            <Activity className="w-3 h-3 text-rr-indigo" />
            <span>{corridors.length} Corridors</span>
          </div>
          {highRisk > 0 && (
            <div className="flex items-center gap-1.5 text-rr-amber">
              <AlertCircle className="w-3 h-3" />
              <span>{highRisk} above G20 5% target</span>
            </div>
          )}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded font-mono"
            style={{
              background: isLive ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${isLive ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.3)'}`,
              color: isLive ? '#34D399' : '#F59E0B',
            }}>
            {isLive ? <Radio className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
            <span>{isLive ? 'World Bank · ECB Live' : 'Mock Data Active'}</span>
          </div>
        </div>
      </header>

      {/* ══════════ CORRIDOR TABS ══════════ */}
      <div
        className="flex items-center gap-1.5 px-4 py-2 border-b border-rr-border overflow-x-auto shrink-0"
        style={{ background: 'rgba(11,17,23,0.7)' }}>
        <span className="text-[9px] font-mono text-rr-muted uppercase tracking-widest mr-1 shrink-0">Corridors</span>
        {corridors.map(c => {
          const heat = heatmapData.find(h => h.corridor_id === c.id)
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-3 py-1.5 rounded text-[10px] font-medium whitespace-nowrap transition-all duration-150 ${
                selectedId === c.id
                  ? 'text-rr-bg glow-cyan'
                  : 'text-rr-muted border border-rr-border hover:border-rr-cyan hover:text-rr-cyan'
              }`}
              style={selectedId === c.id ? { background: heat?.heat_color ?? '#38BDF8' } : {}}>
              {c.label}
              {c.avg_cost_pct > 5 && (
                <span className="ml-1.5 text-[8px] font-mono px-1 rounded"
                  style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                  HIGH
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ══════════ MAIN STAGE TABS ══════════ */}
      <div
        className="flex items-center gap-1.5 px-4 py-1.5 border-b border-rr-border shrink-0"
        style={{ background: 'rgba(11,17,23,0.5)' }}>
        <span className="text-[9px] font-mono text-rr-muted uppercase tracking-widest mr-2">View</span>
        {([
          { key: 'map',       label: '🗺️ Corridor Heatmap'      },
          { key: 'costincome',label: '📊 Cost vs Income'         },
          { key: 'volume',    label: '🌊 Volume Flow Tracker'    },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)}
            className={`px-3 py-1 rounded text-[10px] font-medium transition-all duration-150 ${
              mainTab === t.key
                ? 'bg-rr-cyan text-rr-bg'
                : 'text-rr-muted border border-rr-border hover:border-rr-cyan hover:text-rr-cyan'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ MAIN 70/30 LAYOUT ══════════ */}
      <div className="flex flex-1 gap-3 p-3 overflow-hidden min-h-0">

        {/* ── LEFT: Main Stage 70% ── */}
        <main className="flex flex-col gap-3" style={{ width: '70%' }}>

          {/* ── MAP VIEW (Corridor Heatmap) ── */}
          {mainTab === 'map' && (
            <div className="glass flex-1 overflow-hidden relative min-h-0">
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] text-rr-muted font-mono"
                style={{ background: 'rgba(3,7,18,0.9)', border: '1px solid #1F2937', backdropFilter: 'blur(4px)' }}>
                <Globe className="w-3 h-3 text-rr-cyan" />
                CORRIDOR HEATMAP · VOLUME INTENSITY
              </div>

              {/* Heatmap legend */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-2.5 py-1.5 rounded text-[9px] font-mono"
                style={{ background: 'rgba(3,7,18,0.9)', border: '1px solid #1F2937' }}>
                <span className="text-rr-muted">Volume:</span>
                {[
                  { color: '#F87171', label: 'Very High' },
                  { color: '#FBBF24', label: 'High'      },
                  { color: '#38BDF8', label: 'Medium'    },
                  { color: '#818CF8', label: 'Low'        },
                ].map(h => (
                  <div key={h.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                    <span className="text-rr-muted">{h.label}</span>
                  </div>
                ))}
              </div>

              <div className="absolute bottom-2 right-2 z-10 px-2 py-1 rounded text-[9px] text-rr-muted font-mono"
                style={{ background: 'rgba(3,7,18,0.8)', border: '1px solid #1F2937' }}>
                Sources: World Bank · ECB Data Portal · Synthetic Mock
              </div>
              <CorridorMap
                corridors={corridors}
                selectedId={selectedId}
                onSelect={setSelectedId}
                heatmapData={heatmapData}
              />
            </div>
          )}

          {/* ── COST vs INCOME VIEW ── */}
          {mainTab === 'costincome' && (
            <div className="glass flex-1 overflow-hidden relative min-h-0 p-4">
              <div className="mb-3">
                <p className="text-[10px] font-mono text-rr-muted uppercase tracking-widest mb-0.5">
                  Cost vs Income Overlay
                </p>
                <p className="text-rr-text text-xs">
                  Remittance fee % vs sender income — reveals which corridors burden senders most
                </p>
              </div>
              <div style={{ height: 'calc(100% - 60px)' }}>
                <CostIncomeChart data={costIncome} />
              </div>
            </div>
          )}

          {/* ── VOLUME FLOW TRACKER ── */}
          {mainTab === 'volume' && (
            <div className="glass flex-1 overflow-hidden relative min-h-0 p-4">
              <div className="mb-3 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-mono text-rr-muted uppercase tracking-widest mb-0.5">
                    Volume Flow Tracker
                  </p>
                  <p className="text-rr-text text-xs">
                    Total corridor volume ranked — {volumeFlow?.corridor_count ?? 15} corridors tracked
                  </p>
                </div>
                {volumeFlow && (
                  <div className="text-right">
                    <p className="text-rr-cyan font-mono font-bold text-lg">${volumeFlow.total_bn_usd}B</p>
                    <p className="text-[9px] text-rr-muted">Total tracked volume</p>
                  </div>
                )}
              </div>
              {volumeFlow && (
                <div className="overflow-y-auto" style={{ height: 'calc(100% - 70px)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[9px] text-rr-muted uppercase border-b border-rr-border">
                        <th className="text-left py-1.5 font-mono">Corridor</th>
                        <th className="text-right py-1.5 font-mono">Volume</th>
                        <th className="text-right py-1.5 font-mono">Share</th>
                        <th className="text-right py-1.5 font-mono">Cost %</th>
                        <th className="text-right py-1.5 font-mono">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volumeFlow.flows.map((f: any, i: number) => (
                        <tr
                          key={f.corridor_id}
                          onClick={() => setSelectedId(f.corridor_id)}
                          className={`border-b border-rr-border cursor-pointer transition-colors ${
                            selectedId === f.corridor_id ? 'bg-rr-surface' : 'hover:bg-rr-surface'
                          }`}>
                          <td className="py-1.5 text-rr-text font-medium">
                            <span className="text-rr-muted font-mono mr-2">{i+1}</span>
                            {f.corridor_label}
                          </td>
                          <td className="py-1.5 text-right font-mono text-rr-cyan">${f.volume_bn_usd}B</td>
                          <td className="py-1.5 text-right font-mono text-rr-muted">{f.volume_share_pct}%</td>
                          <td className={`py-1.5 text-right font-mono ${f.avg_cost_pct > 5 ? 'text-rr-amber' : 'text-rr-green'}`}>
                            {f.avg_cost_pct}%
                          </td>
                          <td className={`py-1.5 text-right font-mono ${
                            f.trend === 'up' ? 'text-rr-green' : f.trend === 'down' ? 'text-rr-amber' : 'text-rr-muted'
                          }`}>
                            {f.trend === 'up' ? '↑' : f.trend === 'down' ? '↓' : '→'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[9px] text-rr-muted mt-2 text-center">
                    {volumeFlow.data_source} · Click row to select corridor
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stats bar */}
          {active && (
            <div className="glass px-4 py-2.5 flex items-center gap-4 shrink-0 overflow-x-auto">
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted uppercase tracking-widest font-mono">Selected</p>
                <p className="font-semibold text-xs" style={{ color: heatColor }}>{active.label}</p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Volume / yr</p>
                <p className="text-rr-text font-mono text-xs font-semibold">${active.volume_bn_usd}B</p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Avg Transfer Cost</p>
                <p className={`font-mono text-xs font-semibold ${active.avg_cost_pct > 5 ? 'text-rr-amber' : active.avg_cost_pct > 4 ? 'text-rr-amber' : 'text-rr-green'}`}>
                  {active.avg_cost_pct}%
                  <span className="text-rr-muted text-[9px] font-normal ml-1">
                    {active.avg_cost_pct > 5 ? 'above G20 target' : active.avg_cost_pct > 4 ? 'near G20 limit' : 'G20 compliant'}
                  </span>
                </p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Formal Channel</p>
                <p className="text-rr-green font-mono text-xs font-semibold">{Math.round(active.formal * 100)}%</p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Informal Channel</p>
                <p className={`font-mono text-xs font-semibold ${active.informal > 0.35 ? 'text-rr-amber' : 'text-rr-muted'}`}>
                  {Math.round(active.informal * 100)}%
                  {active.informal > 0.35 && (
                    <span className="ml-1.5 text-[8px] font-mono px-1 rounded"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                      HAWALA RISK
                    </span>
                  )}
                </p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Top Provider</p>
                <p className="text-rr-indigo font-medium text-xs">{active.primary_provider}</p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Heat Intensity</p>
                <p className="font-mono text-xs font-semibold" style={{ color: heatColor }}>
                  {heatEntry ? `${Math.round(heatEntry.heat_intensity * 100)}%` : 'N/A'}
                </p>
              </div>
              <div className="h-6 w-px bg-rr-border shrink-0" />
              <div className="shrink-0">
                <p className="text-[9px] text-rr-muted">Trend</p>
                <p className={`text-xs font-semibold ${active.trend === 'up' ? 'text-rr-green' : active.trend === 'down' ? 'text-rr-amber' : 'text-rr-muted'}`}>
                  {active.trend === 'up' ? '↑ Growing' : active.trend === 'down' ? '↓ Declining' : '→ Flat'}
                </p>
              </div>
            </div>
          )}
        </main>

        {/* ── RIGHT: Intelligence Sidebar 30% ── */}
        <div style={{ width: '30%' }} className="min-h-0 overflow-hidden flex-none">
          <Sidebar
            corridor={active}
            channel={channel}
            sendAmount={amount}
            onChannelChange={setChannel}
            onSendAmountChange={setAmount}
          />
        </div>

      </div>
    </div>
  )
}