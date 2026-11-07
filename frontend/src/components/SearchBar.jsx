import LocationSearch from './LocationSearch.jsx';

// Optional compact map search retained for pages that embed a Leaflet map.
export default function SearchBar({ map, onPlaceSelected }) {
  return (
    <div className="absolute left-6 top-6 z-[1000] w-[min(320px,calc(100%-3rem))]">
      <LocationSearch
        placeholder="Search a location…"
        inputClassName="w-full rounded-xl border border-slate-700/60 bg-[#0D1E38]/95 py-2 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-[#0E7C8B] focus:ring-2 focus:ring-[#0E7C8B]/40"
        onSelect={(place) => {
          map?.setView?.([place.latitude, place.longitude], 12);
          onPlaceSelected?.({ lat: place.latitude, lng: place.longitude, label: place.displayName });
        }}
      />
    </div>
  );
}
