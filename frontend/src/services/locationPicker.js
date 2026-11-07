import { isValidCoordinates, reverseGeocodePhoton } from './locationSearch.js';

export const DEFAULT_REPORT_CENTER = Object.freeze({ lat: 19.076, lng: 72.8777 });

export function selectedCoordinates(latitude, longitude, explicitlySelected = false) {
  if (!isValidCoordinates(latitude, longitude)) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (lat === 0 && lng === 0 && !explicitlySelected) return null;
  return { lat, lng };
}

export function coordinatesFromMapClick(latlng) {
  return latlng ? selectedCoordinates(latlng.lat, latlng.lng, true) : null;
}

export function coordinatesFromMarkerDrag(marker) {
  const latlng = marker?.getLatLng?.();
  return latlng ? selectedCoordinates(latlng.lat, latlng.lng, true) : null;
}

export function getReportMapView(latitude, longitude, explicitlySelected = false) {
  const point = selectedCoordinates(latitude, longitude, explicitlySelected);
  return {
    center: point || DEFAULT_REPORT_CENTER,
    zoom: point ? 14 : 11,
    hasSelection: Boolean(point),
  };
}

export function applySearchedPlace(current, place) {
  if (!place || !isValidCoordinates(place.latitude, place.longitude)) return current;
  return {
    ...current,
    location: place.displayName || current.location,
    district: place.district || place.city || current.district,
    lat: Number(place.latitude),
    lng: Number(place.longitude),
    locationSelected: true,
  };
}

export function applyReverseGeocodedPlace(current, place) {
  if (!place) return current;
  const name = place.name === 'Unknown place' ? '' : place.displayName?.trim();
  const district = place.district?.trim() || place.city?.trim();
  return {
    ...current,
    ...(name ? { location: name } : {}),
    ...(district ? { district } : {}),
  };
}

export async function reverseGeocodeSelection(latitude, longitude, geocoder = reverseGeocodePhoton) {
  const coordinates = isValidCoordinates(latitude, longitude)
    ? { lat: Number(latitude), lng: Number(longitude) }
    : null;
  if (!coordinates) return { coordinates: null, place: null, status: 'invalid' };
  try {
    const place = await geocoder(coordinates.lat, coordinates.lng);
    return { coordinates, place, status: place ? 'success' : 'empty' };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return { coordinates, place: null, status: 'error', error };
  }
}
