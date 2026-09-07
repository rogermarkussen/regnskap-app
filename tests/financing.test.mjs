import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { financingSql, reportFinancing, requireBudgetFinancing } from '../shared/financing.js';
import { budgetVersionForYear, budgetVersionSql } from '../shared/budgetVersion.js';
import {
  buildDashboardRowsFromSources,
  buildSectionDashboardRowsFromSources,
  validateOperationalDatasets
} from '../oppgave1/kode/components/task1Parquet.js';

test('finansiering normaliseres uten å bruke koststed eller erstatte tom kode', () => {
  for (const [source, expected] of [
    ['154301', '154301'], [' 150021 ', '150021'], ['154122', '154122'],
    ['045101', '154322+045101'], [45101, '154322+045101'],
    ['154322', '154322+045101'], [null, 'Uten finansiering'], ['', 'Uten finansiering']
  ]) assert.equal(reportFinancing(source), expected);
});

test('DuckDB og JavaScript beholder de samme finansieringsgruppene', () => {
  const sql = `select value, ${financingSql('value')} financing from (values
    ('154301'), ('154345'), ('150021'), ('154122'), ('154322'), ('45101'), ('045101'), (''), (NULL)
  ) sources(value)`;
  const rows = JSON.parse(execFileSync('duckdb', ['-json', '-c', sql], { encoding: 'utf8' }));
  for (const row of rows) assert.equal(row.financing, reportFinancing(row.value));
});

test('2026 bruker RV mens tidligere år beholder opprinnelig budsjett', () => {
  const rows = JSON.parse(execFileSync('duckdb', ['-json', '-c',
    `select year, ${budgetVersionSql('year')} as version from (values (2024), (2025), (2026)) t(year)`
  ], { encoding: 'utf8' }));
  assert.deepEqual(rows.map((row) => row.version), ['2024B', '2025B', '2026RV']);
  for (const row of rows) assert.equal(row.version, budgetVersionForYear(row.year));
});

test('begge KPI-beregningene skiller finansiering innenfor samme koststed', () => {
  const source = {
    actualRows: [{ account: '6110', dim_1: '711', dim_2: '', dim_4: '154301', period: '202601', amount: 10000 }],
    budgetHeaderRows: [
      { trans_id: '1', account: '6110', dim_1: '711', dim_4: '154301', version: '2026RV' },
      { trans_id: '2', account: '6110', dim_1: '711', dim_4: '154345', version: '2026RV' },
      { trans_id: '3', account: '6110', dim_1: '711', dim_4: '045101', version: '2026RV' },
      { trans_id: '4', account: '6110', dim_1: '711', dim_4: '150021', version: '2026RV' },
      { trans_id: '5', account: '6110', dim_1: '711', dim_4: null, version: '2026RV' },
      { trans_id: '6', account: '6110', dim_1: '212', dim_4: '154301', version: '2026RV' },
      { trans_id: '7', account: '6110', dim_1: '711', dim_4: '154301', version: '2026B' }
    ],
    budgetValueRows: [100000, 200000, 300000, 400000, 500000, 600000, 900000]
      .map((amount, index) => ({ trans_id: String(index + 1), period: '202601', amount })),
    dimensionRows: []
  };
  for (const build of [buildDashboardRowsFromSources, buildSectionDashboardRowsFromSources]) {
    const rows = build(source).filter((row) => row.period_key === '202601' && (!row.section_code || row.section_code === 'all'));
    assert.equal(rows.find((row) => row.finansiering === '154301' && row.metric === 'ADK').budsjett_nok1000, 700);
    assert.equal(rows.find((row) => row.finansiering === '154345').budsjett_nok1000, 200);
    assert.equal(rows.find((row) => row.finansiering === '154322+045101' && row.metric === 'ADK').budsjett_nok1000, 300);
    assert.ok(rows.every((row) => row.budsjettversjon === '2026RV'));
    const withoutRv = build({ ...source, budgetHeaderRows: source.budgetHeaderRows.filter((row) => row.version === '2026B') });
    assert.equal(withoutRv.find((row) => row.period_key === '202601' && (!row.section_code || row.section_code === 'all') && row.finansiering === '154301' && row.metric === 'ADK').budsjett_nok1000, null);
  }
});

test('gamle budsjettuttrekk uten dim_4 avvises før beregningen', async () => {
  await assert.rejects(requireBudgetFinancing({ query: async () => [{ column_name: 'dim_1' }] }), /mangler dim_4/);
  await assert.doesNotReject(requireBudgetFinancing({ query: async () => [{ column_name: 'dim_4' }] }));
  assert.throws(() => validateOperationalDatasets({
    actual: { name: 'agltransact.parquet', rows: [{ account: '6110', dim_4: '154301', dim_2: '', period: '202601', amount: 10 }] },
    budgetHeader: { name: 'apltransact.parquet', rows: [{ trans_id: '1', account: '6110', dim_1: '711', dim_2: '', version: '2026RV' }] },
    budgetValue: { name: 'apltransactvalue.parquet', rows: [{ trans_id: '1', period: '202601', amount: 20 }] }
  }), /dim_4/);
});

test('budsjettunntaket gjelder bare bekreftet transaksjon, versjon og koststed', async () => {
  const { includeBudgetHeader, budgetInclusionSql } = await import('../shared/budgetExclusions.js');
  const sql = `select *, ${budgetInclusionSql()} included from (values
    ('5219663','2026RV','711'), ('5733017','2026RV','771'), ('42','2026RV','711'),
    ('5219663','2026B','711'), ('5219663','2027B','711'), ('5219663','2026RV','771'),
    (NULL,'2026RV','711'), ('5219663','2026RV',NULL), ('5219663',NULL,'711')
  ) h(trans_id,version,dim_1)`;
  const rows = JSON.parse(execFileSync('duckdb', ['-json','-c',sql], { encoding: 'utf8' }));
  assert.deepEqual(rows.map(row => row.included), [false,true,true,true,true,true,true,true,true]);
  for (const row of rows) assert.equal(includeBudgetHeader(row), row.included);
  const source = {
    actualRows: [{ account:'6730', dim_1:'711', dim_4:'154301', period:'202601', amount:10 }],
    budgetHeaderRows: rows.slice(0,3).map(row => ({ ...row, account:'6730', dim_4:'154301' })),
    budgetValueRows: rows.slice(0,3).map((row,index) => ({ trans_id:row.trans_id, period:'202601', amount:[3000,3000,700][index] })),
    dimensionRows: []
  };
  for (const build of [buildDashboardRowsFromSources, buildSectionDashboardRowsFromSources]) {
    const result=build(source);
    const adk=(section)=>result.find(row=>row.period_key==='202601' && row.metric==='ADK' && row.finansiering==='154301' && (!row.section_code || row.section_code===section));
    assert.equal(adk('all').budsjett_nok1000, 3.7);
    if (build===buildSectionDashboardRowsFromSources) {
      assert.equal(adk('711').budsjett_nok1000, 0.7);
      assert.equal(adk('771').budsjett_nok1000, 3);
    }
  }
});

test('lønnsandel bruker ADK, kan overstige 100 prosent og er tom ved null ADK', () => {
  const source = {
    actualRows: ['154301','154322','045101'].flatMap(dim_4 => [
      {account:'5000',amount:2000}, {account:'5999',amount:1000},
      {account:'6000',amount:7000}, {account:'6109',amount:8000},
      {account:'6110',amount:900}, {account:'7834',amount:100}, {account:'7835',amount:9000}
    ].map(row=>({...row, dim_4, dim_1:'711',period:'202601'}))),
    budgetHeaderRows:[],budgetValueRows:[],dimensionRows:[]
  };
  for (const build of [buildDashboardRowsFromSources, buildSectionDashboardRowsFromSources]) {
    const ratios=build(source).filter(row=>row.tittel==='Lønnsandel');
    assert.ok(ratios.length>0);
    for (const row of ratios) {
      assert.equal(row.metric,'Lønnsandel av andre driftskostnader');
      assert.equal(row.prosentverdi,3);
      assert.equal(row.beregningsregel,'konto 5000–5999 / konto 6110–7834');
    }
    const noAdk={...source,actualRows:source.actualRows.filter(row=>Number(row.account)<6110)};
    assert.ok(build(noAdk).filter(row=>row.tittel==='Lønnsandel').every(row=>row.prosentverdi===null));
  }
});
