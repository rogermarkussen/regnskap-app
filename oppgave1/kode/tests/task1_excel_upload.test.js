import assert from 'node:assert/strict';
import test from 'node:test';
import { validateExcelRecords, validateStoredExcelRows } from '../components/task1Excel.js';

const periodRecords = (rapportperiode) => [
  ['154301', 'ADK', 800, 1000, ''],
  ['154301', 'Konsulent', 230, 300, ''],
  ['154301', 'Reise', 125, 150, ''],
  ['154301', 'Overtid', 90, 80, ''],
  ['154301', 'Lønnsandel', '', '', 0.42],
  ['154345', 'Totalt regnskap vs budsjett', 500, 750, ''],
  ['154322+045101', 'ADK', 650, 800, ''],
  ['154322+045101', 'Testlab prosjekt 7114', 120, 200, ''],
  ['154322+045101', 'Lønnsandel', '', '', 0.35]
].map(([finansiering, tittel, hovedbok, budsjett, prosent]) => ({
  rapportperiode,
  finansiering,
  tittel,
  hovedbok_nok1000: hovedbok,
  budsjett_nok1000: budsjett,
  prosentverdi: prosent,
  kommentar: ''
}));

const validRecords = () => ['Jan-mar', 'Jan-apr', 'Jan-jun'].flatMap(periodRecords);

test('Excel-import godtar ni forventede KPI-er i hver av tre perioder', () => {
  const rows = validateExcelRecords(validRecords());
  assert.equal(rows.length, 27);
  assert.deepEqual(new Set(rows.map((row) => row.period_key)), new Set(['p1_3', 'p1_4', 'p1_6']));
  assert.equal(rows.find((row) => row.tittel === 'Overtid').status, 'danger');
  assert.equal(rows.find((row) => row.tittel === 'Lønnsandel').prosentverdi, 0.42);
});

test('Excel-import avviser duplikater, ukjente KPI-er og feil felttype', () => {
  const duplicate = validRecords();
  duplicate[1] = { ...duplicate[0] };
  assert.throws(() => validateExcelRecords(duplicate), /duplikat KPI/);

  const unknown = validRecords();
  unknown[0].tittel = 'Ukjent nøkkeltall';
  assert.throws(() => validateExcelRecords(unknown), /ukjent KPI/);

  const amountInPercentage = validRecords();
  amountInPercentage[4].hovedbok_nok1000 = 42;
  assert.throws(() => validateExcelRecords(amountInPercentage), /beløpsfeltene skal være tomme/);

  const percentageInAmount = validRecords();
  percentageInAmount[0].prosentverdi = 0.8;
  assert.throws(() => validateExcelRecords(percentageInAmount), /prosentverdi skal være tom/);

  const invalidPeriod = validRecords();
  invalidPeriod[0].rapportperiode = 'Jan-mai';
  assert.throws(() => validateExcelRecords(invalidPeriod), /ugyldig rapportperiode/);
});

test('eldre lokalt lagret Excel-import migreres uten datatap', () => {
  const legacyRows = periodRecords(undefined).map(({ rapportperiode, ...row }) => ({
    ...row,
    regelversjon: 'Manuell Excel'
  }));
  const rows = validateStoredExcelRows(legacyRows);
  assert.equal(rows.length, 27);
  assert.deepEqual(new Set(rows.map((row) => row.period_key)), new Set(['p1_3', 'p1_4', 'p1_6']));
});
