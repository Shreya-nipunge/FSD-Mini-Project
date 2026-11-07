// frontend/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FilterPanel from '../components/FilterPanel.jsx';
import StatsBar from '../components/StatsBar.jsx';
import MapView from '../components/MapView.jsx';
import CrimeBarChart from '../components/CrimeBarChart.jsx';
import TrendLineChart from '../components/TrendLineChart.jsx';
import PieDistribution from '../components/PieDistribution.jsx';
import HotspotCards from '../components/HotspotCards.jsx';
import SafetyInsights from '../components/SafetyInsights.jsx';
import CrimeNewsPanel from '../components/CrimeNewsPanel.jsx';
import ComplaintForm from '../components/ComplaintForm.jsx';
import AdminDashboardPanels from '../components/AdminDashboardPanels.jsx';
import BenchmarkingPanel from '../components/BenchmarkingPanel.jsx';
import ActionableInsights from '../components/ActionableInsights.jsx';
import * as api from '../services/api.js';
import { ShieldAlert, Bell, User as UserIcon, Globe, Map as MapIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiErrorMessage } from '../services/api.js';
import { findCrimeForDistrict, findCrimeForHotspot, hasMapCoordinates, locationFromCrime } from '../services/analyticsMap.js';

const DEFAULT_FILTERS = { state: 'all', crime_type: '', region: '', year: '', gender: '' };

export default function Dashboard() {
  const [filters, setFilters]         = useState(DEFAULT_FILTERS);
  const [crimeData, setCrimeData]     = useState([]);
  const [summaryData, setSummaryData] = useState({ total_incidents: 0, top_crime: '—', hottest_zone: '—', under_investigation: 0 });
  const [barData, setBarData]         = useState({ labels: [], values: [] });
  const [trendData, setTrendData]     = useState([]);
  const [hotspotData, setHotspotData] = useState([]);
  const [complaintsData, setComplaintsData] = useState([]);
  const [insights, setInsights]       = useState([]);
  const [gapAlerts, setGapAlerts]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [apiError, setApiError]       = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const userRole = user?.role || 'user';
  const isAdmin = userRole === 'admin';
  
  const selectedDistrictData = useMemo(() => {
    if (!selectedLocation) return null;
    return findCrimeForDistrict(crimeData, selectedLocation.label, filters.state)
      || crimeData.find((crime) => hasMapCoordinates(crime)
        && Math.abs(Number(crime.lat) - Number(selectedLocation.lat)) < 0.1
        && Math.abs(Number(crime.lng) - Number(selectedLocation.lng)) < 0.1)
      || null;
  }, [selectedLocation, crimeData, filters.state]);

  // Fetch Insights separately as it depends only on state
  useEffect(() => {
    setInsightsLoading(true);
    api.getInsights(filters.state)
      .then(res => {
        setInsights(res.insights || []);
        setGapAlerts(res.gap_alerts || []);
        setInsightsLoading(false);
      })
      .catch(err => {
        if (err.response?.status !== 401) setApiError(getApiErrorMessage(err, 'Unable to load decision-support insights.'));
        setInsightsLoading(false);
      });
  }, [filters.state]);

  useEffect(() => {
    let cancelled = false;
    api.getTrend(filters.state)
      .then((trend) => {
        if (cancelled) return;
        setTrendData(trend);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [filters.state]);

  const handleFilterChange = useCallback((newFilters) => {
    if (Object.hasOwn(newFilters, 'state') || Object.hasOwn(newFilters, 'region')) {
      setSelectedLocation(null);
    }
    setFilters((prev) => {
      return { ...prev, ...newFilters };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiError('');
    
    Promise.all([
      api.getCrimes(filters),
      api.getSummary(filters.state, filters.year),
      api.getByType(filters.state, filters.year),
      api.getHotspots(filters.state, filters.year),
      api.getComplaints(filters.state)
    ])
      .then(([crimesResult, summaryResult, byTypeResult, hotspotsResult, complaintsResult]) => {
        if (cancelled) return;
        setCrimeData(crimesResult.data);
        setSummaryData(summaryResult);
        setBarData(byTypeResult);
        setHotspotData(hotspotsResult);
        setComplaintsData(complaintsResult.complaints || []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status !== 401) setApiError(getApiErrorMessage(err, 'Unable to load dashboard analytics.'));
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [filters]);

  const handleSelectHotspot = (spot) => {
    const match = findCrimeForHotspot(spot, crimeData, filters.state);
    const location = locationFromCrime(match);
    if (location) setSelectedLocation(location);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A1628] text-white overflow-hidden font-sans">
      <header className="h-16 flex-shrink-0 bg-[#0D1E38] border-b border-slate-700/30 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C0392B] flex items-center justify-center shadow-lg shadow-red-900/40">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">CrimeMap</h1>
            <p className="text-slate-500 text-[10px] tracking-[0.08em] uppercase mt-0.5 font-semibold">Real-time National Crime Intelligence & Decision Support System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {filters.state === 'all' && (
            <div className="hidden lg:flex items-center mx-2 animate-in fade-in zoom-in duration-500">
              <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]">
                <Globe size={14} className="text-blue-400" />
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">National View Active</span>
              </div>
            </div>
          )}

          {hotspotData.length > 0 && (
            <div className="hidden lg:flex items-center mx-4 flex-shrink-0 animate-in fade-in zoom-in duration-500">
              <div className="bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Risk Alert:</span>
                <span className="text-[12px] font-bold text-slate-100">{hotspotData[0].area}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link to="/admin" className="px-3 py-1.5 rounded-lg bg-[#0E7C8B] hover:bg-[#0A5A6A] text-xs font-semibold text-white transition-colors">
              📤 Upload CSV
            </Link>
          )}
          <button className="p-2 rounded-lg bg-[#0A1628] text-slate-400 hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0D1E38]" />
          </button>
          <div className="h-8 w-px bg-slate-700/50 mx-1" />
          <div className="flex items-center gap-3 pl-1">
            <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center border border-slate-700/50">
              <UserIcon size={18} className="text-slate-300" />
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/'); }}
            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-xs font-semibold text-red-400 transition-colors ml-2"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {apiError && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{apiError}</div>}
        <section><StatsBar summaryData={summaryData} /></section>
        <section><FilterPanel filters={filters} onFilterChange={handleFilterChange} onLocationSelect={setSelectedLocation} /></section>

        <section className="flex h-auto min-h-[600px] flex-col gap-6 lg:h-[600px] lg:flex-row">
          <div className="h-[420px] sm:h-[520px] lg:h-full lg:w-[70%]">
            <MapView crimes={crimeData} complaints={complaintsData} hotspots={hotspotData} stateName={filters.state} selectedDistrict={filters.region} loading={loading} errorMessage={apiError} selectedLocation={selectedLocation} onLocationSelect={setSelectedLocation} gapAlerts={gapAlerts} />
          </div>
          <div className="flex max-h-[520px] min-h-[320px] flex-col gap-4 overflow-y-auto no-scrollbar lg:h-full lg:max-h-full lg:min-h-0 lg:w-[30%]">
            <ActionableInsights insights={insights} gapAlerts={gapAlerts} loading={insightsLoading} />
            {selectedDistrictData && <SafetyInsights districtData={selectedDistrictData} />}
            <HotspotCards hotspotsData={hotspotData} onSelectHotspot={handleSelectHotspot} />
          </div>
        </section>

        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-white tracking-tight">Intelligence Benchmarking & Analytics</h2>
             {filters.state === 'all' && (
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">
                  Aggregated across Maharashtra, Karnataka, and Delhi
                </span>
             )}
           </div>
           <section className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-1 h-[350px]"><BenchmarkingPanel /></div>
              <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-4 h-[350px]"><CrimeBarChart barData={barData} /></div>
              <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-4 h-[350px]"><TrendLineChart trendData={trendData} /></div>
              <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-4 h-[350px]"><PieDistribution barData={barData} /></div>
           </section>
        </div>

        {isAdmin ? (
          <AdminDashboardPanels stateName={filters.state} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
            <ComplaintForm stateName={filters.state} />
            <CrimeNewsPanel city={selectedLocation?.label || filters.region || filters.state || 'Maharashtra'} />
          </div>
        )}
      </main>
    </div>
  );
}
