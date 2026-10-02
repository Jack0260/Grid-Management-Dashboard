import { useState, useMemo } from 'react';
import { Database, Activity, HardDrive, Clock, AlertCircle, CheckCircle, Server, Zap } from 'lucide-react';
import { Card, StatusBadge, Skeleton, ProgressBar } from '@/components/ui/Card';
import { LineChart } from '@/components/charts/LineChart';
import { usePipelineStreams, usePipelineMetrics } from '@/hooks/useData';
import { formatGigabytes, formatNumber, formatRelative } from '@/lib/utils';
import type { PipelineStream } from '@/types';

interface PipelineProps {
  refreshKey: number;
}

const sourceIcons: Record<string, typeof Database> = {
  scada: Zap,
  ami: Activity,
  weather: Server,
  der_telemetry: Database,
  events: AlertCircle,
};

const sourceColors: Record<string, string> = {
  scada: '#3a72e0',
  ami: '#2aaaaa',
  weather: '#34b85a',
  der_telemetry: '#f9ab30',
  events: '#ef5542',
};

export function Pipeline({ refreshKey }: PipelineProps) {
  const { data: streams, loading } = usePipelineStreams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: metrics, loading: metricsLoading } = usePipelineMetrics(selectedId, 24);

  void refreshKey;

  const selected = useMemo(() => streams.find((s) => s.id === selectedId) || null, [streams, selectedId]);

  if (!selectedId && streams.length > 0) {
    setTimeout(() => setSelectedId(streams[0].id), 0);
  }

  const totalStorage = streams.reduce((s, st) => s + st.storage_gb, 0);
  const totalRecords = streams.reduce((s, st) => s + st.records_per_min, 0);
  const avgCompleteness = streams.length > 0 ? streams.reduce((s, st) => s + st.completeness_pct, 0) / streams.length : 0;
  const avgLatency = streams.length > 0 ? streams.reduce((s, st) => s + st.latency_ms, 0) / streams.length : 0;
  const erroringStreams = streams.filter((s) => s.status === 'erroring' || s.status === 'stalled');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-primary-300" />
            <span className="text-xs text-ink-300">Total Storage</span>
          </div>
          <p className="text-2xl font-bold text-ink-50 font-mono">{formatGigabytes(totalStorage)}</p>
          <p className="text-xs text-ink-400 mt-1">{streams.length} data streams</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-secondary-300" />
            <span className="text-xs text-ink-300">Throughput</span>
          </div>
          <p className="text-2xl font-bold text-ink-50 font-mono">{formatNumber(totalRecords, 0)} <span className="text-sm text-ink-300">rec/min</span></p>
          <p className="text-xs text-success-300 mt-1">across all streams</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-success-300" />
            <span className="text-xs text-ink-300">Avg Completeness</span>
          </div>
          <p className="text-2xl font-bold text-ink-50 font-mono">{avgCompleteness.toFixed(1)}%</p>
          <div className="mt-2"><ProgressBar value={avgCompleteness} color="bg-success-500" height="h-1.5" /></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-accent-300" />
            <span className="text-xs text-ink-300">Avg Latency</span>
          </div>
          <p className="text-2xl font-bold text-ink-50 font-mono">{avgLatency.toFixed(0)} <span className="text-sm text-ink-300">ms</span></p>
          <p className={`text-xs mt-1 ${avgLatency > 200 ? 'text-warning-300' : 'text-success-300'}`}>
            {avgLatency > 200 ? 'Above target' : 'Within target'}
          </p>
        </Card>
      </div>

      {/* Stream health cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
        ) : (
          streams.map((stream) => {
            const Icon = sourceIcons[stream.source_type] || Database;
            const color = sourceColors[stream.source_type] || '#3a72e0';
            const isSelected = selectedId === stream.id;
            return (
              <button
                key={stream.id}
                onClick={() => setSelectedId(stream.id)}
                className={`text-left p-5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-primary-500/10 border-primary-500/40 shadow-lg shadow-primary-500/10'
                    : 'bg-ink-800/80 border-ink-600/50 hover:border-ink-500/60 hover:bg-ink-700/40'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-50">{stream.name}</p>
                      <p className="text-xs text-ink-400 uppercase tracking-wider">{stream.source_type}</p>
                    </div>
                  </div>
                  <StatusBadge status={stream.status} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-ink-400 mb-0.5">Records/min</p>
                    <p className="font-mono text-ink-50">{formatNumber(stream.records_per_min, 0)}</p>
                  </div>
                  <div>
                    <p className="text-ink-400 mb-0.5">Completeness</p>
                    <p className={`font-mono ${stream.completeness_pct < 95 ? 'text-warning-300' : 'text-ink-50'}`}>{stream.completeness_pct.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-ink-400 mb-0.5">Error Rate</p>
                    <p className={`font-mono ${stream.error_rate_pct > 3 ? 'text-error-300' : stream.error_rate_pct > 1 ? 'text-warning-300' : 'text-success-300'}`}>
                      {stream.error_rate_pct.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-400 mb-0.5">Latency</p>
                    <p className={`font-mono ${stream.latency_ms > 200 ? 'text-warning-300' : 'text-ink-50'}`}>{stream.latency_ms.toFixed(0)} ms</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-ink-600/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-400">Storage: {formatGigabytes(stream.storage_gb)}</span>
                    <span className="text-ink-400">{formatRelative(stream.last_updated)}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Detailed charts for selected stream */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Quality */}
          <Card
            title={`${selected.name} - Data Quality`}
            subtitle="Completeness & accuracy over last 24h"
            icon={<CheckCircle className="w-4 h-4" />}
          >
            <div className="p-5">
              {metricsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <>
                  <LineChart
                    data={metrics.map((m) => ({ timestamp: m.timestamp, value: m.completeness_pct }))}
                    height={180}
                    color="#34b85a"
                    unit="%"
                    thresholdHigh={100}
                    thresholdLow={90}
                  />
                  <div className="mt-4">
                    <LineChart
                      data={metrics.map((m) => ({ timestamp: m.timestamp, value: m.accuracy_pct }))}
                      height={160}
                      color="#3a72e0"
                      unit="%"
                      thresholdLow={95}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-success-300"><span className="w-2 h-2 rounded-full bg-success-400" /> Completeness</span>
                    <span className="flex items-center gap-1.5 text-primary-300"><span className="w-2 h-2 rounded-full bg-primary-400" /> Accuracy</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Error Rate & Latency */}
          <Card
            title={`${selected.name} - Performance`}
            subtitle="Error rate & latency over last 24h"
            icon={<Clock className="w-4 h-4" />}
          >
            <div className="p-5">
              {metricsLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <>
                  <LineChart
                    data={metrics.map((m) => ({ timestamp: m.timestamp, value: m.error_rate_pct }))}
                    height={180}
                    color="#ef5542"
                    unit="%"
                    thresholdHigh={5}
                  />
                  <div className="mt-4">
                    <LineChart
                      data={metrics.map((m) => ({ timestamp: m.timestamp, value: m.latency_ms }))}
                      height={160}
                      color="#f9ab30"
                      unit=" ms"
                      thresholdHigh={200}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-error-300"><span className="w-2 h-2 rounded-full bg-error-400" /> Error Rate</span>
                    <span className="flex items-center gap-1.5 text-warning-300"><span className="w-2 h-2 rounded-full bg-warning-400" /> Latency</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Storage Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-1"
          title="Storage Utilization"
          subtitle="By data category"
          icon={<HardDrive className="w-4 h-4" />}
        >
          <div className="p-5">
            <StorageBreakdown streams={streams} totalStorage={totalStorage} />
          </div>
        </Card>

        <Card
          className="lg:col-span-2"
          title="Storage Growth Trend"
          subtitle="Cumulative storage over last 24h"
          icon={<Database className="w-4 h-4" />}
        >
          <div className="p-5">
            {metricsLoading || !selected ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <LineChart
                data={metrics.map((m) => ({ timestamp: m.timestamp, value: m.storage_gb }))}
                height={240}
                color="#3a72e0"
                unit=" GB"
              />
            )}
          </div>
        </Card>
      </div>

      {/* Pipeline stream table */}
      <Card
        title="Pipeline Stream Status"
        subtitle="All ingestion streams"
        icon={<Database className="w-4 h-4" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600/40">
                <th className="text-left py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Stream</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden sm:table-cell">Records/min</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden md:table-cell">Completeness</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden md:table-cell">Errors</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden lg:table-cell">Latency</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden lg:table-cell">Storage</th>
                <th className="text-right py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600/20">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-3 px-5"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : (
                streams.map((stream) => {
                  const Icon = sourceIcons[stream.source_type] || Database;
                  const color = sourceColors[stream.source_type] || '#3a72e0';
                  return (
                    <tr
                      key={stream.id}
                      className="hover:bg-ink-700/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedId(stream.id)}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <div>
                            <p className="font-medium text-ink-50">{stream.name}</p>
                            <p className="text-xs text-ink-400 uppercase">{stream.source_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-ink-50">{formatNumber(stream.records_per_min, 0)}</span>
                      </td>
                      <td className="py-3 px-3 text-right hidden md:table-cell">
                        <span className={`font-mono ${stream.completeness_pct < 95 ? 'text-warning-300' : 'text-ink-50'}`}>{stream.completeness_pct.toFixed(1)}%</span>
                      </td>
                      <td className="py-3 px-3 text-right hidden md:table-cell">
                        <span className={`font-mono ${stream.error_rate_pct > 3 ? 'text-error-300' : stream.error_rate_pct > 1 ? 'text-warning-300' : 'text-success-300'}`}>
                          {stream.error_rate_pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right hidden lg:table-cell">
                        <span className={`font-mono ${stream.latency_ms > 200 ? 'text-warning-300' : 'text-ink-50'}`}>{stream.latency_ms.toFixed(0)} ms</span>
                      </td>
                      <td className="py-3 px-3 text-right hidden lg:table-cell">
                        <span className="font-mono text-ink-100">{formatGigabytes(stream.storage_gb)}</span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <StatusBadge status={stream.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Erroring streams alert */}
      {erroringStreams.length > 0 && (
        <Card className="p-5 border-error-500/30 bg-error-500/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-error-500/15 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-error-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error-300">Pipeline Issues Detected</h3>
              <p className="text-sm text-ink-200 mt-1">
                {erroringStreams.length} stream{erroringStreams.length > 1 ? 's' : ''} experiencing issues:
                {' '}{erroringStreams.map((s) => s.name).join(', ')}
              </p>
              <p className="text-xs text-ink-300 mt-2">
                Recommended action: Check source connectivity and verify ingestion pipeline logs for error details.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StorageBreakdown({ streams, totalStorage }: { streams: PipelineStream[]; totalStorage: number }) {
  const colors: Record<string, string> = {
    scada: '#3a72e0',
    ami: '#2aaaaa',
    weather: '#34b85a',
    der_telemetry: '#f9ab30',
    events: '#ef5542',
  };

  let cumulative = 0;
  const segments = streams.map((s) => {
    const pct = totalStorage > 0 ? (s.storage_gb / totalStorage) * 100 : 0;
    const offset = cumulative;
    cumulative += pct;
    return { ...s, pct, offset };
  });

  return (
    <div>
      {/* Bar visualization */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="h-full transition-all duration-500 hover:brightness-110"
            style={{
              width: `${seg.pct}%`,
              backgroundColor: colors[seg.source_type] || '#3a72e0',
            }}
            title={`${seg.name}: ${formatGigabytes(seg.storage_gb)}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {segments
          .sort((a, b) => b.storage_gb - a.storage_gb)
          .map((seg) => (
            <div key={seg.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: colors[seg.source_type] || '#3a72e0' }} />
                <span className="text-ink-200">{seg.name}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-ink-50">{formatGigabytes(seg.storage_gb)}</span>
                <span className="text-xs text-ink-400 ml-2">{seg.pct.toFixed(1)}%</span>
              </div>
            </div>
          ))}
      </div>

      <div className="mt-4 pt-4 border-t border-ink-600/20 flex items-center justify-between">
        <span className="text-sm text-ink-200">Total</span>
        <span className="font-mono font-bold text-ink-50">{formatGigabytes(totalStorage)}</span>
      </div>
    </div>
  );
}
