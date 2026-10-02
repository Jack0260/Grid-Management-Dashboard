import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Substation, SensorReading, WeatherStation, WeatherReading, DerResource, PipelineStream, PipelineMetric, Alert } from '@/types';

export function useSubstations() {
  const [data, setData] = useState<Substation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: rows } = await supabase.from('substations').select('*').order('name');
      if (mounted) {
        setData(rows as Substation[] || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { data, loading };
}

export function useSensorReadings(substationId: string | null, hours = 24) {
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!substationId) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    (async () => {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data: rows } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('substation_id', substationId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });
      if (mounted) {
        setData(rows as SensorReading[] || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [substationId, hours]);

  return { data, loading };
}

export function useLatestReadings(substationIds: string[]) {
  const [data, setData] = useState<Record<string, SensorReading>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (substationIds.length === 0) return;
    let mounted = true;
    (async () => {
      const results: Record<string, SensorReading> = {};
      for (const id of substationIds) {
        const { data: rows } = await supabase
          .from('sensor_readings')
          .select('*')
          .eq('substation_id', id)
          .order('timestamp', { ascending: false })
          .limit(1);
        if (rows && rows.length > 0) results[id] = rows[0] as SensorReading;
      }
      if (mounted) {
        setData(results);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [substationIds]);

  return { data, loading };
}

export function useAggregateLoad(hours = 24) {
  const [data, setData] = useState<{ timestamp: string; total_load_mw: number; total_power_mw: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data: rows } = await supabase
        .from('sensor_readings')
        .select('timestamp, power_mw, load_pct')
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });

      if (rows && mounted) {
        const grouped: Record<string, { total_power: number; count: number }> = {};
        for (const r of rows as SensorReading[]) {
          const key = r.timestamp;
          if (!grouped[key]) grouped[key] = { total_power: 0, count: 0 };
          grouped[key].total_power += r.power_mw;
          grouped[key].count += 1;
        }
        const result = Object.entries(grouped)
          .map(([ts, v]) => ({
            timestamp: ts,
            total_load_mw: v.total_power,
            total_power_mw: v.total_power,
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setData(result);
        setLoading(false);
      } else if (mounted) {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [hours]);

  return { data, loading };
}

export function useWeatherStations() {
  const [data, setData] = useState<WeatherStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: rows } = await supabase.from('weather_stations').select('*').order('name');
      if (mounted) {
        setData(rows as WeatherStation[] || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { data, loading };
}

export function useWeatherReadings(stationId: string | null, hours = 24) {
  const [data, setData] = useState<WeatherReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stationId) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    (async () => {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data: rows } = await supabase
        .from('weather_readings')
        .select('*')
        .eq('station_id', stationId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });
      if (mounted) {
        setData(rows as WeatherReading[] || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [stationId, hours]);

  return { data, loading };
}

export function useLatestWeather(stationIds: string[]) {
  const [data, setData] = useState<Record<string, WeatherReading>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stationIds.length === 0) return;
    let mounted = true;
    (async () => {
      const results: Record<string, WeatherReading> = {};
      for (const id of stationIds) {
        const { data: rows } = await supabase
          .from('weather_readings')
          .select('*')
          .eq('station_id', id)
          .order('timestamp', { ascending: false })
          .limit(1);
        if (rows && rows.length > 0) results[id] = rows[0] as WeatherReading;
      }
      if (mounted) {
        setData(results);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [stationIds]);

  return { data, loading };
}

export function useDerResources() {
  const [data, setData] = useState<DerResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data: rows, error: err } = await supabase.from('der_resources').select('*').order('risk_score', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setData(rows as DerResource[] || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function usePipelineStreams() {
  const [data, setData] = useState<PipelineStream[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data: rows } = await supabase.from('pipeline_streams').select('*').order('name');
    setData(rows as PipelineStream[] || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch };
}

export function usePipelineMetrics(streamId: string | null, hours = 24) {
  const [data, setData] = useState<PipelineMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!streamId) { setLoading(false); return; }
    let mounted = true;
    setLoading(true);
    (async () => {
      const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
      const { data: rows } = await supabase
        .from('pipeline_metrics')
        .select('*')
        .eq('stream_id', streamId)
        .gte('timestamp', since)
        .order('timestamp', { ascending: true });
      if (mounted) {
        setData(rows as PipelineMetric[] || []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [streamId, hours]);

  return { data, loading };
}

export function useAlerts() {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data: rows } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(50);
    setData(rows as Alert[] || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch };
}
