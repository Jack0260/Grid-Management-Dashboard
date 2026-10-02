import { useEffect, useState } from 'react';
import { Bell, Clock, User, Menu, Search } from 'lucide-react';
import type { Alert } from '@/types';
import { formatRelative, formatTime } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle: string;
  alerts: Alert[];
  onMobileMenu: () => void;
  onAckAlert: (id: string) => void;
}

export function TopBar({ title, subtitle, alerts, onMobileMenu, onAckAlert }: TopBarProps) {
  const [now, setNow] = useState(new Date());
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unackAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalCount = unackAlerts.filter((a) => a.severity === 'critical').length;
  const warningCount = unackAlerts.filter((a) => a.severity === 'warning').length;

  const gridStatus = criticalCount > 0 ? 'critical' : warningCount > 2 ? 'warning' : 'nominal';
  const statusConfig = {
    nominal: { label: 'Grid Nominal', color: 'text-success-300 bg-success-500/10 border-success-500/30', dot: 'bg-success-400' },
    warning: { label: 'Grid Warning', color: 'text-warning-300 bg-warning-500/10 border-warning-500/30', dot: 'bg-warning-400' },
    critical: { label: 'Grid Critical', color: 'text-error-300 bg-error-500/10 border-error-500/30', dot: 'bg-error-400' },
  };
  const status = statusConfig[gridStatus as keyof typeof statusConfig];

  return (
    <header className="sticky top-0 z-20 h-16 bg-ink-900/90 backdrop-blur-md border-b border-ink-600/40 flex items-center justify-between px-4 lg:px-6 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenu}
          className="lg:hidden p-2 rounded-lg hover:bg-ink-700/50 text-ink-200"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-50 truncate">{title}</h2>
          <p className="text-xs text-ink-300 truncate hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Grid status */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${status.color}`}>
          <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
          {status.label}
        </div>

        {/* Clock */}
        <div className="hidden sm:flex items-center gap-2 text-ink-200">
          <Clock className="w-4 h-4 text-ink-300" />
          <span className="text-sm font-mono tabular-nums">
            {now.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        {/* Alerts */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="relative p-2 rounded-lg hover:bg-ink-700/50 text-ink-200 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unackAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unackAlerts.length}
              </span>
            )}
          </button>

          {showAlerts && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowAlerts(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-ink-800 border border-ink-600/50 rounded-xl shadow-2xl z-40 max-h-96 overflow-y-auto animate-slide-up">
                <div className="px-4 py-3 border-b border-ink-600/40 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink-50">Active Alerts</h3>
                  <span className="text-xs text-ink-300">{unackAlerts.length} unacknowledged</span>
                </div>
                {unackAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-ink-300">No active alerts</div>
                ) : (
                  <div className="divide-y divide-ink-600/30">
                    {unackAlerts.slice(0, 10).map((alert) => (
                      <div key={alert.id} className="px-4 py-3 hover:bg-ink-700/30 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            alert.severity === 'critical' ? 'bg-error-400' : alert.severity === 'warning' ? 'bg-warning-400' : 'bg-primary-400'
                          } animate-pulse`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-50 truncate">{alert.title}</p>
                            <p className="text-xs text-ink-300 mt-0.5 line-clamp-2">{alert.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] text-ink-400 font-mono">{formatRelative(alert.created_at)}</span>
                              <button
                                onClick={() => onAckAlert(alert.id)}
                                className="text-[10px] text-primary-300 hover:text-primary-200 font-medium"
                              >
                                Acknowledge
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Operator */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-ink-600/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-ink-50 leading-tight">Operator</p>
            <p className="text-xs text-ink-300 leading-tight">M. Rodriguez</p>
          </div>
        </div>
      </div>
    </header>
  );
}
