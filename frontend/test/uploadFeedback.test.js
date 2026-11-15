import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEGACY_API_URL,
  getLegacyApiUrl,
  getUploadErrorMessage,
  getUploadSuccessMessage,
} from '../src/services/uploadFeedback.js';

test('production CSV URL uses the Render service by default and honors Vercel configuration', () => {
  assert.equal(getLegacyApiUrl('', true), DEFAULT_LEGACY_API_URL);
  assert.equal(getLegacyApiUrl('https://custom.example/api///', true), 'https://custom.example/api');
  assert.equal(getLegacyApiUrl('', false), '');
});

test('successful processing response always produces a visible success message', () => {
  assert.equal(
    getUploadSuccessMessage({ status: 'Data processed successfully. 3 records loaded for Maharashtra.' }),
    'Data processed successfully. 3 records loaded for Maharashtra.',
  );
  assert.equal(getUploadSuccessMessage({}), 'CSV processed successfully.');
});

test('upload failures produce clear messages for auth, validation, size, service, and network errors', () => {
  assert.match(getUploadErrorMessage({ response: { status: 401 } }), /session.*expired/i);
  assert.match(getUploadErrorMessage({ response: { status: 403 } }), /administrator/i);
  assert.equal(getUploadErrorMessage({ response: { status: 400, data: { detail: 'CSV requires year, state, and district columns' } } }), 'CSV requires year, state, and district columns');
  assert.match(getUploadErrorMessage({ response: { status: 413 } }), /10 MB/);
  assert.match(getUploadErrorMessage({ response: { status: 503 } }), /temporarily unavailable/i);
  assert.match(getUploadErrorMessage({ message: 'Network Error' }), /Could not reach the CSV service/);
});
