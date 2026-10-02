import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Substation, WeatherStation, PipelineStream } from '@/types';

export function useLiveSimulation(
  substations: Substation[],
  weatherStations: WeatherStation[],
  pipelineStreams: PipelineStream[],
  enabled: boolean = true
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || substations.length === 0) return;

    intervalRef.current = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const loadPattern = 0.6 + 0.3 * Math.sin((hour - 6) * Math.PI / 12);

      // Insert sensor readings
      const sensorRows = substations.map((sub) => {
        const noise = (Math.random() - 0.5) * 0.1;
        const load = Math.min(1.0, Math.max(0.2, loadPattern + noise));
        const voltage = sub.voltage_kv + (Math.random() - 0.5) * 4;
        const freq = 60.0 + (Math.random() - 0.5) * 0.08;
        const status = load > 0.97 ? 'critical' : load > 0.9 ? 'warning' : 'normal';

        return {
          substation_id: sub.id,
          timestamp: now.toISOString(),
          voltage_kv: Math.round(voltage * 100) / 100,
          current_a: Math.round(sub.capacity_mw * load * 4.18 * 100) / 100,
          frequency_hz: Math.round(freq * 1000) / 1000,
          power_mw: Math.round(sub.capacity_mw * load * 100) / 100,
          load_pct: Math.round(load * 1000) / 10,
          power_factor: Math.round((0.92 + Math.random() * 0.07) * 1000) / 1000,
          status,
        };
      });

      await supabase.from('sensor_readings').insert(sensorRows);

      // Update substation current load
      for (const sub of substations) {
        const matching = sensorRows.find((r) => r.substation_id === sub.id);
        if (matching) {
          await supabase
            .from('substations')
            .update({ current_load_mw: matching.power_mw, status: matching.status })
            .eq('id', sub.id);
        }
      }

      // Insert weather readings (less frequent - every other cycle)
      if (Math.random() > 0.5 && weatherStations.length > 0) {
        const weatherRows = weatherStations.map((stn) => {
          const h = now.getHours();
          const solar = h >= 6 && h <= 18
            ? Math.max(0, 800 * Math.sin((h - 6) * Math.PI / 12) + (Math.random() - 0.5) * 100)
            : 0;
          return {
            station_id: stn.id,
            timestamp: now.toISOString(),
            temp_c: Math.round((15 + 10 * Math.sin((h - 6) * Math.PI / 12) + (Math.random() - 0.5) * 3) * 10) / 10,
            humidity_pct: Math.round((40 + 30 * Math.random()) * 10) / 10,
            wind_speed_ms: Math.round((3 + 5 * Math.random()) * 10) / 10,
            wind_dir_deg: Math.round(Math.random() * 360),
            solar_irradiance_wm2: Math.round(solar),
            precipitation_mm: Math.random() < 0.15 ? Math.round(Math.random() * 50) / 10 : 0,
          };
        });
        await supabase.from('weather_readings').insert(weatherRows);
      }

      // Update pipeline streams and insert metrics
      if (pipelineStreams.length > 0) {
        const metricRows = pipelineStreams.map((stream) => {
          const completeness = Math.min(100, Math.max(0, stream.completeness_pct + (Math.random() - 0.5) * 2));
          const accuracy = Math.min(100, Math.max(0, stream.accuracy_pct + (Math.random() - 0.5) * 2));
          const errorRate = Math.max(0, stream.error_rate_pct + (Math.random() - 0.5) * 1);
          const latency = Math.max(0, stream.latency_ms + (Math.random() - 0.5) * 30);
          const records = stream.records_per_min * 60 * (0.8 + 0.4 * Math.random());

          return {
            stream_id: stream.id,
            timestamp: now.toISOString(),
            completeness_pct: Math.round(completeness * 10) / 10,
            accuracy_pct: Math.round(accuracy * 10) / 10,
            error_rate_pct: Math.round(errorRate * 100) / 100,
            records_count: Math.round(records),
            latency_ms: Math.round(latency),
            storage_gb: Math.round((stream.storage_gb + Math.random() * 0.5) * 10) / 10,
          };
        });

        await supabase.from('pipeline_metrics').insert(metricRows);

        // Update stream last_updated and storage
        for (const stream of pipelineStreams) {
          const metric = metricRows.find((m) => m.stream_id === stream.id);
          if (metric) {
            await supabase
              .from('pipeline_streams')
              .update({
                completeness_pct: metric.completeness_pct,
                accuracy_pct: metric.accuracy_pct,
                error_rate_pct: metric.error_rate_pct,
                latency_ms: metric.latency_ms,
                storage_gb: metric.storage_gb,
                last_updated: now.toISOString(),
              })
              .eq('id', stream.id);
          }
        }
      }

      // Occasionally insert a new alert
      if (Math.random() < 0.15) {
        const alertTypes = [
          { title: 'Voltage deviation detected', desc: 'Voltage reading outside nominal band for 5+ minutes', severity: 'warning' },
          { title: 'Load threshold exceeded', desc: 'Substation load exceeds 90% of rated capacity', severity: 'warning' },
          { title: 'Frequency oscillation warning', desc: 'Grid frequency deviation beyond 0.05 Hz tolerance', severity: 'warning' },
          { title: 'Communication signal degraded', desc: 'SCADA communication timeout on primary channel', severity: 'info' },
          { title: 'Transformer temperature rise', desc: 'Transformer oil temperature above alarm threshold', severity: 'critical' },
        ];
        const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const sub = substations[Math.floor(Math.random() * substations.length)];
        await supabase.from('alerts').insert({
          severity: alert.severity,
          title: alert.title,
          description: alert.desc,
          substation_id: sub.id,
          acknowledged: false,
        });
      }
    }, 15000); // Every 15 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [substations, weatherStations, pipelineStreams, enabled]);
}
