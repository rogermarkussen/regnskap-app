import assert from 'node:assert/strict';
import test from 'node:test';

import {
  budgetMonthValue,
  filterReportRows,
  reportTotals,
  selectReportRows
} from '../src/lib/reportModel.js';

test('månedsvisningen leser de normaliserte budsjettkolonnene', () => {
  const row = { budsjett_01_tusen: 125, budsjett_08_tusen: 375 };

  assert.equal(budgetMonthValue(row, 1), 125);
  assert.equal(budgetMonthValue(row, 8), 375);
  assert.equal(budgetMonthValue(row, 12), undefined);
});

const rows = [
  { section_code: 'all', finansiering: '154301', rapportperiode: 'latest', excel_row: 1, row_type: 'group', radtekst: 'Reiser', hovedgruppe: 'Andre kostnader' },
  { section_code: 'all', finansiering: '154301', rapportperiode: 'latest', excel_row: 2, row_type: 'account', radtekst: '7130 - Reiser', konto: '7130', konto_navn: 'Reiser', hovedgruppe: 'Andre kostnader' },
  { section_code: 'all', finansiering: '154301', rapportperiode: 'latest', excel_row: 3, row_type: 'total', radtekst: 'Driftskostnader', hovedbok_tusen: 100 },
  { section_code: '421', finansiering: '154301', rapportperiode: 'latest', excel_row: 1, row_type: 'group', radtekst: 'Reiser', hovedgruppe: 'Andre kostnader' },
  { section_code: '421', finansiering: '154301', rapportperiode: 'latest', excel_row: 2, row_type: 'account', radtekst: '7130 - Reiser', konto: '7130', konto_navn: 'Reiser', hovedgruppe: 'Andre kostnader' },
  { section_code: '421', finansiering: '154301', rapportperiode: 'latest', excel_row: 3, row_type: 'total', radtekst: 'Driftskostnader', hovedbok_tusen: 25 }
];

test('rapportutvalget holder seksjoner adskilt og beholder gruppedrilldown', () => {
  const selected = selectReportRows(rows, {
    financing: '154301',
    reportPeriod: 'latest',
    sectionCode: '421'
  });
  const { grandTotal, groupKeys } = reportTotals(selected);

  assert.equal(selected.length, 3);
  assert.equal(grandTotal.hovedbok_tusen, 25);
  assert.equal(groupKeys.length, 1);
  assert.equal(selected[1].parent_group_key, groupKeys[0]);

  const collapsed = filterReportRows(selected, { openGroups: [] });
  const expanded = filterReportRows(selected, { openGroups: groupKeys });
  assert.equal(collapsed.some((row) => row.konto === '7130'), false);
  assert.equal(expanded.some((row) => row.konto === '7130'), true);
});

test('samlet avvik står tomt når hovedboken mangler budsjettgrunnlag', () => {
  const { grandTotal } = reportTotals([
    {
      row_type: 'account',
      konto: '3710',
      hovedbok_tusen: -120,
      virksomhet_budsjett_tusen: null,
      avvik_tusen: null,
      aarets_budsjett_tusen: null
    },
    {
      row_type: 'account',
      konto: '5000',
      hovedbok_tusen: 80,
      virksomhet_budsjett_tusen: 100,
      avvik_tusen: 20,
      aarets_budsjett_tusen: 150
    }
  ]);

  assert.equal(grandTotal.hovedbok_tusen, -40);
  assert.equal(grandTotal.virksomhet_budsjett_tusen, 100);
  assert.equal(grandTotal.avvik_tusen, null);
  assert.equal(grandTotal.forbruk_av_aarets_budsjett, null);
});
