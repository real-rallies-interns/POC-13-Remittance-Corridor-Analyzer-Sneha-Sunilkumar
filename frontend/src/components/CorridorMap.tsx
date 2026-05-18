'use client'
/**
 * CorridorMap.tsx
 * Leaflet map with arc corridors, dot markers, rich tooltips.
 * GUARDRAIL: Uses Leaflet projection — no manual SVG/Math coordinates.
 *
 * FIXES:
<<<<<<< HEAD
 *  1. Map destroys on unmount → prevents "already initialized" crash
 *  2. Corridor layers redrawn in separate effect keyed to [corridors, selectedId, heatmapData]
 *  3. Origin markers are clickable
 *  4. React Strict Mode double-invoke fix
 *
 * v4.0 — HEATMAP:
 *  5. Arc colours driven by heat_intensity from heatmapData prop
 *     - Very High (≥0.8) → #F87171 Red
 *     - High     (≥0.6) → #FBBF24 Amber
 *     - Medium   (≥0.4) → #38BDF8 Cyan
 *     - Low      (<0.4) → #818CF8 Indigo
 *  6. Selected corridor always highlights with bright version of its heat colour
 *  7. Unselected corridors show dimmed version of heat colour
=======
 *  1. Map now destroys on unmount → prevents "already initialized" crash on hot-reload
 *  2. Corridor layers redrawn in separate effect keyed to [corridors, selectedId]
 *     → active corridor highlight now updates when user clicks a tab
 *  3. Origin markers are clickable (previously only the polyline was)
 *  4. React Strict Mode double-invoke fix → clears _leaflet_id before re-init
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
 */
import { useEffect, useRef } from 'react'
import type { Corridor } from '@/types'

<<<<<<< HEAD
interface HeatmapEntry {
  corridor_id:   string
  heat_intensity: number
  heat_color:    string
  volume_bn_usd: number
}

interface Props {
  corridors:    Corridor[]
  selectedId:   string
  onSelect:     (id: string) => void
  heatmapData?: HeatmapEntry[]
}

// Get heat colour based on intensity
function getHeatColor(intensity: number): string {
  if (intensity >= 0.8) return '#F87171'  // Red   — very high volume
  if (intensity >= 0.6) return '#FBBF24'  // Amber — high volume
  if (intensity >= 0.4) return '#38BDF8'  // Cyan  — medium volume
  return '#818CF8'                         // Indigo — low volume
}

// Get dimmed version for unselected corridors
function getDimColor(intensity: number): string {
  if (intensity >= 0.8) return '#7F3535'  // Dim red
  if (intensity >= 0.6) return '#7A5E1A'  // Dim amber
  if (intensity >= 0.4) return '#1E5F7A'  // Dim cyan
  return '#3D4070'                         // Dim indigo
}

export default function CorridorMap({ corridors, selectedId, onSelect, heatmapData = [] }: Props) {
=======
interface Props {
  corridors:  Corridor[]
  selectedId: string
  onSelect:   (id: string) => void
}

export default function CorridorMap({ corridors, selectedId, onSelect }: Props) {
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const layersRef    = useRef<any[]>([])

<<<<<<< HEAD
  // ── Initialise map once ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

=======
  // Initialise map once — handles React Strict Mode double-invoke
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    // Clear any stale Leaflet state from previous mount (hot-reload / strict mode)
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
    const container = containerRef.current as any
    if (container._leaflet_id) {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      } else {
        delete container._leaflet_id
      }
    }

    if (mapRef.current) return

    import('leaflet').then(L => {
      if (!containerRef.current) return
      const el = containerRef.current as any
<<<<<<< HEAD
      if (el._leaflet_id) return

=======
      if (el._leaflet_id) return  // strict mode second call — already mounted
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
      const map = L.map(containerRef.current, {
        center: [20, 15], zoom: 2,
        zoomControl: true, attributionControl: false,
        minZoom: 1, maxZoom: 8,
      })
<<<<<<< HEAD

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

=======
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

<<<<<<< HEAD
  // ── Redraw layers when corridors, selectedId, or heatmapData changes ─────
=======
  // Redraw layers whenever corridors or selectedId changes
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
  useEffect(() => {
    if (!mapRef.current || corridors.length === 0) return

    import('leaflet').then(L => {
<<<<<<< HEAD
      // Remove old layers
=======
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
      layersRef.current.forEach(l => l.remove())
      layersRef.current = []

      corridors.forEach(c => {
<<<<<<< HEAD
        const active = c.id === selectedId

        // Get heat data for this corridor
        const heatEntry   = heatmapData.find(h => h.corridor_id === c.id)
        const intensity   = heatEntry?.heat_intensity ?? 0.4
        const heatColor   = getHeatColor(intensity)
        const dimColor    = getDimColor(intensity)

        // Active = bright heat colour, inactive = dimmed heat colour
        const color   = active ? heatColor : dimColor
        const opacity = active ? 1.0 : 0.55
        const weight  = active ? 3.0 : 1.8

        // Draw corridor arc line
        const line = L.polyline(
          [[c.from_lat, c.from_lng], [c.to_lat, c.to_lng]],
          {
            color,
            opacity,
            weight,
            dashArray: active ? undefined : '6 8',
          }
=======
        const active  = c.id === selectedId
        const color   = active ? '#38BDF8' : '#818CF8'
        const opacity = active ? 0.95 : 0.45
        const weight  = active ? 2.5 : 1.5

        const line = L.polyline(
          [[c.from_lat, c.from_lng], [c.to_lat, c.to_lng]],
          { color, opacity, weight, dashArray: active ? undefined : '6 8' }
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
        ).addTo(mapRef.current)
        line.on('click', () => onSelect(c.id))
        layersRef.current.push(line)

<<<<<<< HEAD
        // Build rich tooltip
        const costColor  = c.avg_cost_pct > 5 ? '#F59E0B' : c.avg_cost_pct > 4 ? '#FBBF24' : '#34D399'
        const heatLabel  = intensity >= 0.8 ? 'Very High' : intensity >= 0.6 ? 'High' : intensity >= 0.4 ? 'Medium' : 'Low'

        const tip = `
          <div style="min-width:200px;font-family:'Space Grotesk',sans-serif">
            <b style="color:${heatColor};font-size:12px">${c.from_name} → ${c.to_name}</b>
            <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">
              <span style="color:#64748B">Volume</span>
              <span style="color:#E2E8F0;font-family:monospace">$${c.volume_bn_usd}B/yr</span>
              <span style="color:#64748B">Avg Cost</span>
              <span style="color:${costColor};font-family:monospace">${c.avg_cost_pct}%</span>
              <span style="color:#64748B">Formal</span>
              <span style="color:#34D399;font-family:monospace">${Math.round(c.formal * 100)}%</span>
              <span style="color:#64748B">Informal</span>
              <span style="color:#F59E0B;font-family:monospace">${Math.round(c.informal * 100)}%</span>
              <span style="color:#64748B">Provider</span>
              <span style="color:#818CF8">${c.primary_provider}</span>
              <span style="color:#64748B">Heat Level</span>
              <span style="color:${heatColor};font-family:monospace">${heatLabel}</span>
            </div>
          </div>`

        // Origin marker (larger, clickable)
        const fromMarker = L.marker([c.from_lat, c.from_lng], {
          icon: L.divIcon({
            html: `<div style="
              width:${active ? 14 : 10}px;
              height:${active ? 14 : 10}px;
              border-radius:50%;
              background:${color};
              box-shadow:0 0 ${active ? 12 : 6}px ${color};
              border:2px solid #030712;
              cursor:pointer;
              transition:all 0.2s
            "></div>`,
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
        }).addTo(mapRef.current)
          .bindTooltip(tip, {
            className: 'rr-tooltip',
            direction: 'top',
            offset: [0, -10],
          })

        fromMarker.on('click', () => onSelect(c.id))
        layersRef.current.push(fromMarker)

        // Destination marker (smaller)
        const toMarker = L.marker([c.to_lat, c.to_lng], {
          icon: L.divIcon({
            html: `<div style="
              width:${active ? 9 : 7}px;
              height:${active ? 9 : 7}px;
              border-radius:50%;
              background:${color};
              opacity:${active ? 1 : 0.7};
              border:1.5px solid #030712
            "></div>`,
            className: '',
            iconSize: [9, 9],
            iconAnchor: [4, 4],
          })
        }).addTo(mapRef.current)
        toMarker.on('click', () => onSelect(c.id))
        layersRef.current.push(toMarker)
      })
    })
  }, [corridors, selectedId, onSelect, heatmapData])

  return <div ref={containerRef} className="w-full h-full rounded-lg" />
}
=======
        const tip = `
          <div style="min-width:180px">
            <b style="color:#38BDF8">${c.from_name} → ${c.to_name}</b><br/>
            <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">
              <span style="color:#64748B">Volume</span>  <span style="color:#E2E8F0;font-family:monospace">$${c.volume_bn_usd}B/yr</span>
              <span style="color:#64748B">Avg Cost</span> <span style="color:${c.avg_cost_pct>4?'#F59E0B':'#34D399'};font-family:monospace">${c.avg_cost_pct}%</span>
              <span style="color:#64748B">Formal</span>   <span style="color:#34D399;font-family:monospace">${Math.round(c.formal*100)}%</span>
              <span style="color:#64748B">Provider</span> <span style="color:#818CF8">${c.primary_provider}</span>
            </div>
          </div>`

        const fromMarker = L.marker([c.from_lat, c.from_lng], {
          icon: L.divIcon({
            html: `<div style="width:${active?12:9}px;height:${active?12:9}px;border-radius:50%;background:${color};box-shadow:0 0 ${active?10:5}px ${color};border:2px solid #030712;cursor:pointer"></div>`,
            className: '', iconSize: [12, 12], iconAnchor: [6, 6],
          })
        }).addTo(mapRef.current)
          .bindTooltip(tip, { className: 'rr-tooltip', direction: 'top', offset: [0, -8] })
        fromMarker.on('click', () => onSelect(c.id))
        layersRef.current.push(fromMarker)

        const toMarker = L.marker([c.to_lat, c.to_lng], {
          icon: L.divIcon({
            html: `<div style="width:7px;height:7px;border-radius:50%;background:${color};opacity:0.75;border:1px solid #030712"></div>`,
            className: '', iconSize: [7, 7], iconAnchor: [3, 3],
          })
        }).addTo(mapRef.current)
        layersRef.current.push(toMarker)
      })
    })
  }, [corridors, selectedId, onSelect])

  return <div ref={containerRef} className="w-full h-full rounded-lg" />
}
>>>>>>> e9e8d7d64c44d8596d064f4c839e50640f44b634
