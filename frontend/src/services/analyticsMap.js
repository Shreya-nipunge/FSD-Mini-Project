const EMPTY_MAP_ROWS = Object.freeze([]);

export function asMapRows(value) {
  if (!Array.isArray(value)) return EMPTY_MAP_ROWS;
  return value.every((row) => row && typeof row === 'object')
    ? value
    : value.filter((row) => row && typeof row === 'object');
}

export function hasMapCoordinates(item) {
  const latitude = item?.lat ?? item?.latitude;
  const longitude = item?.lng ?? item?.longitude;
  if (latitude === null || latitude === undefined || latitude === ''
    || longitude === null || longitude === undefined || longitude === '') return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

const normalized = (value) => String(value || '').trim().toLocaleLowerCase();

export function findCrimeForDistrict(crimes, district, stateName = 'all') {
  const targetDistrict = normalized(district);
  if (!targetDistrict) return null;
  const matching = crimes.filter((crime) => normalized(crime.district) === targetDistrict
    && (stateName === 'all' || !stateName || normalized(crime.state_name || stateName) === normalized(stateName)));
  return matching.length === 1 ? matching[0] : null;
}

export function findCrimeForHotspot(spot, crimes, stateName = 'all') {
  const [districtPart, ...stateParts] = String(spot?.area || '').split(',');
  const district = normalized(districtPart);
  const hotspotState = normalized(stateParts.join(',')) || (stateName !== 'all' ? normalized(stateName) : '');
  if (!district) return null;
  return crimes.find((crime) => normalized(crime.district) === district
    && (!hotspotState || normalized(crime.state_name || stateName) === hotspotState)
    && hasMapCoordinates(crime)) || null;
}

export function locationFromCrime(crime, source = 'hotspot') {
  if (!hasMapCoordinates(crime)) return null;
  return {
    lat: Number(crime.lat ?? crime.latitude),
    lng: Number(crime.lng ?? crime.longitude),
    label: crime.district,
    source,
  };
}
