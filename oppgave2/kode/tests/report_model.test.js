import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterReportRows,
  reportTotals,
  selectReportRows
} from '../src/lib/reportModel.js';

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
