import { useState, useMemo } from 'react';
import { Cloud, Sun, Wind, Droplets, Thermometer, Compass, Search, ChevronRight } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui/Card';
import { LineChart } from '@/components/charts/LineChart';
import { MultiSeriesChart } from '@/components/charts/MultiSeriesChart';
import { useWeatherStations, useWeatherReadings, useLatestWeather, useDerResources } from '@/hooks/useData';

interface WeatherProps {
  refreshKey: number;
}

export function Weather({ refreshKey }: WeatherProps) {
  const { data: stations, loading: stationsLoading } = useWeatherStations();
  const { data: ders } = useDerResources();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  void refreshKey;

  const stationIds = stations.map((s) => s.id);
  const { data: latestWeather } = useLatestWeather(stationIds);
  const { data: readings, loading: readingsLoading } = useWeatherReadings(selectedId, 24);

  const selected = useMemo(() => stations.find((s) => s.id === selectedId) || null, [stations, selectedId]);

  if (!selectedId && stations.length > 0) {
    setTimeout(() => setSelectedId(stations[0].id), 0);
  }

  const filteredStations = stations.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.region.toLowerCase().includes(search.toLowerCase())
  );

  // For correlation chart: aggregate solar/wind output vs irradiance/wind speed
  const solarDers = ders.filter((d) => d.type === 'solar' && d.status === 'active');
  const windDers = ders.filter((d) => d.type === 'wind' && d.status === 'active');
  const totalSolarOutput = solarDers.reduce((s, d) => s + d.current_output_mw, 0);
  const totalWindOutput = windDers.reduce((s, d) => s + d.current_output_mw, 0);

  const correlationData = useMemo(() => {
    if (!readings.length) return [];
    return readings.map((r) => ({
      timestamp: r.timestamp,
      solar_irradiance: r.solar_irradiance_wm2,
      wind_speed: r.wind_speed_ms,
      temp: r.temp_c,
    }));
  }, [readings]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Weather station cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stationsLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          stations.map((stn) => {
            const w = latestWeather[stn.id];
            const isDay = w ? w.solar_irradiance_wm2 > 10 : true;
            return (
              <button
                key={stn.id}
                onClick={() => setSelectedId(stn.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selectedId === stn.id
                    ? 'bg-secondary-500/10 border-secondary-500/40 shadow-lg shadow-secondary-500/10'
                    : 'bg-ink-800/80 border-ink-600/50 hover:border-ink-500/60 hover:bg-ink-700/40'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-50">{stn.name}</p>
                    <p className="text-xs text-ink-400">{stn.region}</p>
                  </div>
                  {isDay ? (
                    <Sun className="w-6 h-6 text-accent-300" />
                  ) : (
                    <Cloud className="w-6 h-6 text-primary-300" />
                  )}
                </div>
                {w ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Thermometer className="w-3.5 h-3.5 text-error-300" />
                      <span className="text-ink-50 font-mono">{w.temp_c.toFixed(1)}°C</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Wind className="w-3.5 h-3.5 text-secondary-300" />
                      <span className="text-ink-100 font-mono">{w.wind_speed_ms.toFixed(1)} m/s</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Sun className="w-3.5 h-3.5 text-accent-300" />
                      <span className="text-ink-100 font-mono">{w.solar_irradiance_wm2.toFixed(0)} W/m²</span>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-16 w-full" />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Station list */}
        <Card
          className="lg:col-span-1"
          title="Weather Stations"
          subtitle={`${stations.length} active`}
          icon={<Cloud className="w-4 h-4" />}
        >
          <div className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stations..."
                className="w-full pl-9 pr-3 py-2 bg-ink-700/40 border border-ink-600/40 rounded-lg text-sm text-ink-50 placeholder-ink-400 focus:outline-none focus:border-secondary-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {filteredStations.map((stn) => {
                const w = latestWeather[stn.id];
                const isActive = selectedId === stn.id;
                return (
                  <button
                    key={stn.id}
                    onClick={() => setSelectedId(stn.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                      isActive ? 'bg-secondary-500/15 border border-secondary-500/30' : 'hover:bg-ink-700/30 border border-transparent'
                    }`}
                  >
                    <Cloud className={`w-4 h-4 shrink-0 ${isActive ? 'text-secondary-300' : 'text-ink-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-secondary-200' : 'text-ink-50'}`}>{stn.name}</p>
                      <p className="text-xs text-ink-400">{w ? `${w.temp_c.toFixed(0)}°C • ${w.wind_speed_ms.toFixed(1)} m/s` : '—'}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-ink-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Weather detail */}
        <div className="lg:col-span-3 space-y-6">
          {selected ? (
            <>
              {/* Current conditions */}
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-secondary-500/15 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-secondary-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink-50">{selected.name}</h3>
                    <p className="text-sm text-ink-300">{selected.region} Region</p>
                  </div>
                </div>
                {latestWeather[selected.id] ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <WeatherStat icon={<Thermometer className="w-4 h-4" />} label="Temperature" value={`${latestWeather[selected.id].temp_c.toFixed(1)}°C`} color="text-error-300" />
                    <WeatherStat icon={<Droplets className="w-4 h-4" />} label="Humidity" value={`${latestWeather[selected.id].humidity_pct.toFixed(0)}%`} color="text-primary-300" />
                    <WeatherStat icon={<Wind className="w-4 h-4" />} label="Wind Speed" value={`${latestWeather[selected.id].wind_speed_ms.toFixed(1)} m/s`} color="text-secondary-300" />
                    <WeatherStat icon={<Compass className="w-4 h-4" />} label="Wind Dir" value={`${latestWeather[selected.id].wind_dir_deg.toFixed(0)}°`} color="text-ink-100" />
                    <WeatherStat icon={<Sun className="w-4 h-4" />} label="Solar Irradiance" value={`${latestWeather[selected.id].solar_irradiance_wm2.toFixed(0)} W/m²`} color="text-accent-300" />
                    <WeatherStat icon={<Droplets className="w-4 h-4" />} label="Precipitation" value={`${latestWeather[selected.id].precipitation_mm.toFixed(1)} mm`} color="text-primary-200" />
                  </div>
                ) : (
                  <Skeleton className="h-24 w-full" />
                )}
              </Card>

              {/* Time series charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Solar Irradiance" subtitle="Last 24 hours" icon={<Sun className="w-4 h-4 text-accent-300" />}>
                  <div className="p-5">
                    {readingsLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : (
                      <LineChart
                        data={readings.map((r) => ({ timestamp: r.timestamp, value: r.solar_irradiance_wm2 }))}
                        height={200}
                        color="#f9ab30"
                        unit=" W/m²"
                      />
                    )}
                  </div>
                </Card>

                <Card title="Wind Speed" subtitle="Last 24 hours" icon={<Wind className="w-4 h-4 text-secondary-300" />}>
                  <div className="p-5">
                    {readingsLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : (
                      <LineChart
                        data={readings.map((r) => ({ timestamp: r.timestamp, value: r.wind_speed_ms }))}
                        height={200}
                        color="#2aaaaa"
                        unit=" m/s"
                      />
                    )}
                  </div>
                </Card>
              </div>

              {/* Temperature & Humidity */}
              <Card title="Temperature & Humidity" subtitle="Last 24 hours" icon={<Thermometer className="w-4 h-4" />}>
                <div className="p-5">
                  {readingsLoading ? (
                    <Skeleton className="h-56 w-full" />
                  ) : (
                    <MultiSeriesChart
                      series={[
                        { label: 'Temperature (°C)', data: readings.map((r) => r.temp_c), color: '#ef5542' },
                        { label: 'Humidity (%)', data: readings.map((r) => r.humidity_pct), color: '#3a72e0' },
                      ]}
                      labels={readings.map((r) => {
                        const d = new Date(r.timestamp);
                        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      })}
                      height={220}
                    />
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 flex items-center justify-center">
              <div className="text-center">
                <Cloud className="w-12 h-12 text-ink-400 mx-auto mb-3" />
                <p className="text-ink-200">Select a weather station to view data</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Renewable correlation */}
      <Card
        title="Renewable Energy Correlation"
        subtitle="Weather conditions vs. renewable generation output"
        icon={<Sun className="w-4 h-4" />}
      >
        <div className="p-5">
          {readingsLoading || correlationData.length === 0 ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <>
              <MultiSeriesChart
                series={[
                  { label: 'Solar Irradiance (W/m²)', data: correlationData.map((d) => d.solar_irradiance), color: '#f9ab30' },
                  { label: 'Wind Speed (m/s × 100)', data: correlationData.map((d) => d.wind_speed * 100), color: '#2aaaaa' },
                ]}
                labels={correlationData.map((d) => {
                  const dt = new Date(d.timestamp);
                  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                })}
                height={240}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-ink-600/30">
                <div className="flex items-center gap-3 p-3 bg-accent-500/5 rounded-lg border border-accent-500/20">
                  <Sun className="w-8 h-8 text-accent-300" />
                  <div>
                    <p className="text-xs text-ink-300">Solar Generation (Active)</p>
                    <p className="text-lg font-bold text-ink-50 font-mono">{totalSolarOutput.toFixed(1)} MW</p>
                    <p className="text-xs text-ink-400">{solarDers.length} arrays online</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary-500/5 rounded-lg border border-secondary-500/20">
                  <Wind className="w-8 h-8 text-secondary-300" />
                  <div>
                    <p className="text-xs text-ink-300">Wind Generation (Active)</p>
                    <p className="text-lg font-bold text-ink-50 font-mono">{totalWindOutput.toFixed(1)} MW</p>
                    <p className="text-xs text-ink-400">{windDers.length} farms online</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function WeatherStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-ink-700/50 flex items-center justify-center shrink-0">
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-ink-300">{label}</p>
        <p className="text-sm font-mono font-semibold text-ink-50">{value}</p>
      </div>
    </div>
  );
}
