import test from 'node:test';
import assert from 'node:assert/strict';
import {
  asMapRows,
  findCrimeForDistrict,
  findCrimeForHotspot,
  hasMapCoordinates,
  locationFromCrime,
} from '../src/services/analyticsMap.js';

// Real Maharashtra analytics row and hotspot response from the Express API.
const mumbai = {
  district: 'Mumbai', year: '2017', lat: '19.08', lng: '72.88',
  crime_score: 501808, state_name: 'Maharashtra',
};
const mumbaiHotspot = { rank: 1, area: 'Mumbai', station: 'Mumbai', count: 501808, primary_crime: 'Crime Score' };

test('asMapRows safely normalizes missing and malformed asynchronous API data', () => {
  assert.deepEqual(asMapRows(undefined), []);
  assert.deepEqual(asMapRows({ data: [] }), []);
  assert.deepEqual(asMapRows([null, mumbai, undefined]), [mumbai]);
  const rows = [mumbai];
  assert.equal(asMapRows(rows), rows);
});

test('map coordinate validation rejects missing, empty, non-numeric, and out-of-range values', () => {
  assert.equal(hasMapCoordinates(mumbai), true);
  assert.equal(hasMapCoordinates({ lat: null, lng: 72 }), false);
  assert.equal(hasMapCoordinates({ lat: '', lng: 72 }), false);
  assert.equal(hasMapCoordinates({ lat: 'not-a-coordinate', lng: 72 }), false);
  assert.equal(hasMapCoordinates({ lat: 91, lng: 72 }), false);
  assert.equal(hasMapCoordinates({ lat: 19, lng: 181 }), false);
});

test('district and hotspot selections resolve to the state-correct coordinate row', () => {
  const rows = [mumbai, { ...mumbai, state_name: 'Other State', lat: '20.1', lng: '75.2' }];
  assert.equal(findCrimeForDistrict(rows, 'Mumbai', 'Maharashtra'), mumbai);
  assert.equal(findCrimeForDistrict(rows, 'Mumbai', 'all'), null);
  assert.equal(findCrimeForHotspot(mumbaiHotspot, rows, 'Maharashtra'), mumbai);
  assert.equal(findCrimeForHotspot({ ...mumbaiHotspot, area: 'Mumbai, Maharashtra' }, rows, 'all'), mumbai);
  assert.deepEqual(locationFromCrime(mumbai), {
    lat: 19.08, lng: 72.88, label: 'Mumbai', source: 'hotspot',
  });
});
