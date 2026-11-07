import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCoordinates,
  normalizePhotonFeature,
  reverseGeocodePhoton,
  searchPhoton,
} from '../src/services/locationSearch.js';

const feature = ({ name, city, district, state = 'Maharashtra', country = 'India', coordinates = [72.8777, 19.076] } = {}) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties: { name, city, district, state, country },
});

test('normalizes Indian city, district, and locality search results with valid coordinates', async (t) => {
  const cases = [
    { query: 'Mumbai', place: feature({ name: 'Mumbai', city: 'Mumbai' }), expected: 'Mumbai, Maharashtra, India' },
    { query: 'Pune district', place: feature({ name: 'Pune', city: 'Pune', district: 'Pune' }), expected: 'Pune, Maharashtra, India' },
    { query: 'Andheri East', place: feature({ name: 'Andheri East', city: 'Mumbai', district: 'Mumbai' }), expected: 'Andheri East, Mumbai, Maharashtra, India' },
  ];

  for (const item of cases) {
    await t.test(item.query, async () => {
      let requestedUrl;
      const results = await searchPhoton(item.query, {
        fetchImpl: async (url) => {
          requestedUrl = new URL(url);
          return { ok: true, json: async () => ({ features: [item.place] }) };
        },
      });
      assert.equal(requestedUrl.origin, 'https://photon.komoot.io');
      assert.equal(requestedUrl.searchParams.get('q'), item.query);
      assert.equal(requestedUrl.searchParams.get('countrycode'), 'IN');
      assert.equal(results[0].displayName, item.expected);
      assert.equal(results[0].latitude, 19.076);
      assert.equal(results[0].longitude, 72.8777);
    });
  }
});

test('does not request Photon for a query shorter than three characters', async () => {
  let called = false;
  assert.deepEqual(await searchPhoton('  pu ', { fetchImpl: async () => { called = true; } }), []);
  assert.equal(called, false);
});

test('returns an empty list when Photon has no results', async () => {
  const results = await searchPhoton('No such local place 9218', {
    fetchImpl: async () => ({ ok: true, json: async () => ({ features: [] }) }),
  });
  assert.deepEqual(results, []);
});

test('reports network and provider failures to the caller', async (t) => {
  await t.test('network failure', async () => {
    await assert.rejects(searchPhoton('Mumbai', { fetchImpl: async () => { throw new TypeError('offline'); } }), /offline/);
  });
  await t.test('provider HTTP failure', async () => {
    await assert.rejects(searchPhoton('Mumbai', { fetchImpl: async () => ({ ok: false, status: 429 }) }), /HTTP 429/);
  });
});

test('reverse geocodes valid coordinates and rejects invalid coordinates', async (t) => {
  await t.test('reverse lookup', async () => {
    let requestedUrl;
    const place = await reverseGeocodePhoton(19.076, 72.8777, {
      fetchImpl: async (url) => {
        requestedUrl = new URL(url);
        return { ok: true, json: async () => ({ features: [feature({ name: 'Mumbai' })] }) };
      },
    });
    assert.equal(requestedUrl.pathname, '/reverse/');
    assert.equal(requestedUrl.searchParams.get('lat'), '19.076');
    assert.equal(requestedUrl.searchParams.get('lon'), '72.8777');
    assert.equal(place.displayName, 'Mumbai, Maharashtra, India');
  });
  await t.test('coordinate validation', async () => {
    assert.equal(isValidCoordinates(19.076, 72.8777), true);
    assert.equal(isValidCoordinates(91, 72.8777), false);
    await assert.rejects(reverseGeocodePhoton('', ''), RangeError);
  });
  await t.test('empty reverse result', async () => {
    assert.equal(await reverseGeocodePhoton(19.076, 72.8777, {
      fetchImpl: async () => ({ ok: true, json: async () => ({ features: [] }) }),
    }), null);
  });
});
