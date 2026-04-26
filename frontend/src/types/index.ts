export interface Corridor {
  id: string
  label: string
  from_name: string
  from_lat: number
  from_lng: number
  to_name: string
  to_lat: number
  to_lng: number
  volume_bn_usd: number
  avg_cost_pct: number
  trend: 'up' | 'down' | 'flat'
  primary_provider: string
  formal: number
  informal: number
}

export interface Provider {
  id: string
  name: string
  type: string
  fee_pct: number
  fee_flat: number
  speed_hrs: number
  rating: number
  fee_usd?: number
  net_received?: number
  vs_avg_pct?: number
  vs_avg_label?: string
}

export interface TimelineRow {
  year_month: string
  label: string
  channel: 'formal' | 'informal'
  volume_usd: number
  tx_count: number
  avg_tx_usd: number
}

export interface ChannelRow {
  corridor_id: string
  corridor_label: string
  formal_bn: number
  informal_bn: number
  formal_pct: number
  informal_pct: number
  hawala_risk: 'HIGH' | 'MEDIUM' | 'LOW'
  g20_compliant: boolean
}

export interface Regulator {
  region: string
  body: string
  role: string
  color: string
}

export interface GovernanceData {
  regulators: Regulator[]
  swift_coverage_pct: number
  avg_settlement_days: number
}
