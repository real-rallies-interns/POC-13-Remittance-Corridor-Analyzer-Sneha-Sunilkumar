'use client'
/**
 * CorridorMap.tsx
 * Leaflet map with arc corridors, dot markers, rich tooltips.
 * GUARDRAIL: Uses Leaflet projection — no manual SVG/Math coordinates.
 *
 * FIXES:
 *  1. Map now destroys on unmount → prevents "already initialized" crash on hot-reload
 *  2. Corridor layers redrawn in separate effect keyed to [corridors, selectedId]
 *     → active corridor highlight now updates when user clicks a tab
 *  3. Origin markers are clickable (previously only the polyline was)
 *  4. React Strict Mode double-invoke fix → clears _leaflet_id before re-init
 */
import { useEffect, useRef } from 'react'
import type { Corridor } from '@/types'

interface Props {
  corridors:  Corridor[]
  selectedId: string
  onSelect:   (id: string) => void
}

export default function CorridorMap({ corridors, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const layersRef    = useRef<any[]>([])

  // Initialise map once — handles React Strict Mode double-invoke
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    // Clear any stale Leaflet state from previous mount (hot-reload / strict mode)
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
      if (el._leaflet_id) return  // strict mode second call — already mounted
      const map = L.map(containerRef.current, {
        center: [20, 15], zoom: 2,
        zoomControl: true, attributionControl: false,
        minZoom: 1, maxZoom: 8,
      })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Redraw layers whenever corridors or selectedId changes
  useEffect(() => {
    if (!mapRef.current || corridors.length === 0) return

    import('leaflet').then(L => {
      layersRef.current.forEach(l => l.remove())
      layersRef.current = []

      corridors.forEach(c => {
        const active  = c.id === selectedId
        const color   = active ? '#38BDF8' : '#818CF8'
        const opacity = active ? 0.95 : 0.45
        const weight  = active ? 2.5 : 1.5

        const line = L.polyline(
          [[c.from_lat, c.from_lng], [c.to_lat, c.to_lng]],
          { color, opacity, weight, dashArray: active ? undefined : '6 8' }
        ).addTo(mapRef.current)
        line.on('click', () => onSelect(c.id))
        layersRef.current.push(line)

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
