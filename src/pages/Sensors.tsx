import { useState, useMemo } from 'react';
import { Activity, Zap, Gauge as GaugeIcon, Search, ChevronRight } from 'lucide-react';
import { Card, StatusBadge, Skeleton, ProgressBar } from '@/components/ui/Card';
import { LineChart } from '@/components/charts/LineChart';
import { Gauge } from '@/components/charts/Gauge';
import { useSubstations, useSensorReadings, useLatestReadings } from '@/hooks/useData';
import { formatRelative, statusColor } from '@/lib/utils';
import type { Substation, SensorReading } from '@/types';

interface SensorsProps {
  refreshKey: number;
}

export function Sensors({ refreshKey }: SensorsProps) {
  const { data: substations, loading: subLoading } = useSubstations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  void refreshKey;

  const selected = useMemo(() => substations.find((s) => s.id === selectedId) || null, [substations, selectedId]);

  const subIds = substations.map((s) => s.id);
  const { data: latestReadings } = useLatestReadings(subIds);
  const { data: readings, loading: readingsLoading } = useSensorReadings(selectedId, 24);

  const filteredSubs = substations.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.region.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // Auto-select first substation
  if (!selectedId && substations.length > 0) {
    setTimeout(() => setSelectedId(substations[0].id), 0);
  }

  const latestReading = selected ? latestReadings[selected.id] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Substation list */}
        <Card
          className="lg:col-span-1"
          title="Substations"
          subtitle={`${substations.length} monitored`}
          icon={<Activity className="w-4 h-4" />}
        >
          <div className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search substations..."
                className="w-full pl-9 pr-3 py-2 bg-ink-700/40 border border-ink-600/40 rounded-lg text-sm text-ink-50 placeholder-ink-400 focus:outline-none focus:border-primary-500/50 focus:bg-ink-700/60 transition-colors"
              />
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {subLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : (
                filteredSubs.map((sub) => {
                  const reading = latestReadings[sub.id];
                  const isActive = selectedId === sub.id;
                  const colors = statusColor(sub.status);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelect(sub.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                        isActive ? 'bg-primary-500/15 border border-primary-500/30' : 'hover:bg-ink-700/30 border border-transparent'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${colors.dot} ${sub.status === 'critical' || sub.status === 'warning' ? 'animate-pulse' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-primary-200' : 'text-ink-50'}`}>{sub.name}</p>
                        <p className="text-xs text-ink-400">{sub.region} • {sub.voltage_kv} kV</p>
                      </div>
                      {reading && (
                        <span className="text-xs font-mono text-ink-200">{reading.load_pct.toFixed(0)}%</span>
                      )}
                      <ChevronRight className={`w-4 h-4 text-ink-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Sensor detail */}
        <div className="lg:col-span-3 space-y-6">
          {selected ? (
            <>
              {/* Substation header */}
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/15 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-ink-50">{selected.name}</h3>
                        <p className="text-sm text-ink-300">{selected.region} Region • {selected.voltage_kv} kV</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-ink-300">Current Load</p>
                      <p className="text-xl font-bold text-ink-50 font-mono">{selected.current_load_mw.toFixed(1)} MW</p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
              </Card>

              {/* Gauges */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 flex flex-col items-center justify-center">
                  {latestReading ? (
                    <Gauge
                      value={latestReading.load_pct}
                      max={100}
                      label="Load"
                      unit="%"
                      color="#3a72e0"
                      size={130}
                    />
                  ) : (
                    <Skeleton className="h-32 w-32" />
                  )}
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center">
                  {latestReading ? (
                    <Gauge
                      value={latestReading.voltage_kv}
                      min={selected.voltage_kv - 20}
                      max={selected.voltage_kv + 20}
                      label="Voltage"
                      unit="kV"
                      color="#2aaaaa"
                      size={130}
                      warningThreshold={selected.voltage_kv + 10}
                      criticalThreshold={selected.voltage_kv + 15}
                    />
                  ) : (
                    <Skeleton className="h-32 w-32" />
                  )}
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center">
                  {latestReading ? (
                    <Gauge
                      value={latestReading.frequency_hz}
                      min={59.9}
                      max={60.1}
                      label="Frequency"
                      unit="Hz"
                      color="#34b85a"
                      size={130}
                      warningThreshold={60.05}
                      criticalThreshold={60.08}
                    />
                  ) : (
                    <Skeleton className="h-32 w-32" />
                  )}
                </Card>
                <Card className="p-5 flex flex-col items-center justify-center">
                  {latestReading ? (
                    <Gauge
                      value={latestReading.power_factor * 100}
                      max={100}
                      label="Power Factor"
                      unit="%"
                      color="#f9ab30"
                      size={130}
                      warningThreshold={95}
                      criticalThreshold={90}
                    />
                  ) : (
                    <Skeleton className="h-32 w-32" />
                  )}
                </Card>
              </div>

              {/* Charts */}
              <Card
                title="Voltage & Current"
                subtitle="Last 24 hours with operating bands"
                icon={<Activity className="w-4 h-4" />}
              >
                <div className="p-5 space-y-6">
                  {readingsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-ink-200 font-medium">Voltage (kV)</span>
                          <span className="text-xs text-ink-400 font-mono">Nominal: {selected.voltage_kv} kV</span>
                        </div>
                        <LineChart
                          data={readings.map((r) => ({ timestamp: r.timestamp, value: r.voltage_kv }))}
                          height={160}
                          color="#3a72e0"
                          unit=" kV"
                          normalBandHigh={selected.voltage_kv + 5}
                          normalBandLow={selected.voltage_kv - 5}
                          thresholdHigh={selected.voltage_kv + 10}
                          thresholdLow={selected.voltage_kv - 10}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-ink-200 font-medium">Current (A)</span>
                        </div>
                        <LineChart
                          data={readings.map((r) => ({ timestamp: r.timestamp, value: r.current_a }))}
                          height={160}
                          color="#2aaaaa"
                          unit=" A"
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>

              <Card
                title="Frequency & Power"
                subtitle="Grid frequency stability and power flow"
                icon={<GaugeIcon className="w-4 h-4" />}
              >
                <div className="p-5 space-y-6">
                  {readingsLoading ? (
                    <Skeleton className="h-48 w-full" />
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-ink-200 font-medium">Frequency (Hz)</span>
                          <span className="text-xs text-ink-400 font-mono">Nominal: 60.00 Hz</span>
                        </div>
                        <LineChart
                          data={readings.map((r) => ({ timestamp: r.timestamp, value: r.frequency_hz }))}
                          height={160}
                          color="#34b85a"
                          unit=" Hz"
                          normalBandHigh={60.05}
                          normalBandLow={59.95}
                          thresholdHigh={60.1}
                          thresholdLow={59.9}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-ink-200 font-medium">Power Flow (MW)</span>
                        </div>
                        <LineChart
                          data={readings.map((r) => ({ timestamp: r.timestamp, value: r.power_mw }))}
                          height={160}
                          color="#f9ab30"
                          unit=" MW"
                        />
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 flex items-center justify-center">
              <div className="text-center">
                <Activity className="w-12 h-12 text-ink-400 mx-auto mb-3" />
                <p className="text-ink-200">Select a substation to view telemetry</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sensor Health Table */}
      <Card
        title="Sensor Health Matrix"
        subtitle="All monitored assets with latest readings"
        icon={<Activity className="w-4 h-4" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600/40">
                <th className="text-left py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Asset</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider">Load %</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden sm:table-cell">Voltage</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden sm:table-cell">Freq</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden md:table-cell">PF</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden lg:table-cell">Last Update</th>
                <th className="text-right py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600/20">
              {subLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-3 px-5"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : (
                substations.map((sub) => {
                  const reading = latestReadings[sub.id];
                  const colors = statusColor(sub.status);
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-ink-700/20 transition-colors cursor-pointer"
                      onClick={() => handleSelect(sub.id)}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <div>
                            <p className="font-medium text-ink-50">{sub.name}</p>
                            <p className="text-xs text-ink-400">{sub.region}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16">
                            <ProgressBar
                              value={reading?.load_pct || 0}
                              color={(reading?.load_pct || 0) > 95 ? 'bg-error-500' : (reading?.load_pct || 0) > 80 ? 'bg-warning-500' : 'bg-success-500'}
                              height="h-1.5"
                            />
                          </div>
                          <span className="font-mono text-ink-50 text-xs w-10 text-right">{reading ? `${reading.load_pct.toFixed(0)}%` : '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-ink-100">{reading ? `${reading.voltage_kv.toFixed(1)}` : '—'}</span>
                      </td>
                      <td className="py-3 px-3 text-right hidden sm:table-cell">
                        <span className={`font-mono text-xs ${reading && Math.abs(reading.frequency_hz - 60) > 0.05 ? 'text-warning-300' : 'text-ink-100'}`}>
                          {reading ? reading.frequency_hz.toFixed(3) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right hidden md:table-cell">
                        <span className="font-mono text-ink-100">{reading ? reading.power_factor.toFixed(3) : '—'}</span>
                      </td>
                      <td className="py-3 px-3 text-right hidden lg:table-cell">
                        <span className="text-xs text-ink-400 font-mono">{reading ? formatRelative(reading.timestamp) : '—'}</span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <StatusBadge status={reading?.status || sub.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
