import { parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

import { requireLocalFiles } from '../../../../shared/browser/localDataFolder.js';

export const TASK1_LOCAL_FILES = [
  'dashboard_kpi_calculated.parquet',
  'dashboard_kpi_source_metadata.parquet'
];

const readRows = async (file) => parquetReadObjects({
  file: await file.arrayBuffer(),
  compressors
});

const requireColumns = (rows, columns, filename) => {
  const available = new Set(Object.keys(rows[0] ?? {}));
  const missing = columns.filter((column) => !available.has(column));
  if (missing.length) throw new Error(`${filename} mangler ${missing.join(', ')}`);
};

export const loadTask1Data = async (selection) => {
  const files = requireLocalFiles(selection, TASK1_LOCAL_FILES);
  const [rows, metadata] = await Promise.all([
    readRows(files['dashboard_kpi_calculated.parquet']),
    readRows(files['dashboard_kpi_source_metadata.parquet'])
  ]);
  requireColumns(
    rows,
    ['section_code', 'section_label', 'end_period', 'period_label', 'finansiering', 'metric'],
    'dashboard_kpi_calculated.parquet'
  );
  if (!rows.length) throw new Error('KPI-filen er tom');
  return { rows, metadata, folderName: selection.folderName };
};
