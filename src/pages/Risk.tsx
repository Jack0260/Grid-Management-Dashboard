import { useState, useMemo } from 'react';
import { ShieldAlert, Sun, Wind, Battery, Zap, CheckCircle, AlertCircle, Flag, X, TrendingUp, Gauge } from 'lucide-react';
import { Card, StatusBadge, Skeleton, ProgressBar } from '@/components/ui/Card';
import { useDerResources } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { riskColor } from '@/lib/utils';
import type { DerResource } from '@/types';

interface RiskProps {
  refreshKey: number;
}

const typeIcons: Record<string, typeof Sun> = {
  solar: Sun,
  wind: Wind,
  battery: Battery,
  demand_response: Zap,
};

const typeColors: Record<string, string> = {
  solar: 'text-accent-300 bg-accent-500/15',
  wind: 'text-secondary-300 bg-secondary-500/15',
  battery: 'text-success-300 bg-success-500/15',
  demand_response: 'text-primary-300 bg-primary-500/15',
};

export function Risk({ refreshKey }: RiskProps) {
  const { data: ders, loading, error, refetch } = useDerResources();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'flagged'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  void refreshKey;

  const selected = useMemo(() => ders.find((d) => d.id === selectedId) || null, [ders, selectedId]);

  const filteredDers = filter === 'all' ? ders : ders.filter((d) => d.approval_status === filter);

  const pendingCount = ders.filter((d) => d.approval_status === 'pending').length;
  const approvedCount = ders.filter((d) => d.approval_status === 'approved').length;
  const flaggedCount = ders.filter((d) => d.approval_status === 'flagged').length;
  const avgRisk = ders.length > 0 ? ders.reduce((s, d) => s + d.risk_score, 0) / ders.length : 0;
  const totalCapacity = ders.reduce((s, d) => s + d.capacity_mw, 0);
  const totalOutput = ders.filter((d) => d.status === 'active').reduce((s, d) => s + d.current_output_mw, 0);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    const { error: err } = await supabase
      .from('der_resources')
      .update({ approval_status: 'approved', status: 'active', connected_date: new Date().toISOString() })
      .eq('id', id);
    setActionLoading(null);
    if (err) {
      setActionError(`Failed to approve: ${err.message}`);
    } else {
      await refetch();
      setSelectedId(null);
    }
  };

  const handleFlag = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    const { error: err } = await supabase
      .from('der_resources')
      .update({ approval_status: 'flagged' })
      .eq('id', id);
    setActionLoading(null);
    if (err) {
      setActionError(`Failed to flag: ${err.message}`);
    } else {
      await refetch();
      setSelectedId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error banner */}
      {(error || actionError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border border-error-500/30 rounded-lg text-sm text-error-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error || actionError}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink-300 mb-1">Total DER Capacity</p>
          <p className="text-2xl font-bold text-ink-50 font-mono">{totalCapacity.toFixed(0)} <span className="text-sm text-ink-300">MW</span></p>
          <p className="text-xs text-success-300 mt-1">{totalOutput.toFixed(1)} MW active</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-300 mb-1">Avg Integration Risk</p>
          <p className="text-2xl font-bold font-mono" style={{ color: avgRisk < 30 ? '#5cc87c' : avgRisk < 50 ? '#f9ab30' : avgRisk < 70 ? '#e88f10' : '#f47d6f' }}>
            {avgRisk.toFixed(0)}
          </p>
          <p className="text-xs text-ink-400 mt-1">across {ders.length} resources</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-300 mb-1">Pending Approvals</p>
          <p className="text-2xl font-bold text-warning-300 font-mono">{pendingCount}</p>
          <p className="text-xs text-ink-400 mt-1">awaiting review</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-300 mb-1">Approved / Flagged</p>
          <div className="flex items-baseline gap-3">
            <p className="text-2xl font-bold text-success-300 font-mono">{approvedCount}</p>
            <p className="text-sm text-ink-300">/</p>
            <p className="text-2xl font-bold text-error-300 font-mono">{flaggedCount}</p>
          </div>
        </Card>
      </div>

      {/* Risk Matrix + Resource Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Risk Matrix */}
        <Card
          className="xl:col-span-1"
          title="Risk Assessment Matrix"
          subtitle="Likelihood vs. Impact"
          icon={<ShieldAlert className="w-4 h-4" />}
        >
          <div className="p-5">
            <RiskMatrix ders={ders} onPointClick={(id) => setSelectedId(id)} selectedId={selectedId} />
          </div>
        </Card>

        {/* Resource Detail */}
        <Card
          className="xl:col-span-2"
          title={selected ? selected.name : 'Resource Details'}
          subtitle={selected ? `${selected.type.replace('_', ' ')} • ${selected.region}` : 'Select a resource to view details'}
          icon={selected ? (() => { const Icon = typeIcons[selected.type] || Sun; return <Icon className="w-4 h-4" />; })() : <ShieldAlert className="w-4 h-4" />}
          action={selected ? <StatusBadge status={selected.approval_status} /> : undefined}
        >
          {selected ? (
            <div className="p-5 space-y-5">
              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-ink-700/30 rounded-lg">
                  <p className="text-xs text-ink-300">Capacity</p>
                  <p className="text-lg font-bold text-ink-50 font-mono">{selected.capacity_mw} MW</p>
                </div>
                <div className="p-3 bg-ink-700/30 rounded-lg">
                  <p className="text-xs text-ink-300">Output</p>
                  <p className="text-lg font-bold text-ink-50 font-mono">{selected.current_output_mw.toFixed(1)} MW</p>
                </div>
                <div className="p-3 bg-ink-700/30 rounded-lg">
                  <p className="text-xs text-ink-300">Risk Score</p>
                  <p className={`text-lg font-bold font-mono ${riskColor(selected.risk_score).text}`}>{selected.risk_score.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-ink-700/30 rounded-lg">
                  <p className="text-xs text-ink-300">Operator</p>
                  <p className="text-sm font-medium text-ink-50">{selected.operator}</p>
                </div>
              </div>

              {/* Risk factors */}
              <div>
                <h4 className="text-sm font-semibold text-ink-50 mb-3">Integration Risk Factors</h4>
                <div className="space-y-3">
                  <RiskFactorBar label="Likelihood" value={selected.likelihood} max={5} />
                  <RiskFactorBar label="Impact" value={selected.impact} max={5} />
                  <RiskFactorBar label="Overall Risk" value={selected.risk_score} max={100} />
                </div>
              </div>

              {/* Contribution */}
              <div>
                <h4 className="text-sm font-semibold text-ink-50 mb-3">Grid Contribution</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-200">Utilization</span>
                    <span className="font-mono text-ink-50">{((selected.current_output_mw / selected.capacity_mw) * 100).toFixed(1)}%</span>
                  </div>
                  <ProgressBar
                    value={(selected.current_output_mw / selected.capacity_mw) * 100}
                    color={selected.status === 'curtailed' ? 'bg-warning-500' : 'bg-success-500'}
                  />
                </div>
              </div>

              {/* Mitigation recommendations */}
              <div>
                <h4 className="text-sm font-semibold text-ink-50 mb-2">Mitigation Recommendations</h4>
                <div className="space-y-1.5">
                  {getMitigations(selected).map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-ink-200">
                      <CheckCircle className="w-4 h-4 text-success-300 mt-0.5 shrink-0" />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval actions */}
              {selected.approval_status === 'pending' && (
                <div className="flex gap-3 pt-3 border-t border-ink-600/30">
                  <button
                    onClick={() => handleApprove(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="flex items-center gap-2 px-4 py-2 bg-success-500/15 hover:bg-success-500/25 text-success-300 border border-success-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading === selected.id ? 'Processing...' : 'Approve Integration'}
                  </button>
                  <button
                    onClick={() => handleFlag(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="flex items-center gap-2 px-4 py-2 bg-error-500/15 hover:bg-error-500/25 text-error-300 border border-error-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Flag className="w-4 h-4" />
                    {actionLoading === selected.id ? 'Processing...' : 'Flag for Review'}
                  </button>
                </div>
              )}
              {selected.approval_status === 'flagged' && (
                <div className="flex gap-3 pt-3 border-t border-ink-600/30">
                  <button
                    onClick={() => handleApprove(selected.id)}
                    disabled={actionLoading === selected.id}
                    className="flex items-center gap-2 px-4 py-2 bg-success-500/15 hover:bg-success-500/25 text-success-300 border border-success-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {actionLoading === selected.id ? 'Processing...' : 'Approve Integration'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 flex items-center justify-center">
              <div className="text-center">
                <ShieldAlert className="w-12 h-12 text-ink-400 mx-auto mb-3" />
                <p className="text-ink-200">Select a resource from the matrix or table below</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Resource Registry Table */}
      <Card
        title="DER Resource Registry"
        subtitle="All distributed energy resources"
        icon={<TrendingUp className="w-4 h-4" />}
        action={
          <div className="flex gap-1">
            {(['all', 'pending', 'approved', 'flagged'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === f ? 'bg-primary-500/20 text-primary-300' : 'text-ink-300 hover:text-ink-50 hover:bg-ink-700/40'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-600/40">
                <th className="text-left py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Resource</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden sm:table-cell">Capacity</th>
                <th className="text-right py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden md:table-cell">Output</th>
                <th className="text-center py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider">Risk</th>
                <th className="text-left py-2.5 px-3 font-medium text-ink-300 text-xs uppercase tracking-wider hidden lg:table-cell">Operator</th>
                <th className="text-right py-2.5 px-5 font-medium text-ink-300 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600/20">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-3 px-5"><Skeleton className="h-8 w-full" /></td></tr>
                ))
              ) : filteredDers.length === 0 ? (
                <tr><td colSpan={6} className="py-8 px-5 text-center text-sm text-ink-300">
                  {error ? 'Failed to load resources. See error above.' : 'No resources match this filter.'}
                </td></tr>
              ) : (
                filteredDers.map((der) => {
                  const Icon = typeIcons[der.type] || Sun;
                  const rc = riskColor(der.risk_score);
                  return (
                    <tr
                      key={der.id}
                      className="hover:bg-ink-700/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedId(der.id)}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${typeColors[der.type] || 'bg-ink-700/40 text-ink-200'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-ink-50">{der.name}</p>
                            <p className="text-xs text-ink-400">{der.type.replace('_', ' ')} • {der.region}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-ink-50">{der.capacity_mw} MW</span>
                      </td>
                      <td className="py-3 px-3 text-right hidden md:table-cell">
                        <span className="font-mono text-ink-100">{der.current_output_mw.toFixed(1)} MW</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14">
                            <ProgressBar value={der.risk_score} color={der.risk_score < 30 ? 'bg-success-500' : der.risk_score < 50 ? 'bg-warning-500' : der.risk_score < 70 ? 'bg-accent-500' : 'bg-error-500'} height="h-1.5" />
                          </div>
                          <span className={`font-mono text-xs font-medium ${rc.text} w-7 text-right`}>{der.risk_score.toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-ink-200 text-sm hidden lg:table-cell">{der.operator}</td>
                      <td className="py-3 px-5 text-right">
                        <StatusBadge status={der.approval_status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending approvals */}
      {pendingCount > 0 && (
        <Card
          title="Pending Integration Approvals"
          subtitle={`${pendingCount} resources awaiting review`}
          icon={<AlertCircle className="w-4 h-4 text-warning-300" />}
        >
          <div className="divide-y divide-ink-600/20">
            {ders.filter((d) => d.approval_status === 'pending').map((der) => {
              const Icon = typeIcons[der.type] || Sun;
              const rc = riskColor(der.risk_score);
              return (
                <div key={der.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-ink-700/20 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColors[der.type] || 'bg-ink-700/40 text-ink-200'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-50">{der.name}</p>
                    <p className="text-xs text-ink-300">{der.type.replace('_', ' ')} • {der.capacity_mw} MW • {der.region}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-ink-300">Risk Score</p>
                      <p className={`text-sm font-mono font-bold ${rc.text}`}>{der.risk_score.toFixed(0)}</p>
                    </div>
                    <button
                      onClick={() => handleApprove(der.id)}
                      disabled={actionLoading === der.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-success-500/15 hover:bg-success-500/25 text-success-300 border border-success-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {actionLoading === der.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleFlag(der.id)}
                      disabled={actionLoading === der.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-error-500/15 hover:bg-error-500/25 text-error-300 border border-error-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {actionLoading === der.id ? '...' : 'Flag'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function RiskMatrix({ ders, onPointClick, selectedId }: { ders: DerResource[]; onPointClick: (id: string) => void; selectedId: string | null }) {
  const size = 280;
  const cellSize = size / 5;
  const pad = 36;

  const cellColor = (likelihood: number, impact: number) => {
    const score = (likelihood + impact) / 2;
    if (score <= 1.5) return 'rgba(52, 184, 90, 0.12)';
    if (score <= 2.5) return 'rgba(89, 200, 124, 0.1)';
    if (score <= 3) return 'rgba(249, 171, 48, 0.12)';
    if (score <= 3.5) return 'rgba(232, 143, 16, 0.12)';
    return 'rgba(239, 85, 66, 0.12)';
  };

  return (
    <div>
      <svg viewBox={`0 0 ${size + pad + 20} ${size + pad + 20}`} className="w-full">
        {/* Axis labels */}
        <text x={(size + pad) / 2 + 10} y={size + pad + 16} fill="#6b7589" fontSize="10" textAnchor="middle" fontWeight="500">
          Likelihood →
        </text>
        <text x={12} y={(size + pad) / 2 + 10} fill="#6b7589" fontSize="10" textAnchor="middle" fontWeight="500" transform={`rotate(-90, 12, ${(size + pad) / 2 + 10})`}>
          Impact →
        </text>

        {/* Grid cells */}
        {[...Array(5)].map((_, li) => {
          return [...Array(5)].map((_, im) => {
            const x = pad + li * cellSize;
            const y = size + pad - (im + 1) * cellSize;
            return (
              <rect
                key={`cell-${li}-${im}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={cellColor(li + 1, im + 1)}
                stroke="#161c28"
                strokeWidth="0.5"
              />
            );
          });
        })}

        {/* Axis numbers */}
        {[...Array(5)].map((_, i) => (
          <text key={`lx-${i}`} x={pad + i * cellSize + cellSize / 2} y={size + pad + 4} fill="#6b7589" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {i + 1}
          </text>
        ))}
        {[...Array(5)].map((_, i) => (
          <text key={`ly-${i}`} x={pad - 6} y={size + pad - i * cellSize - cellSize / 2 + 3} fill="#6b7589" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">
            {i + 1}
          </text>
        ))}

        {/* Resource points */}
        {ders.map((der) => {
          const seed = der.id.charCodeAt(0) + der.id.charCodeAt(1);
          const jitterX = ((seed % 7) - 3) * 3;
          const jitterY = (((seed >> 3) % 7) - 3) * 3;
          const x = pad + (der.likelihood - 1) * cellSize + cellSize / 2 + jitterX;
          const y = size + pad - (der.impact - 1) * cellSize - cellSize / 2 + jitterY;
          const isSelected = selectedId === der.id;
          const pointColor = der.risk_score < 30 ? '#34b85a' : der.risk_score < 50 ? '#f9ab30' : der.risk_score < 70 ? '#e88f10' : '#ef5542';
          return (
            <g key={der.id} className="cursor-pointer" onClick={() => onPointClick(der.id)}>
              {isSelected && (
                <circle cx={x} cy={y} r="12" fill={pointColor} fillOpacity="0.2">
                  <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 7 : 5}
                fill={pointColor}
                fillOpacity="0.8"
                stroke={isSelected ? '#e9ecf1' : pointColor}
                strokeWidth={isSelected ? 2 : 1}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1.5 text-ink-300"><span className="w-2 h-2 rounded-full bg-success-400" /> Low</span>
        <span className="flex items-center gap-1.5 text-ink-300"><span className="w-2 h-2 rounded-full bg-warning-400" /> Medium</span>
        <span className="flex items-center gap-1.5 text-ink-300"><span className="w-2 h-2 rounded-full bg-error-400" /> High</span>
      </div>
    </div>
  );
}

function RiskFactorBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  const color = pct < 30 ? 'bg-success-500' : pct < 60 ? 'bg-warning-500' : 'bg-error-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-ink-200">{label}</span>
        <span className="text-xs font-mono text-ink-50">{value.toFixed(max === 5 ? 1 : 0)}{max === 5 ? '/5' : '/100'}</span>
      </div>
      <ProgressBar value={pct} color={color} height="h-2" />
    </div>
  );
}

function getMitigations(der: DerResource): string[] {
  const mitigations: string[] = [];
  if (der.risk_score > 50) {
    mitigations.push('Deploy additional grid stabilization equipment at connection point');
    mitigations.push('Implement gradual ramp-up protocol over 72-hour period');
  }
  if (der.type === 'solar' || der.type === 'wind') {
    mitigations.push('Install forecasting-based curtailment system for intermittency management');
    mitigations.push('Coordinate with neighboring substations for load balancing during generation dips');
  }
  if (der.type === 'battery') {
    mitigations.push('Configure frequency response mode for grid stabilization support');
    mitigations.push('Establish state-of-charge thresholds to maintain reserve capacity');
  }
  if (der.likelihood > 3) {
    mitigations.push('Increase monitoring frequency to 1-minute intervals during initial integration phase');
  }
  if (der.impact > 3) {
    mitigations.push('Require operator sign-off for any output changes exceeding 10% capacity');
  }
  if (mitigations.length === 0) {
    mitigations.push('Resource meets standard integration criteria - no additional mitigations required');
    mitigations.push('Continue routine monitoring per standard operating procedures');
  }
  return mitigations;
}
