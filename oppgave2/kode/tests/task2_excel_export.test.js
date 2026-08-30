import assert from 'node:assert/strict';
import test from 'node:test';

import { unzipSync } from 'fflate';
import writeExcelFile from 'write-excel-file/node';

import {
  createTask2WorkbookSheets,
  selectTask2ExportRows,
  task2WorkbookFilename
} from '../src/lib/task2ExcelExport.js';

const decode = (value) => new TextDecoder().decode(value);

const account = (overrides) => ({
  row_type: 'account',
  hovedgruppe: 'Lønnskostnader',
  parent_group_key: 'lonn-fast',
  konto: '5000',
  konto_navn: 'Fast lønn',
  radtekst: '5000 – Fast lønn',
  virksomhet_budsjett_tusen: 40,
  hovedbok_tusen: 42,
  avvik_tusen: -2,
  aarets_budsjett_tusen: 160,
  forbruk_av_aarets_budsjett: 0.2625,
  investeringsbudsjett_tusen: 0,
  investeringsregnskap_tusen: 0,
  budsjett_01_tusen: 13,
  budsjett_02_tusen: 14,
  kontant_budsjett_tusen: 0,
  kontant_tusen: 38,
  kontant_avvik_tusen: -38,
  ...overrides
});

const reportRows = [
  { row_type: 'section', hovedgruppe: 'Lønnskostnader', radtekst: 'Lønnskostnader' },
  { row_type: 'group', hovedgruppe: 'Lønnskostnader', group_key: 'lonn-fast', radtekst: 'Fast lønn' },
  account({}),
  account({
    konto: '5050',
    konto_navn: 'Overtid',
    radtekst: '5050 – Overtid',
    hovedbok_tusen: 8,
    virksomhet_budsjett_tusen: 10,
    avvik_tusen: 2,
    aarets_budsjett_tusen: 40,
    forbruk_av_aarets_budsjett: 0.2,
    budsjett_01_tusen: 3,
    budsjett_02_tusen: 4,
    kontant_tusen: 7,
    kontant_avvik_tusen: -7
  }),
  { row_type: 'total', hovedgruppe: 'Lønnskostnader', radtekst: 'Totale lønnskostnader' },
  { row_type: 'section', hovedgruppe: 'Andre driftskostnader', radtekst: 'Andre driftskostnader' },
  { row_type: 'group', hovedgruppe: 'Andre driftskostnader', group_key: 'andre-reise', radtekst: 'Reisekostnader' },
  account({
    hovedgruppe: 'Andre driftskostnader',
    parent_group_key: 'andre-reise',
    konto: '7130',
    konto_navn: 'Reisekostnader',
    radtekst: '7130 – Reisekostnader'
  }),
  { row_type: 'total', hovedgruppe: 'Andre driftskostnader', radtekst: 'Totale andre driftskostnader' }
];

test('eksportutvalget tar med full kontostruktur uavhengig av lukkede grupper', () => {
  const rows = selectTask2ExportRows(reportRows, {
    mainGroup: 'Lønnskostnader',
    search: ''
  });

  assert.deepEqual(rows.map((row) => row.row_type), [
    'section', 'group', 'account', 'account', 'total', 'grand_total'
  ]);
  assert.equal(rows.find((row) => row.row_type === 'group').hovedbok_tusen, 50);
  assert.equal(rows.find((row) => row.row_type === 'total').aarets_budsjett_tusen, 200);
  assert.equal(rows.at(-1).radtekst, 'Driftskostnader');
});

test('søk i eksporten beholder foreldre og summerer bare treffene', () => {
  const rows = selectTask2ExportRows(reportRows, {
    mainGroup: 'alle',
    search: '5050'
  });

  assert.deepEqual(rows.map((row) => row.row_type), [
    'section', 'group', 'account', 'total', 'grand_total'
  ]);
  assert.equal(rows.find((row) => row.row_type === 'account').konto, '5050');
  assert.equal(rows.find((row) => row.row_type === 'group').hovedbok_tusen, 8);
  assert.equal(rows.at(-1).hovedbok_tusen, 8);
});

test('Excel-eksporten lager én formatert rapportfane med metadata og full visning', async () => {
  const rows = selectTask2ExportRows(reportRows, { mainGroup: 'alle', search: '' });
  const sheets = createTask2WorkbookSheets({
    rows,
    periodText: 'Januar–mars 2026',
    monthLabels: ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'],
    metadata: [
      { label: 'Finansiering', value: '154301' },
      { label: 'Rapportperiode', value: 'Januar–mars 2026' },
      { label: 'Seksjon / kostnadssted', value: 'Alle seksjoner' },
      { label: 'Enhet', value: 'NOK 1 000' }
    ]
  });

  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].sheet, 'Kontogruppering');
  assert.equal(sheets[0].stickyColumnsCount, 2);
  assert.equal(sheets[0].orientation, 'landscape');

  const accountRow = sheets[0].data.find((row) => row[0]?.value === '5000 – Fast lønn');
  const groupRow = sheets[0].data.find((row) => row[0]?.value === 'Fast lønn');
  assert.equal(accountRow[0].indent, 1);
  assert.equal(groupRow[0].fontWeight, 'bold');
  assert.equal(groupRow[2].value, 50);

  const buffer = await writeExcelFile(sheets).toBuffer();
  const files = unzipSync(new Uint8Array(buffer));
  const workbookXml = decode(files['xl/workbook.xml']);
  const worksheetXml = decode(files['xl/worksheets/sheet1.xml']);
  const allXml = Object.entries(files)
    .filter(([name]) => name.endsWith('.xml'))
    .map(([, value]) => decode(value))
    .join('\n');

  assert.match(workbookXml, /name="Kontogruppering"/);
  assert.doesNotMatch(workbookXml, /name="Virksomhet"/);
  assert.match(allXml, /Virksomhetsregnskap/);
  assert.match(allXml, /Månedsbudsjett/);
  assert.match(allXml, /Kontantregnskap/);
  assert.match(allXml, /Rapportperiode: Januar–mars 2026/);
  assert.match(allXml, /Forbruk av årsbudsjett/);
  assert.match(allXml, /Investeringsbudsjett/);
  assert.match(allXml, /Investeringsregnskap/);
  assert.match(allXml, /Driftskostnader/);
  assert.match(worksheetXml, /<mergeCell ref="A1:Y1"\/>/);
  assert.match(worksheetXml, /<pane[^>]*xSplit="2"/);
  assert.match(worksheetXml, /<pane[^>]*ySplit="[1-9][0-9]*"/);
  assert.equal(task2WorkbookFilename('154301', '01–03 2026'), 'kontogruppering-154301-01-03-2026.xlsx');
  assert.equal(
    task2WorkbookFilename('154301', '01–03 2026', '421'),
    'kontogruppering-154301-01-03-2026-seksjon-421.xlsx'
  );
});
