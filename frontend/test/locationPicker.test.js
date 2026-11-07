import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhotonFeature } from '../src/services/locationSearch.js';
import {
  applyReverseGeocodedPlace,
  applySearchedPlace,
  coordinatesFromMapClick,
  coordinatesFromMarkerDrag,
  getReportMapView,
  reverseGeocodeSelection,
  selectedCoordinates,
} from '../src/services/locationPicker.js';

// Captured from Photon live responses for Andheri East, Mumbai and nearby reverse lookup.
const searchPlace = normalizePhotonFeature({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [72.854202, 19.1158835] },
  properties: {
    name: 'Andheri East', city: 'Mumbai', district: 'K/E Ward',
    state: 'Maharashtra', country: 'India', countrycode: 'IN',
  },
});

const reversePlace = normalizePhotonFeature({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [72.8778333, 19.0761715] },
  properties: {
    name: 'Janata Tawa Grill', district: 'L Ward', city: 'Mumbai',
    county: 'Mumbai Suburban District', state: 'Maharashtra', country: 'India', countrycode: 'IN',
  },
});

test('starts at Mumbai until a valid selected coordinate exists', () => {
  assert.deepEqual(getReportMapView(0, 0), {
    center: { lat: 19.076, lng: 72.8777 }, zoom: 11, hasSelection: false,
  });
  assert.deepEqual(getReportMapView(19.1158835, 72.854202), {
    center: { lat: 19.1158835, lng: 72.854202 }, zoom: 14, hasSelection: true,
  });
});

test('map click and marker drag use the selected marker coordinates', () => {
  const clickedPoint = coordinatesFromMapClick({ lat: 19.1158835, lng: 72.854202 });
  const draggedPoint = coordinatesFromMarkerDrag({ getLatLng: () => ({ lat: 19.0761715, lng: 72.8778333 }) });
  assert.deepEqual(clickedPoint, { lat: 19.1158835, lng: 72.854202 });
  assert.deepEqual(draggedPoint, { lat: 19.0761715, lng: 72.8778333 });
  assert.deepEqual(getReportMapView(draggedPoint.lat, draggedPoint.lng, true).center, draggedPoint);
});

test('Photon search selection synchronizes address, district, coordinates, and map center', () => {
  const report = applySearchedPlace({ location: '', district: '', lat: 0, lng: 0 }, searchPlace);
  assert.equal(report.location, 'Andheri East, K/E Ward, Mumbai, Maharashtra, India');
  assert.equal(report.district, 'K/E Ward');
  assert.equal(report.lat, 19.1158835);
  assert.equal(report.lng, 72.854202);
  assert.equal(report.locationSelected, true);
  assert.deepEqual(getReportMapView(report.lat, report.lng, report.locationSelected).center, {
    lat: 19.1158835, lng: 72.854202,
  });
});

test('reverse geocoding enriches address fields without changing selected coordinates', () => {
  const selected = { location: '', district: '', lat: 19.0761715, lng: 72.8778333, locationSelected: true };
  const resolved = applyReverseGeocodedPlace(selected, reversePlace);
  assert.equal(resolved.location, 'Janata Tawa Grill, L Ward, Mumbai, Maharashtra, India');
  assert.equal(resolved.district, 'L Ward');
  assert.equal(resolved.lat, selected.lat);
  assert.equal(resolved.lng, selected.lng);
});

test('reverse lookup failure retains selected coordinates and invalid coordinates are rejected', async () => {
  const result = await reverseGeocodeSelection(19.0761715, 72.8778333, async () => {
    throw new Error('Photon unavailable');
  });
  assert.equal(result.status, 'error');
  assert.deepEqual(result.coordinates, { lat: 19.0761715, lng: 72.8778333 });
  assert.equal(selectedCoordinates(Number.NaN, 72.8778333, true), null);
  assert.equal(selectedCoordinates(91, 72.8778333, true), null);
  assert.equal(selectedCoordinates(0, 0), null);
  assert.deepEqual(selectedCoordinates(0, 0, true), { lat: 0, lng: 0 });
});
