import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './LeafletMap.css';

function ViewController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
  }, [center, map, zoom]);

  return null;
}

/** Reusable OpenStreetMap-backed map surface. Children may be Leaflet layers. */
export default function LeafletMap({
  center,
  zoom,
  className = '',
  children,
}) {
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl
        scrollWheelZoom
        className="h-full w-full bg-[#0D1E38]"
      >
        <ViewController center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            load: () => setTilesLoaded(true),
            tileerror: () => setTileError(true),
          }}
        />
        {children}
      </MapContainer>
      {!tilesLoaded && !tileError && (
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-lg bg-[#0A1628]/90 px-3 py-2 text-xs text-slate-300 shadow">
          Loading map tiles...
        </div>
      )}
      {tileError && !tilesLoaded && (
        <div role="status" className="absolute left-3 top-3 z-[1000] rounded-lg bg-[#0A1628]/95 px-3 py-2 text-xs text-amber-300 shadow">
          Map tiles could not be loaded. Check your connection and retry.
        </div>
      )}
    </div>
  );
}
