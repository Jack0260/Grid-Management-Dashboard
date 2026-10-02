import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Overview } from '@/pages/Overview';
import { Sensors } from '@/pages/Sensors';
import { Weather } from '@/pages/Weather';
import { Risk } from '@/pages/Risk';
import { Pipeline } from '@/pages/Pipeline';
import { useSubstations, useWeatherStations, usePipelineStreams, useAlerts } from '@/hooks/useData';
import { useLiveSimulation } from '@/hooks/useLiveSimulation';
import { supabase } from '@/lib/supabase';
import type { PageId } from '@/types';

const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
  overview: { title: 'Operations Overview', subtitle: 'Real-time grid status and system health' },
  sensors: { title: 'Sensor Streams', subtitle: 'Substation telemetry and sensor monitoring' },
  weather: { title: 'Weather Data', subtitle: 'Meteorological conditions and renewable correlation' },
  risk: { title: 'Risk-Informed Resource Integration', subtitle: 'DER risk assessment and approval workflow' },
  pipeline: { title: 'Data Pipeline Monitor', subtitle: 'Ingestion health, data quality, and storage metrics' },
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: substations } = useSubstations();
  const { data: weatherStations } = useWeatherStations();
  const { data: pipelineStreams } = usePipelineStreams();
  const { data: alerts, refetch: refetchAlerts } = useAlerts();

  // Live data simulation - generates new readings every 15 seconds
  useLiveSimulation(substations, weatherStations, pipelineStreams, true);

  // Periodic refresh to pick up new simulated data
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAckAlert = useCallback(async (id: string) => {
    await supabase.from('alerts').update({ acknowledged: true }).eq('id', id);
    refetchAlerts();
  }, [refetchAlerts]);

  const meta = pageMeta[currentPage];

  return (
    <div className="flex min-h-screen bg-ink-900 grid-bg">
      <Sidebar
        current={currentPage}
        onNavigate={setCurrentPage}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          alerts={alerts}
          onMobileMenu={() => setMobileOpen(true)}
          onAckAlert={handleAckAlert}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {currentPage === 'overview' && <Overview onNavigate={setCurrentPage} refreshKey={refreshKey} />}
          {currentPage === 'sensors' && <Sensors refreshKey={refreshKey} />}
          {currentPage === 'weather' && <Weather refreshKey={refreshKey} />}
          {currentPage === 'risk' && <Risk refreshKey={refreshKey} />}
          {currentPage === 'pipeline' && <Pipeline refreshKey={refreshKey} />}
        </main>
      </div>
    </div>
  );
}
