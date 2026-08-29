import { parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

import {
  COMMON_DATA_FILES,
  requireCommonDataFiles
} from '../../../../shared/browser/localDataFolder.js';
import { buildSectionDashboardRowsFromSources } from '../../components/task1Parquet.js';

export const TASK1_LOCAL_FILES = COMMON_DATA_FILES;

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
  const files = requireCommonDataFiles(selection);
  const [actualRows, budgetHeaderRows, budgetValueRows, dimensionRows] = await Promise.all([
    readRows(files['agltransact.parquet']),
    readRows(files['apltransact.parquet']),
    readRows(files['apltransactvalue.parquet']),
    readRows(files['agldimvalue.parquet'])
  ]);
  requireColumns(actualRows, ['dim_1', 'dim_2', 'dim_4', 'account', 'period', 'amount'], 'agltransact.parquet');
  requireColumns(budgetHeaderRows, ['trans_id', 'version', 'dim_1', 'account'], 'apltransact.parquet');
  requireColumns(budgetValueRows, ['trans_id', 'period', 'amount'], 'apltransactvalue.parquet');
  const rows = buildSectionDashboardRowsFromSources({
    actualRows,
    budgetHeaderRows,
    budgetValueRows,
    dimensionRows
  });
  if (!rows.length) throw new Error('KPI-filen er tom');
  const dates = actualRows.map((row) => String(row.trans_date ?? '')).filter(Boolean).sort();
  const metadata = [{
    datasett_id_kort: selection.folderName,
    hovedbok_siste_transaksjonsdato: dates.at(-1),
    hovedbok_kilde: 'agltransact.parquet',
    budsjett_kilde: 'apltransact.parquet + apltransactvalue.parquet',
    snapshot_status: 'Beregnet lokalt fra den valgte fellesmappen'
  }];
  return { rows, metadata, folderName: selection.folderName };
};
