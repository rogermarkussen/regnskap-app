import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { asyncBufferFromFile, parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';
import {
  buildDashboardRowsFromSources,
  loadCalculatedParquetFile,
  loadDashboardRowsFromParquetFiles,
  loadOperationalParquetFiles,
  mergeOperationalFileSelection,
  validateCalculatedRows,
  validateOperationalDatasets
} from '../components/task1Parquet.js';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');
const manifest = JSON.parse(await readFile(resolve(repoRoot, 'data-manifest.json'), 'utf8'));
const dataRoot = process.env.REGNSKAP_DATA_ROOT
  ? resolve(process.env.REGNSKAP_DATA_ROOT)
  : resolve(repoRoot, '../Regnskap-data');
const datasetPath = (datasetId) => resolve(dataRoot, manifest.datasets[datasetId].path);
const generatedPath = (filename) => resolve(
  dataRoot,
  'generated',
  manifest.snapshot_id,
  'oppgave1',
  'evidence',
  filename
);

test('operative filer kan samles gjennom flere filvalg', () => {
  const first = { name: 'agltransact.parquet', size: 1 };
  const second = { name: 'apltransact.parquet', size: 2 };
  const third = { name: 'apltransactvalue.parquet', size: 3 };
  const replacement = { name: 'AGLTRANSACT.PARQUET', size: 4 };

  let selected = mergeOperationalFileSelection([], [first]);
  assert.equal(selected.length, 1);
  selected = mergeOperationalFileSelection(selected, [second]);
  assert.equal(selected.length, 2);
  selected = mergeOperationalFileSelection(selected, [third]);
  assert.equal(selected.length, 3);
  selected = mergeOperationalFileSelection(selected, [replacement]);
  assert.equal(selected.length, 3);
  assert.equal(selected.find((file) => file.name.toLowerCase() === 'agltransact.parquet').size, 4);
});

const readRows = async (path) => parquetReadObjects({
  file: await asyncBufferFromFile(path),
  compressors
});

const rowKey = (row) => `${row.period_key}|${row.finansiering}|${row.metric}`;

const browserFile = async (path) => {
  const bytes = await readFile(path);
  return {
    name: basename(path),
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  };
};

const assertOptionalNumber = (actual, expected, label) => {
  if (expected === null || expected === undefined) {
    assert.equal(actual, null, label);
    return;
  }
  assert.ok(Number.isFinite(actual), `${label}: resultatet er ikke et tall`);
  assert.ok(Math.abs(actual - Number(expected)) < 1e-9, `${label}: ${actual} != ${expected}`);
};

test('nettleserberegningen gjenskaper alle KPI-radene fra operative Parquet-data', async () => {
  const [actualRows, budgetHeaderRows, budgetValueRows, allExpectedRows] = await Promise.all([
    readRows(datasetPath('common.ledger')),
    readRows(datasetPath('common.budget_header')),
    readRows(datasetPath('common.budget_values')),
    readRows(generatedPath('dashboard_kpi_calculated.parquet'))
  ]);
  const expectedRows = allExpectedRows.filter((row) => row.section_code === 'all');

  const calculatedRows = buildDashboardRowsFromSources({
    actualRows,
    budgetHeaderRows,
    budgetValueRows
  });
  const calculatedByKey = new Map(calculatedRows.map((row) => [rowKey(row), row]));

  assert.equal(calculatedRows.length, 27);
  assert.equal(expectedRows.length, 27);

  for (const expected of expectedRows) {
    const key = rowKey(expected);
    const actual = calculatedByKey.get(key);
    assert.ok(actual, `Mangler KPI-rad ${key}`);

    for (const field of [
      'hovedbok_nok1000',
      'budsjett_nok1000',
      'budsjettandel',
      'prosentverdi',
      'gjenstaar_nok1000'
    ]) {
      assertOptionalNumber(actual[field], expected[field], `${key}.${field}`);
    }
    assert.equal(actual.status, expected.status ?? null, `${key}.status`);
    assert.equal(actual.status_tekst, expected.status_tekst ?? null, `${key}.status_tekst`);
    assert.equal(actual.kommentar, expected.kommentar ?? null, `${key}.kommentar`);
  }
});

test('opplastingsflyten godtar både tre råfiler og én beregnet KPI-fil', async () => {
  const rawFiles = await Promise.all([
    browserFile(datasetPath('common.ledger')),
    browserFile(datasetPath('common.budget_header')),
    browserFile(datasetPath('common.budget_values'))
  ]);
  const calculatedFile = await browserFile(generatedPath('dashboard_kpi_calculated.parquet'));

  const [rawResult, calculatedResult] = await Promise.all([
    loadDashboardRowsFromParquetFiles(rawFiles),
    loadDashboardRowsFromParquetFiles([calculatedFile])
  ]);

  assert.equal(rawResult.length, 27);
  assert.equal(calculatedResult.length, 27);
  assert.deepEqual(
    new Set(rawResult.map((row) => row.period_key)),
    new Set(['p1_3', 'p1_4', 'p1_6'])
  );
  assert.deepEqual(
    new Set(calculatedResult.map((row) => row.period_key)),
    new Set(['p1_3', 'p1_4', 'p1_6'])
  );
});

test('de syntetiske Parquet-testfilene kan lastes gjennom samme flyt som nettleseren', async () => {
  const rawFiles = await Promise.all([
    browserFile('../testdata-opplasting/parquet/operative/agltransact.parquet'),
    browserFile('../testdata-opplasting/parquet/operative/apltransact.parquet'),
    browserFile('../testdata-opplasting/parquet/operative/apltransactvalue.parquet')
  ]);
  const calculatedFiles = await Promise.all([
    'dashboard_kpi_testdata.parquet',
    'dashboard_kpi_demo_innenfor.parquet',
    'dashboard_kpi_demo_over_budsjett.parquet'
  ].map((filename) => browserFile(`../testdata-opplasting/parquet/beregnet/${filename}`)));

  const rawResult = await loadOperationalParquetFiles(rawFiles);
  assert.equal(rawResult.length, 27);
  for (const calculatedFile of calculatedFiles) {
    const calculatedResult = await loadCalculatedParquetFile([calculatedFile]);
    assert.equal(calculatedResult.length, 27, calculatedFile.name);
  }
});

test('beregnet Parquet avvises ved duplikater og feil regelversjon', async () => {
  const expectedRows = (await readRows(generatedPath('dashboard_kpi_calculated.parquet')))
    .filter((row) => row.section_code === 'all');
  const duplicateRows = expectedRows.map((row) => ({ ...row }));
  duplicateRows[1] = { ...duplicateRows[0] };
  assert.throws(() => validateCalculatedRows(duplicateRows), /Duplikat KPI-rad/);

  const wrongVersionRows = expectedRows.map((row) => ({ ...row }));
  wrongVersionRows[0].regelversjon = 'ukontrollert-versjon';
  assert.throws(() => validateCalculatedRows(wrongVersionRows), /regelversjon 2026-08-06/);

  const wrongBudgetVersionRows = expectedRows.map((row) => ({ ...row }));
  wrongBudgetVersionRows[0].budsjettversjon = '2025B';
  assert.throws(() => validateCalculatedRows(wrongBudgetVersionRows), /budsjettversjon 2026B/);

  const inconsistentBasisRows = expectedRows.map((row) => ({ ...row }));
  const cashRow = inconsistentBasisRows.find((row) => row.prosentverdi === null);
  cashRow.grunnlag_json = JSON.stringify([{ label: 'Feil sum', value: 1 }]);
  assert.throws(() => validateCalculatedRows(inconsistentBasisRows), /stemmer ikke med grunnlaget/);
});

test('operative Parquet-filer avvises ved ugyldige beløp og koblingsnøkler', async () => {
  const datasets = {
    actual: {
      name: 'agltransact.parquet',
      rows: await readRows('../testdata-opplasting/parquet/operative/agltransact.parquet')
    },
    budgetHeader: {
      name: 'apltransact.parquet',
      rows: await readRows('../testdata-opplasting/parquet/operative/apltransact.parquet')
    },
    budgetValue: {
      name: 'apltransactvalue.parquet',
      rows: await readRows('../testdata-opplasting/parquet/operative/apltransactvalue.parquet')
    }
  };
  assert.doesNotThrow(() => validateOperationalDatasets(datasets));

  const invalidAmount = structuredClone(datasets);
  invalidAmount.actual.rows[0].amount = 'ikke-et-tall';
  assert.throws(() => validateOperationalDatasets(invalidAmount), /Ugyldig beløp/);

  const duplicateHeader = structuredClone(datasets);
  duplicateHeader.budgetHeader.rows.push({ ...duplicateHeader.budgetHeader.rows[0] });
  assert.throws(() => validateOperationalDatasets(duplicateHeader), /Duplikat trans_id/);

  const wrongVersion = structuredClone(datasets);
  wrongVersion.budgetHeader.rows.forEach((row) => { row.version = '2025B'; });
  assert.throws(() => validateOperationalDatasets(wrongVersion), /ingen rader for versjon 2026B/);

  const missingPeriod = structuredClone(datasets);
  missingPeriod.actual.rows = missingPeriod.actual.rows.filter((row) => row.period !== '202606');
  assert.throws(() => validateOperationalDatasets(missingPeriod), /dekke perioden 202601–202606/);
});
