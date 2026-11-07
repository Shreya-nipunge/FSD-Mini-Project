import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterPanel from '../../components/FilterPanel.jsx';
import MapView from '../../components/MapView.jsx';
import SafetyInsights from '../../components/SafetyInsights.jsx';
import HotspotCards from '../../components/HotspotCards.jsx';
import * as api from '../../services/api.js';
import { getApiErrorMessage } from '../../services/api.js';
import { findCrimeForDistrict, findCrimeForHotspot, hasMapCoordinates, locationFromCrime } from '../../services/analyticsMap.js';

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlState = searchParams.get('state') || 'Maharashtra';
  
  const [filters, setFilters] = useState({ state: urlState, crime_type: '', region: searchParams.get('district') || '', year: '', gender: '' });
  const [crimeData, setCrimeData] = useState([]);
  const [hotspotData, setHotspotData] = useState([]);
  const [complaintsData, setComplaintsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

// Re-derive district Data
  const selectedDistrictData = useMemo(() => {
    if (!selectedLocation) return null;
    return findCrimeForDistrict(crimeData, selectedLocation.label, filters.state)
      || crimeData.find((crime) => hasMapCoordinates(crime)
        && Math.abs(Number(crime.lat ?? crime.latitude) - Number(selectedLocation.lat)) < 0.1
        && Math.abs(Number(crime.lng ?? crime.longitude) - Number(selectedLocation.lng)) < 0.1)
      || null;
  }, [selectedLocation, crimeData, filters.state]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    
    Promise.all([
      api.getCrimes(filters),
      api.getHotspots(filters.state, filters.year),
      api.getComplaints(filters.state)
    ])
      .then(([crimesResult, hotspotsResult, complaintsResult]) => {
        if (cancelled) return;
        setCrimeData(crimesResult.data);
        setHotspotData(hotspotsResult);
        setComplaintsData(complaintsResult.complaints || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Unable to load map data.'));
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [filters]);

  const handleFilterChange = useCallback((newFilters) => {
    if (Object.hasOwn(newFilters, 'state') || Object.hasOwn(newFilters, 'region')) setSelectedLocation(null);
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      // Sync state back to URL
      const url = new URLSearchParams(searchParams);
      if (Object.hasOwn(newFilters, 'state')) url.set('state', newFilters.state);
      if (Object.hasOwn(newFilters, 'region')) {
        if (newFilters.region) url.set('district', newFilters.region);
        else url.delete('district');
      }
      setSearchParams(url);
      return next;
    });
  }, [searchParams, setSearchParams]);

  const handleSelectHotspot = (spot) => {
    const match = findCrimeForHotspot(spot, crimeData, filters.state);
    const location = locationFromCrime(match);
    if (location) setSelectedLocation(location);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Intelligence Map</h2>
          <p className="text-sm text-slate-400">Live geographic crime distribution</p>
        </div>
      </div>

      <section>
        <FilterPanel filters={filters} onFilterChange={handleFilterChange} onLocationSelect={setSelectedLocation} />
      </section>
      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

      <section className="flex min-h-[600px] flex-col gap-6 lg:h-[600px] lg:flex-row">
        <div className="h-[480px] min-h-[420px] lg:h-full lg:w-[70%]">
          <MapView 
            crimes={crimeData} 
            complaints={complaintsData}
            hotspots={hotspotData}
            stateName={filters.state}
            selectedDistrict={filters.region}
            loading={loading} 
            errorMessage={error}
            selectedLocation={selectedLocation} 
            onLocationSelect={(loc) => {
               setSelectedLocation(loc);
               if (loc && loc.label) {
                 setSearchParams({ state: filters.state, district: loc.label });
               } else {
                 setSearchParams({ state: filters.state });
               }
            }} 
          />
        </div>
        <div className="flex min-h-[320px] flex-col gap-4 overflow-y-auto no-scrollbar lg:h-full lg:w-[30%]">
          {selectedDistrictData ? (
            <div className="flex-shrink-0">
              <SafetyInsights districtData={selectedDistrictData} />
            </div>
          ) : (
             <div className="bg-[#132240]/50 border border-slate-700/50 rounded-2xl p-6 text-center text-slate-400">
               Click a district monitor to view safety intelligence.
             </div>
          )}
          <div className="flex-grow">
            <HotspotCards hotspotsData={hotspotData} onSelectHotspot={handleSelectHotspot} />
          </div>
        </div>
      </section>
    </div>
  );
}
