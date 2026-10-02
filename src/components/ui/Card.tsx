import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function Card({ children, className = '', title, subtitle, icon, action }: CardProps) {
  return (
    <div
      className={`bg-ink-800/80 border border-ink-600/50 rounded-xl backdrop-blur-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-600/40">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-ink-200">{icon}</span>}
            <div>
              {title && <h3 className="text-sm font-semibold text-ink-50">{title}</h3>}
              {subtitle && <p className="text-xs text-ink-300 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, label, showDot = true }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    operational: 'text-success-300 bg-success-500/10 border-success-500/30',
    normal: 'text-success-300 bg-success-500/10 border-success-500/30',
    active: 'text-success-300 bg-success-500/10 border-success-500/30',
    approved: 'text-success-300 bg-success-500/10 border-success-500/30',
    running: 'text-success-300 bg-success-500/10 border-success-500/30',
    warning: 'text-warning-300 bg-warning-500/10 border-warning-500/30',
    pending: 'text-warning-300 bg-warning-500/10 border-warning-500/30',
    curtailed: 'text-warning-300 bg-warning-500/10 border-warning-500/30',
    erroring: 'text-warning-300 bg-warning-500/10 border-warning-500/30',
    critical: 'text-error-300 bg-error-500/10 border-error-500/30',
    offline: 'text-error-300 bg-error-500/10 border-error-500/30',
    stopped: 'text-error-300 bg-error-500/10 border-error-500/30',
    flagged: 'text-error-300 bg-error-500/10 border-error-500/30',
    info: 'text-primary-300 bg-primary-500/10 border-primary-500/30',
  };

  const dotColors: Record<string, string> = {
    operational: 'bg-success-400',
    normal: 'bg-success-400',
    active: 'bg-success-400',
    approved: 'bg-success-400',
    running: 'bg-success-400',
    warning: 'bg-warning-400',
    pending: 'bg-warning-400',
    curtailed: 'bg-warning-400',
    erroring: 'bg-warning-400',
    critical: 'bg-error-400',
    offline: 'bg-error-400',
    stopped: 'bg-error-400',
    flagged: 'bg-error-400',
    info: 'bg-primary-400',
  };

  const cls = colors[status] || 'text-ink-200 bg-ink-500/10 border-ink-500/30';
  const dotCls = dotColors[status] || 'bg-ink-300';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotCls} ${status === 'critical' || status === 'warning' ? 'animate-pulse' : ''}`} />
      )}
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`bg-ink-700/50 rounded animate-pulse ${className}`} />;
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
}

export function ProgressBar({ value, max = 100, color = 'bg-primary-500', height = 'h-2' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`w-full ${height} bg-ink-700/60 rounded-full overflow-hidden`}>
      <div
        className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
