export interface Substation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  status: 'operational' | 'warning' | 'critical' | 'offline';
  capacity_mw: number;
  current_load_mw: number;
  voltage_kv: number;
  created_at: string;
}

export interface SensorReading {
  id: string;
  substation_id: string;
  timestamp: string;
  voltage_kv: number;
  current_a: number;
  frequency_hz: number;
  power_mw: number;
  load_pct: number;
  power_factor: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface WeatherStation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface WeatherReading {
  id: string;
  station_id: string;
  timestamp: string;
  temp_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  wind_dir_deg: number;
  solar_irradiance_wm2: number;
  precipitation_mm: number;
}

export interface DerResource {
  id: string;
  name: string;
  type: 'solar' | 'wind' | 'battery' | 'demand_response';
  capacity_mw: number;
  current_output_mw: number;
  status: 'active' | 'pending' | 'curtailed' | 'offline';
  region: string;
  risk_score: number;
  likelihood: number;
  impact: number;
  approval_status: 'approved' | 'pending' | 'flagged';
  operator: string;
  connected_date: string | null;
  created_at: string;
}

export interface PipelineStream {
  id: string;
  name: string;
  source_type: 'scada' | 'ami' | 'weather' | 'der_telemetry' | 'events';
  status: 'running' | 'stalled' | 'erroring' | 'stopped';
  records_per_min: number;
  completeness_pct: number;
  accuracy_pct: number;
  error_rate_pct: number;
  latency_ms: number;
  storage_gb: number;
  last_updated: string;
  created_at: string;
}

export interface PipelineMetric {
  id: string;
  stream_id: string;
  timestamp: string;
  completeness_pct: number;
  accuracy_pct: number;
  error_rate_pct: number;
  records_count: number;
  latency_ms: number;
  storage_gb: number;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  substation_id: string | null;
  acknowledged: boolean;
  created_at: string;
}

export interface SubstationWithLatest extends Substation {
  latest_reading?: SensorReading;
}

export type PageId = 'overview' | 'sensors' | 'weather' | 'risk' | 'pipeline';
