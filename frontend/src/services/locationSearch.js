const PHOTON_API = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_API = 'https://photon.komoot.io/reverse/';
const INDIA_BIAS = { lat: 22.9734, lon: 78.6569, zoom: 4 };

export function isValidCoordinates(lat, lon) {
  return lat !== null && lat !== undefined && lat !== ''
    && lon !== null && lon !== undefined && lon !== ''
    && Number.isFinite(Number(lat))
    && Number.isFinite(Number(lon))
    && Number(lat) >= -90 && Number(lat) <= 90
    && Number(lon) >= -180 && Number(lon) <= 180;
}

function uniqueParts(parts) {
  const seen = new Set();
  return parts.filter(Boolean).filter((part) => {
    const key = String(part).trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizePhotonFeature(feature) {
  const coordinates = feature?.geometry?.coordinates;
  const [longitude, latitude] = Array.isArray(coordinates) ? coordinates : [];
  if (!isValidCoordinates(latitude, longitude)) return null;

  const properties = feature.properties || {};
  const name = properties.name || properties.locality || properties.city || properties.district || properties.county || 'Unknown place';
  const district = properties.district || properties.county || properties.city_district || '';
  const city = properties.city || properties.town || properties.village || properties.municipality || properties.locality || '';
  const area = uniqueParts([district, city]).filter((part) => part.toLocaleLowerCase() !== name.toLocaleLowerCase());
  const state = properties.state || '';
  const country = properties.country || '';
  const displayName = uniqueParts([name, ...area, state, country]).join(', ');

  return {
    name,
    district: district || city,
    city,
    state,
    country,
    latitude: Number(latitude),
    longitude: Number(longitude),
    displayName,
    properties,
  };
}

async function readPhotonResponse(response) {
  if (!response.ok) {
    const error = new Error(`Location service returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function searchPhoton(query, { signal, limit = 6, fetchImpl = globalThis.fetch } = {}) {
  const text = String(query || '').trim();
  if (text.length < 3) return [];
  if (typeof fetchImpl !== 'function') throw new Error('Location search is unavailable in this browser.');

  const params = new URLSearchParams({
    q: text,
    limit: String(Math.min(Math.max(Number(limit) || 6, 1), 10)),
    countrycode: 'IN',
    lang: 'en',
    lat: String(INDIA_BIAS.lat),
    lon: String(INDIA_BIAS.lon),
    zoom: String(INDIA_BIAS.zoom),
  });
  const response = await fetchImpl(`${PHOTON_API}?${params}`, {
    signal,
    headers: { Accept: 'application/geo+json, application/json' },
  });
  const data = await readPhotonResponse(response);
  return (Array.isArray(data.features) ? data.features : [])
    .map(normalizePhotonFeature)
    .filter(Boolean);
}

export async function reverseGeocodePhoton(latitude, longitude, { signal, fetchImpl = globalThis.fetch } = {}) {
  if (!isValidCoordinates(latitude, longitude)) {
    throw new RangeError('Latitude or longitude is outside the valid coordinate range.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('Location search is unavailable in this browser.');

  const params = new URLSearchParams({
    lat: String(Number(latitude)),
    lon: String(Number(longitude)),
    lang: 'en',
  });
  const response = await fetchImpl(`${PHOTON_REVERSE_API}?${params}`, {
    signal,
    headers: { Accept: 'application/geo+json, application/json' },
  });
  const data = await readPhotonResponse(response);
  return normalizePhotonFeature(data.features?.[0]);
}
