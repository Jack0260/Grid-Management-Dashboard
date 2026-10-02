export function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatTimeShort(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatNumber(n: number, decimals = 1): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toFixed(decimals);
}

export function formatGigabytes(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb.toFixed(0)} GB`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function statusColor(status: string): {
  text: string;
  bg: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'operational':
    case 'normal':
    case 'active':
    case 'approved':
    case 'running':
      return {
        text: 'text-success-300',
        bg: 'bg-success-500/10',
        border: 'border-success-500/30',
        dot: 'bg-success-400',
      };
    case 'warning':
    case 'pending':
    case 'curtailed':
    case 'erroring':
      return {
        text: 'text-warning-300',
        bg: 'bg-warning-500/10',
        border: 'border-warning-500/30',
        dot: 'bg-warning-400',
      };
    case 'critical':
    case 'offline':
    case 'stopped':
    case 'flagged':
      return {
        text: 'text-error-300',
        bg: 'bg-error-500/10',
        border: 'border-error-500/30',
        dot: 'bg-error-400',
      };
    default:
      return {
        text: 'text-ink-200',
        bg: 'bg-ink-500/10',
        border: 'border-ink-500/30',
        dot: 'bg-ink-300',
      };
  }
}

export function riskColor(score: number): { text: string; bg: string; border: string } {
  if (score < 30) return { text: 'text-success-300', bg: 'bg-success-500/15', border: 'border-success-500/30' };
  if (score < 50) return { text: 'text-warning-300', bg: 'bg-warning-500/15', border: 'border-warning-500/30' };
  if (score < 70) return { text: 'text-accent-300', bg: 'bg-accent-500/15', border: 'border-accent-500/30' };
  return { text: 'text-error-300', bg: 'bg-error-500/15', border: 'border-error-500/30' };
}

export function typeIcon(type: string): string {
  switch (type) {
    case 'solar': return 'solar';
    case 'wind': return 'wind';
    case 'battery': return 'battery';
    case 'demand_response': return 'demand';
    default: return type;
  }
}
