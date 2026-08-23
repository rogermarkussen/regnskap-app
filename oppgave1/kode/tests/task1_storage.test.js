import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACTIVE_IMPORT_STORAGE_KEY,
  clearActiveImport,
  loadActiveImport,
  saveActiveImport
} from '../components/task1Storage.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
};

test('aktiv import kan lagres, lastes og fjernes lokalt', () => {
  const storage = memoryStorage();
  const saved = saveActiveImport(storage, {
    rows: [{ finansiering: '154301', tittel: 'ADK' }],
    fileName: 'test.xlsx',
    summary: '9 KPI-er · 3 rapportperioder',
    source: 'upload-excel'
  });

  assert.match(saved.savedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(loadActiveImport(storage), saved);
  clearActiveImport(storage);
  assert.equal(storage.getItem(ACTIVE_IMPORT_STORAGE_KEY), null);
  assert.equal(loadActiveImport(storage), null);
});

test('ukjent eller skadet lokal lagring avvises', () => {
  const storage = memoryStorage();
  storage.setItem(ACTIVE_IMPORT_STORAGE_KEY, '{ikke-json');
  assert.throws(() => loadActiveImport(storage), SyntaxError);

  storage.setItem(ACTIVE_IMPORT_STORAGE_KEY, JSON.stringify({
    storageVersion: 1,
    savedAt: new Date().toISOString(),
    rows: [{}],
    fileName: 'test.parquet',
    summary: 'test',
    source: 'ukjent-kilde'
  }));
  assert.throws(() => loadActiveImport(storage), /ukjent kildetype/);
});
