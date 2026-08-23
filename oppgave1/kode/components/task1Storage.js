export const ACTIVE_IMPORT_STORAGE_KEY = 'oppgave1.active-import.v1';

const STORAGE_VERSION = 1;
const ALLOWED_SOURCES = new Set([
  'upload-excel',
  'upload-operational',
  'upload-calculated'
]);

export const saveActiveImport = (storage, activeImport) => {
  if (!storage) throw new Error('Nettleserlagring er ikke tilgjengelig');
  const payload = {
    storageVersion: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    rows: activeImport.rows,
    fileName: activeImport.fileName,
    summary: activeImport.summary,
    source: activeImport.source
  };
  storage.setItem(ACTIVE_IMPORT_STORAGE_KEY, JSON.stringify(payload));
  return payload;
};

export const loadActiveImport = (storage) => {
  if (!storage) return null;
  const serialized = storage.getItem(ACTIVE_IMPORT_STORAGE_KEY);
  if (!serialized) return null;
  const payload = JSON.parse(serialized);
  if (payload?.storageVersion !== STORAGE_VERSION) {
    throw new Error('Ukjent lagringsversjon');
  }
  if (!Array.isArray(payload.rows) || !payload.rows.length) {
    throw new Error('Lagret import mangler KPI-rader');
  }
  if (!ALLOWED_SOURCES.has(payload.source)) {
    throw new Error('Lagret import har ukjent kildetype');
  }
  if (!payload.fileName || !payload.summary || !payload.savedAt) {
    throw new Error('Lagret import mangler metadata');
  }
  return payload;
};

export const clearActiveImport = (storage) => {
  storage?.removeItem(ACTIVE_IMPORT_STORAGE_KEY);
};
