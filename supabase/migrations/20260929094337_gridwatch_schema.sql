/*
# GridWatch Schema - Grid Management Dashboard Tables

Creates the full schema for the GridWatch electric utility grid management dashboard.

## New Tables

1. `substations` - Grid substations with location and status
   - id (uuid, PK)
   - name (text) - substation name
   - region (text) - service region
   - lat (numeric) - map latitude
   - lng (numeric) - map longitude
   - status (text) - operational status: operational, warning, critical, offline
   - capacity_mw (numeric) - max capacity in megawatts
   - current_load_mw (numeric) - current load in megawatts
   - voltage_kv (numeric) - operating voltage in kilovolts
   - created_at (timestamptz)

2. `sensor_readings` - Time-series telemetry from substations
   - id (uuid, PK)
   - substation_id (uuid, FK to substations)
   - timestamp (timestamptz)
   - voltage_kv (numeric) - voltage reading
   - current_a (numeric) - current in amps
   - frequency_hz (numeric) - grid frequency
   - power_mw (numeric) - power flow in megawatts
   - load_pct (numeric) - load percentage
   - power_factor (numeric) - power factor (0-1)
   - status (text) - reading status: normal, warning, critical

3. `weather_stations` - Weather monitoring stations
   - id (uuid, PK)
   - name (text)
   - region (text)
   - lat (numeric)
   - lng (numeric)
   - created_at (timestamptz)

4. `weather_readings` - Time-series weather data
   - id (uuid, PK)
   - station_id (uuid, FK to weather_stations)
   - timestamp (timestamptz)
   - temp_c (numeric) - temperature in celsius
   - humidity_pct (numeric) - humidity percentage
   - wind_speed_ms (numeric) - wind speed m/s
   - wind_dir_deg (numeric) - wind direction degrees
   - solar_irradiance_wm2 (numeric) - solar irradiance W/m^2
   - precipitation_mm (numeric) - precipitation in mm

5. `der_resources` - Distributed energy resources
   - id (uuid, PK)
   - name (text)
   - type (text) - solar, wind, battery, demand_response
   - capacity_mw (numeric)
   - current_output_mw (numeric)
   - status (text) - active, pending, curtailed, offline
   - region (text)
   - risk_score (numeric) - 0-100 integration risk score
   - likelihood (numeric) - 1-5 risk likelihood
   - impact (numeric) - 1-5 risk impact
   - approval_status (text) - approved, pending, flagged
   - operator (text) - responsible operator
   - connected_date (timestamptz)
   - created_at (timestamptz)

6. `pipeline_streams` - Data ingestion pipeline streams
   - id (uuid, PK)
   - name (text)
   - source_type (text) - scada, ami, weather, der_telemetry, events
   - status (text) - running, stalled, erroring, stopped
   - records_per_min (numeric)
   - completeness_pct (numeric)
   - accuracy_pct (numeric)
   - error_rate_pct (numeric)
   - latency_ms (numeric)
   - storage_gb (numeric)
   - last_updated (timestamptz)
   - created_at (timestamptz)

7. `pipeline_metrics` - Historical pipeline metrics time-series
   - id (uuid, PK)
   - stream_id (uuid, FK to pipeline_streams)
   - timestamp (timestamptz)
   - completeness_pct (numeric)
   - accuracy_pct (numeric)
   - error_rate_pct (numeric)
   - records_count (numeric)
   - latency_ms (numeric)
   - storage_gb (numeric)

8. `alerts` - Grid alerts and events
   - id (uuid, PK)
   - severity (text) - info, warning, critical
   - title (text)
   - description (text)
   - substation_id (uuid, FK to substations, nullable)
   - acknowledged (boolean, default false)
   - created_at (timestamptz)

## Security
- All tables have RLS enabled.
- This is a single-tenant dashboard with no auth; all tables use TO anon, authenticated with USING (true) / WITH CHECK (true) so the anon-key frontend can read and write freely.
- The data is intentionally shared/public for this control-room dashboard.

## Notes
1. No user_id columns or auth integration - this is an open-access operator dashboard.
2. Sensor readings, weather readings, and pipeline metrics are time-series tables indexed on timestamp.
3. Foreign keys cascade on delete for child time-series tables.
4. Indexes added on all timestamp and foreign key columns for query performance.
*/

-- Substations
CREATE TABLE IF NOT EXISTS substations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'operational',
  capacity_mw numeric NOT NULL DEFAULT 100,
  current_load_mw numeric NOT NULL DEFAULT 0,
  voltage_kv numeric NOT NULL DEFAULT 230,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE substations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_substations" ON substations;
CREATE POLICY "anon_select_substations" ON substations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_substations" ON substations;
CREATE POLICY "anon_insert_substations" ON substations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_substations" ON substations;
CREATE POLICY "anon_update_substations" ON substations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_substations" ON substations;
CREATE POLICY "anon_delete_substations" ON substations FOR DELETE TO anon, authenticated USING (true);

-- Sensor readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substation_id uuid NOT NULL REFERENCES substations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  voltage_kv numeric NOT NULL DEFAULT 230,
  current_a numeric NOT NULL DEFAULT 0,
  frequency_hz numeric NOT NULL DEFAULT 60,
  power_mw numeric NOT NULL DEFAULT 0,
  load_pct numeric NOT NULL DEFAULT 0,
  power_factor numeric NOT NULL DEFAULT 0.95,
  status text NOT NULL DEFAULT 'normal'
);

ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sensor_readings" ON sensor_readings;
CREATE POLICY "anon_select_sensor_readings" ON sensor_readings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sensor_readings" ON sensor_readings;
CREATE POLICY "anon_insert_sensor_readings" ON sensor_readings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sensor_readings" ON sensor_readings;
CREATE POLICY "anon_update_sensor_readings" ON sensor_readings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sensor_readings" ON sensor_readings;
CREATE POLICY "anon_delete_sensor_readings" ON sensor_readings FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_ts ON sensor_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sub ON sensor_readings (substation_id, timestamp DESC);

-- Weather stations
CREATE TABLE IF NOT EXISTS weather_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region text NOT NULL,
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weather_stations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_weather_stations" ON weather_stations;
CREATE POLICY "anon_select_weather_stations" ON weather_stations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_weather_stations" ON weather_stations;
CREATE POLICY "anon_insert_weather_stations" ON weather_stations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_weather_stations" ON weather_stations;
CREATE POLICY "anon_update_weather_stations" ON weather_stations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_weather_stations" ON weather_stations;
CREATE POLICY "anon_delete_weather_stations" ON weather_stations FOR DELETE TO anon, authenticated USING (true);

-- Weather readings
CREATE TABLE IF NOT EXISTS weather_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES weather_stations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  temp_c numeric NOT NULL DEFAULT 20,
  humidity_pct numeric NOT NULL DEFAULT 50,
  wind_speed_ms numeric NOT NULL DEFAULT 0,
  wind_dir_deg numeric NOT NULL DEFAULT 0,
  solar_irradiance_wm2 numeric NOT NULL DEFAULT 0,
  precipitation_mm numeric NOT NULL DEFAULT 0
);

ALTER TABLE weather_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_weather_readings" ON weather_readings;
CREATE POLICY "anon_select_weather_readings" ON weather_readings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_weather_readings" ON weather_readings;
CREATE POLICY "anon_insert_weather_readings" ON weather_readings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_weather_readings" ON weather_readings;
CREATE POLICY "anon_update_weather_readings" ON weather_readings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_weather_readings" ON weather_readings;
CREATE POLICY "anon_delete_weather_readings" ON weather_readings FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_weather_readings_ts ON weather_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weather_readings_station ON weather_readings (station_id, timestamp DESC);

-- DER resources
CREATE TABLE IF NOT EXISTS der_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'solar',
  capacity_mw numeric NOT NULL DEFAULT 50,
  current_output_mw numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  region text NOT NULL DEFAULT 'North',
  risk_score numeric NOT NULL DEFAULT 50,
  likelihood int NOT NULL DEFAULT 3,
  impact int NOT NULL DEFAULT 3,
  approval_status text NOT NULL DEFAULT 'approved',
  operator text NOT NULL DEFAULT 'Unassigned',
  connected_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE der_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_der_resources" ON der_resources;
CREATE POLICY "anon_select_der_resources" ON der_resources FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_der_resources" ON der_resources;
CREATE POLICY "anon_insert_der_resources" ON der_resources FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_der_resources" ON der_resources;
CREATE POLICY "anon_update_der_resources" ON der_resources FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_der_resources" ON der_resources;
CREATE POLICY "anon_delete_der_resources" ON der_resources FOR DELETE TO anon, authenticated USING (true);

-- Pipeline streams
CREATE TABLE IF NOT EXISTS pipeline_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL DEFAULT 'scada',
  status text NOT NULL DEFAULT 'running',
  records_per_min numeric NOT NULL DEFAULT 0,
  completeness_pct numeric NOT NULL DEFAULT 100,
  accuracy_pct numeric NOT NULL DEFAULT 100,
  error_rate_pct numeric NOT NULL DEFAULT 0,
  latency_ms numeric NOT NULL DEFAULT 0,
  storage_gb numeric NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pipeline_streams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pipeline_streams" ON pipeline_streams;
CREATE POLICY "anon_select_pipeline_streams" ON pipeline_streams FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pipeline_streams" ON pipeline_streams;
CREATE POLICY "anon_insert_pipeline_streams" ON pipeline_streams FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pipeline_streams" ON pipeline_streams;
CREATE POLICY "anon_update_pipeline_streams" ON pipeline_streams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pipeline_streams" ON pipeline_streams;
CREATE POLICY "anon_delete_pipeline_streams" ON pipeline_streams FOR DELETE TO anon, authenticated USING (true);

-- Pipeline metrics history
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES pipeline_streams(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  completeness_pct numeric NOT NULL DEFAULT 100,
  accuracy_pct numeric NOT NULL DEFAULT 100,
  error_rate_pct numeric NOT NULL DEFAULT 0,
  records_count numeric NOT NULL DEFAULT 0,
  latency_ms numeric NOT NULL DEFAULT 0,
  storage_gb numeric NOT NULL DEFAULT 0
);

ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_pipeline_metrics" ON pipeline_metrics;
CREATE POLICY "anon_select_pipeline_metrics" ON pipeline_metrics FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_pipeline_metrics" ON pipeline_metrics;
CREATE POLICY "anon_insert_pipeline_metrics" ON pipeline_metrics FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_pipeline_metrics" ON pipeline_metrics;
CREATE POLICY "anon_update_pipeline_metrics" ON pipeline_metrics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_pipeline_metrics" ON pipeline_metrics;
CREATE POLICY "anon_delete_pipeline_metrics" ON pipeline_metrics FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_ts ON pipeline_metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_stream ON pipeline_metrics (stream_id, timestamp DESC);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  description text,
  substation_id uuid REFERENCES substations(id) ON DELETE SET NULL,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts (created_at DESC);