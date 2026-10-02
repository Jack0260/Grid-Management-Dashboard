import { Zap, TrendingUp, Wind, AlertTriangle, MapPin, Activity, Gauge as GaugeIcon } from 'lucide-react';
import { Card, StatusBadge, ProgressBar, Skeleton } from '@/components/ui/Card';
import { LineChart } from '@/components/charts/LineChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { useSubstations, useAggregateLoad, useAlerts, useDerResources, useLatestReadings } from '@/hooks/useData';
import { formatRelative, statusColor } from '@/lib/utils';
import type { Substation, SensorReading } from '@/types';

interface OverviewProps {
  onNavigate: (page: 'overview' | 'sensors' | 'weather' | 'risk' | 'pipeline') => void;
  refreshKey: number;
}

export function Overview({ onNavigate, refreshKey }: OverviewProps) {
  const { data: substations, loading: subLoading } = useSubstations();
  const { data: loadData, loading: loadLoading } = useAggregateLoad(24);
  const { data: alerts, loading: alertsLoading } = useAlerts();
  const { data: ders, loading: dersLoading } = useDerResources();
  const subIds = substations.map((s) => s.id);
  const { data: latestReadings, loading: readingsLoading } = useLatestReadings(subIds);

  // Force re-render when refreshKey changes
  void refreshKey;

  const totalCapacity = substations.reduce((sum, s) => sum + s.capacity_mw, 0);
  const totalLoad = substations.reduce((sum, s) => sum + s.current_load_mw, 0);
  const loadPct = totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0;

  const allReadings = Object.values(latestReadings);
  const avgFreq = allReadings.length > 0 ? allReadings.reduce((s, r) => s + r.frequency_hz, 0) / allReadings.length : 60;

  const renewableOutput = ders.filter((d) => d.status === 'active').reduce((s, d) => s + d.current_output_mw, 0);
  const renewablePct = totalLoad > 0 ? (renewableOutput / totalLoad) * 100 : 0;

  const unackAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalAlerts = unackAlerts.filter((a) => a.severity === 'critical');

  const loadSparkline = loadData.slice(-20).map((d) => d.total_load_mw);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total System Load */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-300" />
              </div>
              <span className="text-sm text-ink-200">System Load</span>
            </div>
          </div>
          {subLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink-50 font-mono tabular-nums">{totalLoad.toFixed(1)}</span>
                <span className="text-sm text-ink-300">MW</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-ink-300" />
                <span className="text-xs text-ink-300">{loadPct.toFixed(1)}% of {totalCapacity} MW capacity</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={loadPct} color={loadPct > 90 ? 'bg-error-500' : loadPct > 75 ? 'bg-warning-500' : 'bg-primary-500'} />
              </div>
              {loadSparkline.length > 1 && (
                <div className="mt-2">
                  <Sparkline data={loadSparkline} width={240} height={32} color="#3a72e0" />
                </div>
              )}
            </>
          )}
        </Card>

        {/* Grid Frequency */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-secondary-500/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-secondary-300" />
              </div>
              <span className="text-sm text-ink-200">Grid Frequency</span>
            </div>
          </div>
          {readingsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink-50 font-mono tabular-nums">{avgFreq.toFixed(3)}</span>
                <span className="text-sm text-ink-300">Hz</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-medium ${Math.abs(avgFreq - 60) < 0.05 ? 'text-success-300' : 'text-warning-300'}`}>
                  {Math.abs(avgFreq - 60) < 0.05 ? 'Within nominal band' : 'Deviation detected'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-1">
                {[...Array(20)].map((_, i) => {
                  const deviation = Math.abs(avgFreq - 60);
                  const active = i < 20 - deviation * 200;
                  return (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${active ? 'bg-secondary-400' : 'bg-ink-700'}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-ink-400 font-mono">
                <span>59.95</span>
                <span>60.00 Hz</span>
                <span>60.05</span>
              </div>
            </>
          )}
        </Card>

        {/* Renewable Contribution */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-success-500/15 flex items-center justify-center">
                <Wind className="w-5 h-5 text-success-300" />
              </div>
              <span className="text-sm text-ink-200">Renewable Output</span>
            </div>
          </div>
          {dersLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink-50 font-mono tabular-nums">{renewableOutput.toFixed(1)}</span>
                <span className="text-sm text-ink-300">MW</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-ink-300">{renewablePct.toFixed(1)}% of total load from renewables</span>
              </div>
              <div className="mt-3">
                <ProgressBar value={renewablePct} color="bg-success-500" />
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                <span className="flex items-center gap-1 text-success-300">
                  <span className="w-2 h-2 rounded-full bg-success-400" />
                  {ders.filter((d) => d.type === 'solar' && d.status === 'active').length} Solar
                </span>
                <span className="flex items-center gap-1 text-secondary-300">
                  <span className="w-2 h-2 rounded-full bg-secondary-400" />
                  {ders.filter((d) => d.type === 'wind' && d.status === 'active').length} Wind
                </span>
                <span className="flex items-center gap-1 text-accent-300">
                  <span className="w-2 h-2 rounded-full bg-accent-400" />
                  {ders.filter((d) => d.type === 'battery' && d.status === 'active').length} Battery
                </span>
              </div>
            </>
          )}
        </Card>

        {/* Active Alerts */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${criticalAlerts.length > 0 ? 'bg-error-500/15' : 'bg-warning-500/15'}`}>
                <AlertTriangle className={`w-5 h-5 ${criticalAlerts.length > 0 ? 'text-error-300' : 'text-warning-300'}`} />
              </div>
              <span className="text-sm text-ink-200">Active Alerts</span>
            </div>
          </div>
          {alertsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink-50 font-mono tabular-nums">{unackAlerts.length}</span>
                <span className="text-sm text-ink-300">unacknowledged</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-error-400 animate-pulse" />
                  <span className="text-xs text-error-300">{criticalAlerts.length} critical</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning-400" />
                  <span className="text-xs text-warning-300">{unackAlerts.filter((a) => a.severity === 'warning').length} warning</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary-400" />
                  <span className="text-xs text-primary-300">{unackAlerts.filter((a) => a.severity === 'info').length} info</span>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Load Chart + Grid Map */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Real-time load chart */}
        <Card
          className="xl:col-span-2"
          title="Real-Time System Load"
          subtitle="Aggregate power demand across all substations (last 24h)"
          icon={<TrendingUp className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-400 animate-pulse" />
              <span className="text-xs text-ink-300">Live</span>
            </div>
          }
        >
          <div className="p-5">
            {loadLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <LineChart
                data={loadData.map((d) => ({ timestamp: d.timestamp, value: d.total_load_mw }))}
                height={240}
                color="#3a72e0"
                unit=" MW"
              />
            )}
          </div>
        </Card>

        {/* Grid Map */}
        <Card
          title="Grid Status Map"
          subtitle="Substation locations and status"
          icon={<MapPin className="w-4 h-4" />}
        >
          <div className="p-5">
            <GridMap substations={substations} loading={subLoading} onSubstationClick={() => onNavigate('sensors')} />
          </div>
        </Card>
      </div>

      {/* Substation Health + Alerts Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Substation health table */}
        <Card
          className="xl:col-span-2"
          title="Substation Health"
          subtitle="Real-time status of all monitored substations"
          icon={<GaugeIcon className="w-4 h-4" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-600/40">
                  <th className="text-left py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Substation</th>
                  <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider">Load</th>
                  <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden sm:table-cell">Voltage</th>
                  <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden md:table-cell">Frequency</th>
                  <th className="text-right py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-600/20">
                {subLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="py-3 px-5"><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))
                ) : (
                  substations.map((sub) => {
                    const reading = latestReadings[sub.id];
                    const colors = statusColor(sub.status);
                    return (
                      <tr key={sub.id} className="hover:bg-ink-700/20 transition-colors cursor-pointer" onClick={() => onNavigate('sensors')}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${colors.dot} ${sub.status === 'critical' || sub.status === 'warning' ? 'animate-pulse' : ''}`} />
                            <div>
                              <p className="font-medium text-ink-50">{sub.name}</p>
                              <p className="text-xs text-ink-400">{sub.region}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono text-ink-50">{sub.current_load_mw.toFixed(1)}</span>
                          <span className="text-xs text-ink-400"> / {sub.capacity_mw}</span>
                        </td>
                        <td className="py-3 px-3 text-right hidden sm:table-cell">
                          <span className="font-mono text-ink-100">{reading ? `${reading.voltage_kv.toFixed(1)} kV` : '—'}</span>
                        </td>
                        <td className="py-3 px-3 text-right hidden md:table-cell">
                          <span className={`font-mono ${reading && Math.abs(reading.frequency_hz - 60) > 0.05 ? 'text-warning-300' : 'text-ink-100'}`}>
                            {reading ? `${reading.frequency_hz.toFixed(3)} Hz` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <StatusBadge status={sub.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Alerts Feed */}
        <Card
          title="Recent Alerts"
          subtitle="Latest grid events"
          icon={<AlertTriangle className="w-4 h-4" />}
        >
          <div className="max-h-96 overflow-y-auto divide-y divide-ink-600/20">
            {alertsLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="px-5 py-3"><Skeleton className="h-12 w-full" /></div>)
            ) : alerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-300">No alerts</div>
            ) : (
              alerts.slice(0, 12).map((alert) => (
                <div key={alert.id} className="px-5 py-3 hover:bg-ink-700/20 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.severity === 'critical' ? 'bg-error-400' : alert.severity === 'warning' ? 'bg-warning-400' : 'bg-primary-400'
                    } ${!alert.acknowledged ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-50 truncate">{alert.title}</p>
                      <p className="text-xs text-ink-300 mt-0.5 line-clamp-1">{alert.description}</p>
                      <span className="text-[10px] text-ink-400 font-mono mt-1 block">{formatRelative(alert.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function GridMap({ substations, loading, onSubstationClick }: { substations: Substation[]; loading: boolean; onSubstationClick: () => void }) {
  if (loading || substations.length === 0) {
    return <Skeleton className="h-64 w-full" />;
  }

  const lats = substations.map((s) => s.lat);
  const lngs = substations.map((s) => s.lng);
  const minLat = Math.min(...lats) - 0.02;
  const maxLat = Math.max(...lats) + 0.02;
  const minLng = Math.min(...lngs) - 0.02;
  const maxLng = Math.max(...lngs) + 0.02;

  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 300 + 20;
    const y = 280 - ((lat - minLat) / (maxLat - minLat)) * 240 + 10;
    return { x, y };
  };

  const statusColors: Record<string, string> = {
    operational: '#34b85a',
    warning: '#f9ab30',
    critical: '#ef5542',
    offline: '#6b7589',
  };

  return (
    <div className="relative">
      <svg viewBox="0 0 340 300" className="w-full">
        {/* Grid background */}
        {[...Array(12)].map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 25} x2="340" y2={i * 25} stroke="#161c28" strokeWidth="0.5" />
        ))}
        {[...Array(14)].map((_, i) => (
          <line key={`v-${i}`} x1={i * 25} y1="0" x2={i * 25} y2="300" stroke="#161c28" strokeWidth="0.5" />
        ))}

        {/* Connection lines between substations */}
        {substations.map((sub, i) => {
          if (i === substations.length - 1) return null;
          const p1 = project(sub.lat, sub.lng);
          const p2 = project(substations[i + 1].lat, substations[i + 1].lng);
          return (
            <line
              key={`line-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="#222a3a"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Substation dots */}
        {substations.map((sub) => {
          const { x, y } = project(sub.lat, sub.lng);
          const color = statusColors[sub.status] || '#6b7589';
          const r = 5 + (sub.current_load_mw / sub.capacity_mw) * 3;
          return (
            <g key={sub.id} className="cursor-pointer" onClick={onSubstationClick}>
              {(sub.status === 'critical' || sub.status === 'warning') && (
                <circle cx={x} cy={y} r={r + 6} fill={color} fillOpacity="0.15">
                  <animate attributeName="r" values={`${r};${r + 10};${r}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r={r} fill={color} fillOpacity="0.8" stroke={color} strokeWidth="1.5" />
              <circle cx={x} cy={y} r={r - 2} fill="#070a10" />
              <circle cx={x} cy={y} r="2" fill={color} />
              <text x={x} y={y - r - 4} fill="#9aa2b3" fontSize="9" textAnchor="middle" fontWeight="500">
                {sub.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1.5 text-ink-300"><span className="w-2 h-2 rounded-full bg-success-400" /> Operational</span>
        <span className="flex items-center gap-1.5 text-ink-300"><span className="w-2 h-2 rounded-full bg-warning-400" /> Warning</span>
        <span className="flex items-center gap-1.5 text-ink-300"><span className="w-2 h-2 rounded-full bg-error-400" /> Critical</span>
      </div>
    </div>
  );
}
