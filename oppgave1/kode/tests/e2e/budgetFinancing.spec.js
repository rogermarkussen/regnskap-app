import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const folder = process.env.REGNSKAP_COMMON_DATA_FOLDER;
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const source = (name) => `read_parquet(${quote(path.join(folder, name))})`;
const query = (sql) => JSON.parse(execFileSync('duckdb', ['-json', '-c', sql], { encoding: 'utf8' }));

const openFolder = async (page, port) => {
  // Keep the selected File objects for a numerical check through the app's actual loader.
  await page.addInitScript(() => document.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
      window.uploadFilesForTest = Array.from(event.target.files);
    }
  }, true));
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('input[type=file]').setInputFiles(folder);
};

test.describe('budsjettfinansiering ved opplasting', () => {
  test.skip(!folder, 'Sett REGNSKAP_COMMON_DATA_FOLDER til de 12 operative filene');

  test('KPI-budsjettene avstemmer mot 2026RV og dim_4 i lokaldata', async ({ page }) => {
    const [{ period }] = query(`select max(trim(period)) period from ${source('agltransact.parquet')} where trim(period) between '202601' and '202612'`);
    await openFolder(page, 3111);
    await expect(page.getByRole('heading', { name: 'Økonomisk status' })).toBeVisible({ timeout: 120_000 });
    const actual = await page.evaluate(async (period) => {
      const { loadTask1Data } = await import('/src/lib/loadTask1Data.js');
      const byName = new Map(window.uploadFilesForTest.map((file) => [file.name, [{ file }]]));
      const { rows } = await loadTask1Data({ byName, folderName: 'lokaldata' });
      return rows.filter((row) => row.section_code === 'all' && row.period_key === period)
        .map((row) => ({ financing: row.finansiering, metric: row.metric, version: row.budsjettversjon, amount: row.budsjett_nok1000, ratio: row.prosentverdi }));
    }, period);
    const metrics = [
      ['154301', 'ADK', 'try_cast(h.account as integer) between 6110 and 7834'],
      ['154301', 'Konsulentkostnader', "h.account in ('6700','6710','6720','6730','6731','6732')"],
      ['154301', 'Reisekostnader', "h.account in ('7100','7130','7131','7150','7190','7199')"],
      ['154301', 'Overtid', "h.account in ('5050','5150')"],
      ['154345', 'Totalt regnskap vs budsjett', 'try_cast(h.account as integer) between 6110 and 7834'],
      ['154322+045101', 'ADK', 'try_cast(h.account as integer) between 6110 and 7834'],
      ['154322+045101', 'Testlab', "try_cast(h.account as integer) between 5000 and 7834 and h.dim_2='7114'"]
    ];
    for (const [financing, metric, predicate] of metrics) {
      const financingFilter = financing === '154322+045101' ? "h.dim_4 in ('154322','045101')" : `h.dim_4=${quote(financing)}`;
      const [{ amount }] = query(`select sum(cast(v.amount as decimal(24,6))) / 1000 amount
        from ${source('apltransact.parquet')} h join ${source('apltransactvalue.parquet')} v using(trans_id)
        where h.version='2026RV' and not (h.trans_id='5219663' and h.dim_1='711') and v.period between '202601' and ${quote(period)} and ${financingFilter} and ${predicate}`);
      const row = actual.find((row) => row.financing === financing && row.metric === metric);
      expect(row.version).toBe('2026RV');
      if (amount === null) expect(row.amount).toBeNull();
      else expect(row.amount).toBeCloseTo(Number(amount), 6);
    }
    for (const financing of ['154301', '154322+045101']) {
      const filter = financing === '154301' ? "dim_4='154301'" : "dim_4 in ('154322','045101')";
      const [{ ratio }] = query(`select
        sum(cast(amount as decimal(24,6))) filter (where try_cast(account as integer) between 5000 and 5999)
        / nullif(sum(cast(amount as decimal(24,6))) filter (where try_cast(account as integer) between 6110 and 7834), 0) ratio
        from ${source('agltransact.parquet')} where period between '202601' and ${quote(period)} and ${filter}`);
      const row = actual.find((row) => row.financing === financing && row.metric === 'Lønnsandel av andre driftskostnader');
      expect(row.ratio).toBeCloseTo(Number(ratio), 8);
    }
    await expect(page.getByText('Lønn / andre driftskostnader', { exact: true })).toHaveCount(2);
  });

  test('kontogrupperingen beholder alle finansieringer og totalbudsjettet', async ({ page }) => {
    const [{ period }] = query(`select max(trim(period)) period from ${source('agltransact.parquet')} where trim(period) between '202601' and '202612'`);
    const expected = query(`select coalesce(case when h.dim_4 in ('154322','045101') then '154322+045101' else nullif(trim(h.dim_4),'') end,'Uten finansiering') financing,
      sum(cast(v.amount as decimal(24,6))) / 1000 amount
      from ${source('apltransact.parquet')} h join ${source('apltransactvalue.parquet')} v using(trans_id)
      where h.version='2026RV' and not (h.trans_id='5219663' and h.dim_1='711') and v.period between '202601' and '202612'
        and (try_cast(h.account as integer) between 5000 and 7834 or h.account in ('1250','1270','1280','1281'))
      group by 1`);
    await openFolder(page, 3112);
    await expect(page.getByRole('heading', { name: 'Kontogruppering' })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('button', { name: '150021', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '150021', exact: true }).click();
    const actual = await page.evaluate(async (period) => {
      const { buildTask2Report } = await import('/src/lib/buildTask2Report.js');
      const files = Object.fromEntries(window.uploadFilesForTest.map((file) => [file.name, file]));
      const rows = await buildTask2Report(files);
      const totals = {};
      for (const row of rows) {
        if (row.section_code !== 'all' || row.rapportperiode !== period || row.row_type !== 'account' || row.aarets_budsjett_tusen === null) continue;
        totals[row.finansiering] = (totals[row.finansiering] ?? 0) + row.aarets_budsjett_tusen;
      }
      return { totals, versions: [...new Set(rows.filter((row) => row.report_year === 2026).map((row) => row.budsjettversjon))] };
    }, period);
    expect(actual.versions).toEqual(['2026RV']);
    for (const row of expected) expect(actual.totals[row.financing]).toBeCloseTo(Number(row.amount), 6);
    expect(actual.totals.alle).toBeCloseTo(expected.reduce((sum, row) => sum + Number(row.amount), 0), 6);
    expect(actual.totals['150021']).toBeGreaterThan(0);
    expect(actual.totals['Uten finansiering']).toBeGreaterThan(0);
  });

  test('månedsavslutningen bruker dim_4 i alle finansieringssummer', async ({ page }) => {
    await openFolder(page, 3113);
    await expect(page.getByRole('heading', { name: 'Kontroller perioden før den lukkes' })).toBeVisible({ timeout: 120_000 });
    const actual = await page.evaluate(async () => {
      const { loadTask3Data } = await import('/src/buildTask3Data.js');
      const files = Object.fromEntries(window.uploadFilesForTest.map((file) => [file.name, file]));
      const result = await loadTask3Data(files);
      try {
        const period = result.summary.filter((row) => row.periode.startsWith('2026')).map((row) => row.periode).sort().at(-1);
        return {
          period,
          versions: [...new Set(result.summary.filter((row) => row.periode.startsWith('2026')).map((row) => row.budsjettversjon))],
          rows: result.summary.filter((row) => row.periode === period && row.omfang === 'Nkom' && row.kategori === 'Driftskostnader')
            .map((row) => ({ financing: row.finansiering, amount: row.budsjett_hittil_nok }))
        };
      } finally { await result.db.close(); }
    });
    const expected = query(`select coalesce(case when h.dim_4 in ('154322','045101') then '154322+045101' else nullif(trim(h.dim_4),'') end,'Uten finansiering') financing,
      sum(cast(v.amount as decimal(24,6))) amount
      from ${source('apltransact.parquet')} h join ${source('apltransactvalue.parquet')} v using(trans_id)
      where h.version='2026RV' and not (h.trans_id='5219663' and h.dim_1='711') and v.period between '202601' and ${quote(actual.period)}
        and try_cast(h.account as integer) between 5000 and 7834 group by 1`);
    const totals = Object.fromEntries(actual.rows.map((row) => [row.financing, row.amount]));
    expect(actual.versions).toEqual(['2026RV']);
    for (const row of expected) expect(totals[row.financing]).toBeCloseTo(Number(row.amount), 4);
    expect(totals['150021']).toBeGreaterThan(0);
    expect(actual.rows.reduce((sum, row) => sum + row.amount, 0)).toBeCloseTo(expected.reduce((sum, row) => sum + Number(row.amount), 0), 4);
  });
});
