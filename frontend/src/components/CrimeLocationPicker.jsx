import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleDot, Loader2, MapPinned } from 'lucide-react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import LeafletMap from './map/LeafletMap.jsx';
import {
  applyReverseGeocodedPlace,
  coordinatesFromMapClick,
  coordinatesFromMarkerDrag,
  getReportMapView,
  reverseGeocodeSelection,
  selectedCoordinates,
} from '../services/locationPicker.js';
import { reverseGeocodePhoton } from '../services/locationSearch.js';

const selectedMarkerIcon = L.divIcon({
  className: 'report-location-marker',
  html: '<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M17 1C8.7 1 2 7.7 2 16c0 11.1 15 25 15 25s15-13.9 15-25C32 7.7 25.3 1 17 1Z" fill="#2563eb" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="16" r="5" fill="#fff"/></svg>',
  iconSize: [34, 42],
  iconAnchor: [17, 40],
});

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      const coordinates = coordinatesFromMapClick(event.latlng);
      if (coordinates) onSelect(coordinates.lat, coordinates.lng);
    },
  });
  return null;
}

export default function CrimeLocationPicker({
  latitude,
  longitude,
  hasSelectedLocation = false,
  onCoordinatesChange,
  onAddressResolved,
}) {
  const [reverseStatus, setReverseStatus] = useState('idle');
  const requestSequence = useRef(0);
  const addressCallback = useRef(onAddressResolved);
  addressCallback.current = onAddressResolved;

  const view = useMemo(() => getReportMapView(latitude, longitude, hasSelectedLocation), [latitude, longitude, hasSelectedLocation]);
  const point = selectedCoordinates(latitude, longitude, hasSelectedLocation);

  useEffect(() => {
    if (!point) {
      requestSequence.current += 1;
      setReverseStatus('idle');
      return undefined;
    }

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setReverseStatus('loading');

    reverseGeocodeSelection(point.lat, point.lng, (lat, lng) => (
      reverseGeocodePhoton(lat, lng, { signal: controller.signal })
    )).then((result) => {
      if (sequence !== requestSequence.current) return;
      if (result.place) addressCallback.current?.((current) => applyReverseGeocodedPlace(current, result.place));
      setReverseStatus(result.status);
    }).catch((error) => {
      if (error?.name === 'AbortError' || sequence !== requestSequence.current) return;
      setReverseStatus('error');
    });

    return () => {
      controller.abort();
      requestSequence.current += 1;
    };
  }, [point?.lat, point?.lng]);

  const selectPoint = (lat, lng) => {
    const next = selectedCoordinates(lat, lng, true);
    if (!next) return;
    onCoordinatesChange?.(next);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4" aria-label="Choose incident location on map">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <MapPinned size={17} className="shrink-0 text-blue-400" />
          <span>Pin the incident location</span>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <CircleDot size={13} className="text-blue-400" /> Click the map or drag the pin to adjust.
        </p>
      </div>

      <div className="h-64 overflow-hidden rounded-lg border border-slate-700 sm:h-72">
        <LeafletMap center={view.center} zoom={view.zoom}>
          <MapClickHandler onSelect={selectPoint} />
          {point && (
            <Marker
              position={[point.lat, point.lng]}
              icon={selectedMarkerIcon}
              draggable
              eventHandlers={{
                dragend(event) {
                  const position = coordinatesFromMarkerDrag(event.target);
                  if (position) selectPoint(position.lat, position.lng);
                },
              }}
            >
              <Popup>Selected report location</Popup>
            </Marker>
          )}
        </LeafletMap>
      </div>

      {point ? (
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-slate-300" aria-live="polite">
            <span>Latitude: {point.lat.toFixed(6)}</span>
            <span>Longitude: {point.lng.toFixed(6)}</span>
          </div>
          <div className="min-h-5 text-xs" aria-live="polite">
            {reverseStatus === 'loading' && <span className="flex items-center gap-1.5 text-blue-300"><Loader2 size={13} className="animate-spin" /> Looking up address…</span>}
            {reverseStatus === 'success' && <span className="text-emerald-300">Address details updated.</span>}
            {reverseStatus === 'empty' && <span className="text-amber-300">No address found; coordinates are saved.</span>}
            {reverseStatus === 'error' && <span className="text-amber-300">Address lookup failed; coordinates are still saved.</span>}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Choose a point on the map or select a Photon search result. The map starts near Mumbai.</p>
      )}
    </section>
  );
}
