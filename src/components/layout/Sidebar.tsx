import { Zap, LayoutDashboard, Activity, Cloud, ShieldAlert, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageId } from '@/types';

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sensors', label: 'Sensor Streams', icon: Activity },
  { id: 'weather', label: 'Weather Data', icon: Cloud },
  { id: 'risk', label: 'Risk Integration', icon: ShieldAlert },
  { id: 'pipeline', label: 'Data Pipeline', icon: Database },
];

export function Sidebar({ current, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-40 h-screen
          bg-ink-900 border-r border-ink-600/40
          flex flex-col
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-ink-600/40 h-16 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-ink-50 whitespace-nowrap">GridWatch</h1>
              <p className="text-[10px] text-ink-300 whitespace-nowrap">Grid Operations Center</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30'
                    : 'text-ink-200 hover:bg-ink-700/50 hover:text-ink-50 border border-transparent'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-primary-300' : ''}`} />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center px-4 py-3 border-t border-ink-600/40 text-ink-300 hover:text-ink-50 hover:bg-ink-700/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}
