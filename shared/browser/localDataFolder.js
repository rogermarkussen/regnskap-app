const normalizePath = (value) => String(value ?? '').replaceAll('\\', '/').replace(/^\/+/, '');

const fileRecord = (file, path) => ({
  file,
  path: normalizePath(path || file?.webkitRelativePath || file?.name)
});

export const indexLocalFiles = (files, folderName = 'Valgt mappe') => {
  const records = Array.from(files ?? [], (file) => fileRecord(file));
  const byName = new Map();
  for (const record of records) {
    const name = record.file.name;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(record);
  }
  return { folderName, records, byName };
};

export const requireLocalFiles = (selection, requiredNames) => {
  if (!selection?.byName) throw new Error('Velg en datamappe først');
  const resolved = {};
  const missing = [];
  const duplicates = [];

  for (const name of requiredNames) {
    const matches = selection.byName.get(name) ?? [];
    if (matches.length === 0) missing.push(name);
    else if (matches.length > 1) duplicates.push(name);
    else resolved[name] = matches[0].file;
  }

  if (missing.length) {
    throw new Error(`Mappen mangler ${missing.join(', ')}`);
  }
  if (duplicates.length) {
    throw new Error(
      `Mappen inneholder flere filer med navnet ${duplicates.join(', ')}. Velg en mer avgrenset datamappe.`
    );
  }
  return resolved;
};

const collectDirectoryFiles = async (directory, prefix = '') => {
  const records = [];
  for await (const [name, handle] of directory.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'file') records.push(fileRecord(await handle.getFile(), path));
    else if (handle.kind === 'directory') records.push(...await collectDirectoryFiles(handle, path));
  }
  return records;
};

export const pickLocalDirectory = async () => {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    return null;
  }
  const handle = await window.showDirectoryPicker({ mode: 'read' });
  const records = await collectDirectoryFiles(handle);
  const selection = indexLocalFiles(records.map((record) => record.file), handle.name);
  selection.records = records;
  selection.byName = new Map();
  for (const record of records) {
    if (!selection.byName.has(record.file.name)) selection.byName.set(record.file.name, []);
    selection.byName.get(record.file.name).push(record);
  }
  return selection;
};

export const selectionFromInput = (fileList) => {
  const files = Array.from(fileList ?? []);
  const firstPath = normalizePath(files[0]?.webkitRelativePath);
  const folderName = firstPath.includes('/') ? firstPath.split('/')[0] : 'Valgt mappe';
  return indexLocalFiles(files, folderName);
};
