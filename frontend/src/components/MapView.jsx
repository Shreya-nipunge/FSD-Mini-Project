import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldAlert, X } from 'lucide-react';
import L from 'leaflet';
import { Marker, Popup } from 'react-leaflet';
import './MapView.css';
import LeafletMap from './map/LeafletMap.jsx';
import MarkerClusterLayer from './map/MarkerClusterLayer.jsx';
import { asMapRows, findCrimeForDistrict, findCrimeForHotspot, hasMapCoordinates } from '../services/analyticsMap.js';

const MAP_CONFIGS = {
  'Andhra Pradesh': { center: { lat: 15.9129, lng: 79.74 }, zoom: 7 },
  'Arunachal Pradesh': { center: { lat: 28.218, lng: 94.7278 }, zoom: 7 },
  Assam: { center: { lat: 26.2006, lng: 92.9376 }, zoom: 7 },
  Bihar: { center: { lat: 25.0961, lng: 85.3131 }, zoom: 7 },
  Chhattisgarh: { center: { lat: 21.2787, lng: 81.8661 }, zoom: 7 },
  Goa: { center: { lat: 15.2993, lng: 74.124 }, zoom: 9 },
  Gujarat: { center: { lat: 22.2587, lng: 71.1924 }, zoom: 7 },
  Haryana: { center: { lat: 29.0588, lng: 76.0856 }, zoom: 8 },
  'Himachal Pradesh': { center: { lat: 31.1048, lng: 77.1734 }, zoom: 8 },
  'Jammu And Kashmir': { center: { lat: 33.7782, lng: 76.5762 }, zoom: 7 },
  Jharkhand: { center: { lat: 23.6102, lng: 85.2799 }, zoom: 7 },
  Karnataka: { center: { lat: 15.3173, lng: 75.7139 }, zoom: 7 },
  Kerala: { center: { lat: 10.8505, lng: 76.2711 }, zoom: 7 },
  'Madhya Pradesh': { center: { lat: 22.9734, lng: 78.6569 }, zoom: 6 },
  Maharashtra: { center: { lat: 19.7515, lng: 75.7139 }, zoom: 7 },
  Manipur: { center: { lat: 24.6637, lng: 93.9063 }, zoom: 8 },
  Meghalaya: { center: { lat: 25.467, lng: 91.3662 }, zoom: 8 },
  Mizoram: { center: { lat: 23.1645, lng: 92.9376 }, zoom: 8 },
  Nagaland: { center: { lat: 26.1584, lng: 94.5624 }, zoom: 8 },
  Odisha: { center: { lat: 20.9517, lng: 85.0985 }, zoom: 7 },
  Punjab: { center: { lat: 31.1471, lng: 75.3412 }, zoom: 8 },
  Rajasthan: { center: { lat: 27.0238, lng: 74.2179 }, zoom: 6 },
  Sikkim: { center: { lat: 27.533, lng: 88.5122 }, zoom: 9 },
  'Tamil Nadu': { center: { lat: 11.1271, lng: 78.6569 }, zoom: 7 },
  Telangana: { center: { lat: 18.1124, lng: 79.0193 }, zoom: 7 },
  Tripura: { center: { lat: 23.9408, lng: 91.9882 }, zoom: 8 },
  'Uttar Pradesh': { center: { lat: 26.8467, lng: 80.9462 }, zoom: 6 },
  Uttarakhand: { center: { lat: 30.0668, lng: 79.0193 }, zoom: 8 },
  'West Bengal': { center: { lat: 22.9868, lng: 87.855 }, zoom: 7 },
  'Andaman And Nicobar Islands': { center: { lat: 11.7401, lng: 92.6586 }, zoom: 6 },
  Chandigarh: { center: { lat: 30.7333, lng: 76.7794 }, zoom: 12 },
  'The Dadra And Nagar Haveli And Daman And Diu': { center: { lat: 20.1809, lng: 73.0169 }, zoom: 9 },
  Delhi: { center: { lat: 28.7041, lng: 77.1025 }, zoom: 10 },
  Lakshadweep: { center: { lat: 10.5667, lng: 72.6417 }, zoom: 8 },
  Puducherry: { center: { lat: 11.9416, lng: 79.8083 }, zoom: 10 },
  Ladakh: { center: { lat: 34.1526, lng: 77.577 }, zoom: 7 },
  all: { center: { lat: 20.5937, lng: 78.9629 }, zoom: 5 },
};

const EMPTY_ARRAY = [];
const haversine = (lat1, lon1, lat2, lon2) => {
  const radius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function crimeIcon(crime, minScore, maxScore, hasAlert) {
  const score = Number(crime.crime_score);
  const normalized = Number.isFinite(score) ? (score - minScore) / ((maxScore - minScore) || 1) : 0;
  const color = normalized > 0.66 ? '#ef4444' : normalized > 0.33 ? '#f97316' : '#eab308';
  const size = Math.min(Math.max((normalized * 25) + 20, 20), 45);
  const alert = hasAlert
    ? `<circle cx="${size + 13}" cy="8" r="8" fill="#ef4444" stroke="white" stroke-width="1.5"/><text x="${size + 13}" y="11" fill="white" text-anchor="middle" font-size="8" font-weight="bold">!</text>`
    : '';
  const slowResponse = crime.admin_responsiveness === 'LOW'
    ? `<circle cx="7" cy="8" r="8" fill="#f97316" stroke="white" stroke-width="1.5"/><text x="7" y="11" fill="white" text-anchor="middle" font-size="8" font-weight="bold">!</text>`
    : '';
  const html = `<svg width="${size + 26}" height="${size + 20}" viewBox="0 0 ${size + 26} ${size + 20}" xmlns="http://www.w3.org/2000/svg"><circle cx="${(size + 26) / 2}" cy="${(size + 20) / 2}" r="${size / 2}" fill="${color}" fill-opacity=".3"><animate attributeName="r" from="${size / 2.5}" to="${size / 2.1}" dur="1.5s" repeatCount="indefinite"/><animate attributeName="fill-opacity" from=".4" to=".1" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="${(size + 26) / 2}" cy="${(size + 20) / 2}" r="${size / 3}" fill="${color}" stroke="white" stroke-width="2"/>${alert}${slowResponse}</svg>`;
  return L.divIcon({ className: 'crime-map-marker', html, iconSize: [size + 26, size + 20], iconAnchor: [(size + 26) / 2, (size + 20) / 2] });
}

function complaintIcon(status) {
  const color = status === 'VERIFIED' || status === 'resolved'
    ? '#10b981'
    : status === 'UNDER_REVIEW' ? '#3b82f6' : '#a855f7';
  const html = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="6" fill="${color}" stroke="white" stroke-width="2"/></svg>`;
  return L.divIcon({ className: 'complaint-map-marker', html, iconSize: [18, 18], iconAnchor: [9, 9] });
}

function ReportDetails({ selectedMarker, stateName, minScore, maxScore, rankedCrimes, onClose }) {
  return (
    <div className="min-w-[260px] max-w-[310px] p-1 text-white">
      <button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} className="absolute right-2 top-2 rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white" aria-label="Close map details"><X size={14} /></button>
      {selectedMarker.type === 'complaint' ? (
        <>
          <div className="mb-3 flex items-center justify-between border-b border-slate-700/50 pb-3 pr-8">
            <h4 className="m-0 flex-1 text-sm font-black uppercase text-slate-100">{selectedMarker.crime_type || selectedMarker.category || selectedMarker.title}</h4>
            <span className={`ml-2 rounded border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${selectedMarker.status === 'VERIFIED' || selectedMarker.status === 'resolved' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : selectedMarker.status === 'UNDER_REVIEW' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-purple-500/20 bg-purple-500/10 text-purple-400'}`}>{selectedMarker.status}</span>
          </div>
          <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            {selectedMarker.share_description !== false && selectedMarker.description
              ? <p className="text-xs italic text-slate-300">“{selectedMarker.description}”</p>
              : <p className="p-1 text-[10px] italic text-slate-500">Citizen chose to keep description private.</p>}
          </div>
          <div className="flex flex-col items-start space-y-1.5 rounded bg-slate-900/30 p-2 text-[10px] text-slate-500">
            <div className="flex"><span className="w-10 font-bold text-slate-400">By:</span><span className="italic text-slate-300">Classified Citizen</span></div>
            <div className="flex"><span className="w-10 font-bold text-slate-400">Loc:</span><span className="line-clamp-1 text-slate-300">{selectedMarker.district || selectedMarker.location}</span></div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between border-b border-slate-700/50 pb-2 pr-8">
            <h4 className="m-0 text-[15px] font-black uppercase tracking-wider text-white">{selectedMarker.district}</h4>
            <div className="flex items-center gap-1.5">
              {selectedMarker.hotspotRank && <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-orange-300">Hotspot #{selectedMarker.hotspotRank}</span>}
              <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-300">{selectedMarker.state_name || stateName}</span>
            </div>
          </div>
          {selectedMarker.hasAlert && selectedMarker.alertDetails && <div className="mb-4 flex w-full items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-500" /><div><p className="text-[11px] font-black uppercase tracking-wider text-red-400">Under-Reporting Alert</p><p className="mt-1 text-[10px] leading-relaxed text-red-300">System variance detected. High citizen reporting volume compared to official records. {selectedMarker.alertDetails.signal_strength ? `(Signal Strength: ${selectedMarker.alertDetails.signal_strength}/100)` : ''}</p></div></div>}
          {selectedMarker.admin_responsiveness === 'LOW' && <div className="animate-in fade-in zoom-in mb-4 flex w-full items-start gap-3 rounded-lg border border-orange-500/20 bg-orange-500/10 p-3 duration-300"><span className="mt-0.5 shrink-0 text-xl" aria-hidden="true">⚠️</span><div><p className="text-[11px] font-black uppercase tracking-wider text-orange-400">Administrative Bottleneck</p><p className="mt-1 text-[10px] leading-relaxed text-orange-300">The system has flagged a severe backlog of citizen intel items in this jurisdiction that have not been addressed. The active intelligence response rate is critically low at <span className="rounded bg-orange-500/20 px-1 font-mono font-bold text-orange-200">{((selectedMarker.response_rate || 0) * 100).toFixed(1)}%</span>.</p></div></div>}
          <div className="mb-4 flex w-full items-stretch gap-2">
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-700/50 bg-slate-900/80 p-3"><div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Safety Index</div><div className="text-xl font-black text-slate-100">{Math.max(0, 100 - Math.min(100, Math.floor(((Number(selectedMarker.crime_score) - minScore) / (maxScore - minScore || 1)) * 100)))}<span className="ml-0.5 text-[11px] text-slate-500">/100</span></div></div>
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-slate-700/50 bg-slate-900/80 p-3"><div className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Regional Rank</div><div className="mt-0.5 text-sm font-black text-blue-400">#{rankedCrimes.findIndex((crime) => crime.district === selectedMarker.district) + 1}<span className="ml-1 text-xs font-bold text-slate-500">of {rankedCrimes.length}</span></div></div>
          </div>
          <div className="mb-1 w-full"><div className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Crime Breakdown</div><div className="grid w-full grid-cols-2 gap-2">{['murder', 'rape', 'robbery', 'thefts', 'burglary', 'cheating'].map((key) => selectedMarker[key] !== undefined && selectedMarker[key] > 0 && <div key={key} className="flex items-center justify-between rounded border border-slate-800/50 bg-slate-900/30 px-2.5 py-1.5 text-[10px]"><span className="font-medium capitalize text-slate-400">{key}</span><span className="font-bold text-slate-100">{selectedMarker[key]}</span></div>)}</div></div>
        </>
      )}
    </div>
  );
}

export default function MapView({ crimes = EMPTY_ARRAY, complaints = EMPTY_ARRAY, hotspots = EMPTY_ARRAY, stateName, selectedDistrict = '', loading, errorMessage = '', selectedLocation, onLocationSelect, gapAlerts = EMPTY_ARRAY }) {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [view, setView] = useState(MAP_CONFIGS[stateName] || MAP_CONFIGS.all);
  const crimeRows = useMemo(() => asMapRows(crimes), [crimes]);
  const complaintRows = useMemo(() => asMapRows(complaints), [complaints]);
  const hotspotRows = useMemo(() => asMapRows(hotspots), [hotspots]);
  const alertRows = useMemo(() => asMapRows(gapAlerts), [gapAlerts]);

  const { minScore, maxScore, rankedCrimes } = useMemo(() => {
    const scores = crimeRows.map((crime) => Number(crime.crime_score)).filter(Number.isFinite);
    if (!scores.length) return { minScore: 0, maxScore: 1, rankedCrimes: [] };
    return {
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      rankedCrimes: [...crimeRows].sort((a, b) => Number(a.crime_score) - Number(b.crime_score)),
    };
  }, [crimeRows]);

  const validCrimes = useMemo(() => crimeRows.filter(hasMapCoordinates), [crimeRows]);
  const validComplaints = useMemo(() => complaintRows.filter((report) => hasMapCoordinates(report) && !['rejected', 'REJECTED'].includes(report.status)), [complaintRows]);

  useEffect(() => {
    if (!selectedLocation) {
      setView(MAP_CONFIGS[stateName] || MAP_CONFIGS.all);
      return;
    }
    if (!hasMapCoordinates(selectedLocation)) return;
    setView({ center: { lat: Number(selectedLocation.lat), lng: Number(selectedLocation.lng) }, zoom: 12 });

    if (!selectedLocation.label || !crimeRows.length || selectedLocation.source === 'map_click') return;
    let match = validCrimes.find((crime) => Math.abs(Number(crime.lat) - Number(selectedLocation.lat)) < 0.001
      && Math.abs(Number(crime.lng) - Number(selectedLocation.lng)) < 0.001)
      || findCrimeForDistrict(validCrimes, selectedLocation.label, stateName)
      || validCrimes.find((crime) => crime.district?.toLowerCase() === selectedLocation.label.toLowerCase()
        || selectedLocation.label.toLowerCase().includes(crime.district?.toLowerCase()));
    let nearbyComplaint = null;
    if (!match) {
      nearbyComplaint = validComplaints
        .filter((report) => haversine(Number(selectedLocation.lat), Number(selectedLocation.lng), Number(report.lat), Number(report.lng)) < 15)
        .sort((a, b) => haversine(Number(selectedLocation.lat), Number(selectedLocation.lng), Number(a.lat), Number(a.lng)) - haversine(Number(selectedLocation.lat), Number(selectedLocation.lng), Number(b.lat), Number(b.lng)))[0] || null;
      if (!nearbyComplaint) {
        match = [...validCrimes].sort((a, b) => haversine(Number(selectedLocation.lat), Number(selectedLocation.lng), Number(a.lat), Number(a.lng)) - haversine(Number(selectedLocation.lat), Number(selectedLocation.lng), Number(b.lat), Number(b.lng)))[0];
        if (match) setView({ center: { lat: Number(match.lat), lng: Number(match.lng) }, zoom: 12 });
      }
    }
    if (nearbyComplaint) setSelectedMarker({ ...nearbyComplaint, type: 'complaint' });
    else if (match) {
      const alert = alertRows.find((item) => item.district === match.district);
      const hotspot = hotspotRows.find((spot) => findCrimeForHotspot(spot, [match], stateName));
      setSelectedMarker({ ...match, type: 'crime', hotspotRank: hotspot?.rank, hasAlert: Boolean(alert), alertDetails: alert });
    }
  }, [selectedLocation, stateName, crimeRows, validCrimes, validComplaints, alertRows, hotspotRows]);

  useEffect(() => {
    if (!selectedDistrict) return;
    const match = findCrimeForDistrict(validCrimes, selectedDistrict, stateName);
    if (!match) return;
    const hotspot = hotspotRows.find((spot) => findCrimeForHotspot(spot, [match], stateName));
    setSelectedMarker({ ...match, type: 'crime', hotspotRank: hotspot?.rank });
    setView({ center: { lat: Number(match.lat), lng: Number(match.lng) }, zoom: 12 });
  }, [selectedDistrict, stateName, validCrimes, hotspotRows]);

  useEffect(() => {
    if (!selectedMarker) return;
    const rows = selectedMarker.type === 'complaint' ? validComplaints : validCrimes;
    const visible = rows.some((row) => selectedMarker.id != null
      ? row.id === selectedMarker.id
      : selectedMarker.type === 'complaint'
        ? Number(row.lat) === Number(selectedMarker.lat) && Number(row.lng) === Number(selectedMarker.lng)
        : row.district === selectedMarker.district && (row.state_name || stateName) === (selectedMarker.state_name || stateName));
    if (!visible) setSelectedMarker(null);
  }, [selectedMarker, validCrimes, validComplaints, stateName]);

  const chooseCrime = (crime) => {
    const alert = alertRows.find((item) => item.district === crime.district);
    const hotspot = hotspotRows.find((spot) => findCrimeForHotspot(spot, [crime], stateName));
    setSelectedMarker({ ...crime, type: 'crime', hotspotRank: hotspot?.rank, hasAlert: Boolean(alert), alertDetails: alert });
    onLocationSelect?.({ lat: Number(crime.lat), lng: Number(crime.lng), label: crime.district, source: 'map_click' });
  };
  const chooseComplaint = (report) => {
    setSelectedMarker({ ...report, type: 'complaint' });
    onLocationSelect?.({ lat: Number(report.lat), lng: Number(report.lng), label: report.district || report.location, source: 'map_click' });
  };
  const closeDetails = () => { setSelectedMarker(null); onLocationSelect?.(null); };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-700/30 shadow-2xl">
      <LeafletMap center={view.center} zoom={view.zoom}>
        <MarkerClusterLayer chunkedLoading maxClusterRadius={42} showCoverageOnHover={false}>
        {validCrimes.map((crime, index) => {
          const marker = { ...crime, type: 'crime', _mapKey: `crime-${crime.id ?? crime.district ?? index}` };
          const alert = gapAlerts.some((item) => item.district === crime.district);
          const selected = selectedMarker?.type === 'crime' && (selectedMarker.id != null ? selectedMarker.id === crime.id : selectedMarker.district === crime.district);
          return <Marker key={marker._mapKey} position={[Number(crime.lat), Number(crime.lng)]} icon={crimeIcon(crime, minScore, maxScore, alert)} title={crime.district || 'Crime location'} eventHandlers={{ click: () => chooseCrime(crime) }}>{selected && <Popup closeButton={false} closeOnClick={false} autoPan className="crime-detail-popup"><ReportDetails selectedMarker={selectedMarker} stateName={stateName} minScore={minScore} maxScore={maxScore} rankedCrimes={rankedCrimes} onClose={closeDetails} /></Popup>}</Marker>;
        })}
        {validComplaints.map((report, index) => {
          const key = `report-${report.id ?? report.report_id ?? index}`;
          const selected = selectedMarker?.type === 'complaint' && (selectedMarker.id != null ? selectedMarker.id === report.id : selectedMarker.report_id != null ? selectedMarker.report_id === report.report_id : selectedMarker.lat === report.lat && selectedMarker.lng === report.lng);
          return <Marker key={key} position={[Number(report.lat), Number(report.lng)]} icon={complaintIcon(report.status)} title={report.crime_type || report.category || 'Citizen report'} zIndexOffset={100} eventHandlers={{ click: () => chooseComplaint(report) }}>{selected && <Popup closeButton={false} closeOnClick={false} autoPan className="crime-detail-popup"><ReportDetails selectedMarker={selectedMarker} stateName={stateName} minScore={minScore} maxScore={maxScore} rankedCrimes={rankedCrimes} onClose={closeDetails} /></Popup>}</Marker>;
        })}
        </MarkerClusterLayer>
      </LeafletMap>
      {loading && <div className="pointer-events-none absolute inset-0 z-[900] flex flex-col items-center justify-center space-y-4 bg-[#0D1E38]/35"><Loader2 className="animate-spin text-blue-500" size={32} /><p className="animate-pulse text-sm font-medium text-slate-300">Loading geospatial data…</p></div>}
      {!loading && errorMessage && <div role="alert" className="absolute left-1/2 top-4 z-[1000] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-lg border border-red-500/30 bg-[#0A1628]/95 px-4 py-3 text-sm text-red-300 shadow-xl">{errorMessage}</div>}
      {!loading && !errorMessage && validCrimes.length === 0 && validComplaints.length === 0 && <div role="status" className="pointer-events-none absolute left-1/2 top-1/2 z-[700] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-[#0A1628]/95 px-5 py-3 text-center text-sm text-slate-300 shadow-xl">No mapped crime data matches these filters.</div>}
      <div className="pointer-events-none absolute bottom-4 right-4 z-[800] min-w-[190px] animate-in fade-in slide-in-from-right-4 rounded-2xl border border-slate-700 bg-[#0D1E38]/95 p-4 shadow-2xl backdrop-blur-md duration-1000 lg:bottom-6 lg:right-6">
        <h4 className="mb-3 border-b border-slate-700/50 pb-2 text-[11px] font-black uppercase tracking-widest text-slate-300">Intelligence Legend</h4>
        <div className="space-y-4"><div><span className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">Official Crime Intensity</span><div className="space-y-2">{[['#ef4444', 'Critical Risk (Top 33%)'], ['#f97316', 'Elevated Risk (Mid 33%)'], ['#eab308', 'Moderate Risk (Bottom 33%)']].map(([color, label]) => <div key={color} className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /><span className="text-[10px] font-semibold text-slate-200">{label}</span></div>)}</div></div><div><span className="mb-2 block border-t border-slate-700/50 pt-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">Citizen Core Reporting</span><div className="flex flex-col space-y-2 pl-0.5">{[['#a855f7', 'Unverified (Raw)'], ['#3b82f6', 'Under Review'], ['#10b981', 'Verified Intel']].map(([color, label]) => <div key={color} className="flex items-center gap-2"><div className="h-3 w-2 rounded-full border border-slate-900" style={{ backgroundColor: color }} /><span className="text-[10px] font-semibold text-slate-200">{label}</span></div>)}</div></div></div>
      </div>
    </div>
  );
}
