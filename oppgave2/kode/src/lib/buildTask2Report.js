import { openLocalDuckDb } from './localDuckDb.js';

const SOURCE_FILES = [
  'agltransact.parquet',
  'apltransact.parquet',
  'apltransactvalue.parquet',
  'agldimvalue.parquet',
  'acatrans.parquet',
  'acaaccounts.parquet',
  'nkom_kontoplan.parquet'
];

const MONTH_NAMES = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember'
];
const FINANCING_OPTIONS = [
  ['154301', 'Finansiering 154301'],
  ['154345', 'Finansiering 154345'],
  ['154322+045101', 'Finansiering 154322 + 045101'],
  ['alle', 'Alle finansieringer']
];
const MONTH_COLUMNS = Array.from({ length: 12 }, (_, index) => `budsjett_${String(index + 1).padStart(2, '0')}_tusen`);
const VALUE_COLUMNS = [
  'virksomhet_budsjett_tusen', 'hovedbok_tusen', 'avvik_tusen',
  'aarets_budsjett_tusen', ...MONTH_COLUMNS, 'kontant_budsjett_tusen',
  'kontant_tusen', 'kontant_avvik_tusen', 'investeringsbudsjett_tusen',
  'investeringsregnskap_tusen'
];

const key = (section, financing, account, period) => [section, financing, account, period].join('|');
const valueMap = (rows) => new Map(rows
  .filter((row) => row.value !== null && row.value !== undefined)
  .map((row) => [key(row.section_code, row.financing, row.konto, row.period), Number(row.value)]));
const sumAvailable = (values) => {
  const present = values.filter((value) => value !== null && value !== undefined).map(Number);
  return present.length ? present.reduce((sum, value) => sum + value, 0) : null;
};
const summedValues = (rows) => {
  const result = Object.fromEntries(VALUE_COLUMNS.map((column) => [column, sumAvailable(rows.map((row) => row[column]))]));
  const missingPeriodBudget = rows.some((row) => row.virksomhet_budsjett_tusen === null && Number(row.hovedbok_tusen) !== 0);
  const missingAnnualBudget = rows.some((row) => row.aarets_budsjett_tusen === null && Number(row.hovedbok_tusen) !== 0);
  if (missingPeriodBudget) result.avvik_tusen = null;
  result.forbruk_av_aarets_budsjett = missingAnnualBudget
    || result.aarets_budsjett_tusen === null
    || result.aarets_budsjett_tusen === 0
    || result.hovedbok_tusen === null
    ? null
    : result.hovedbok_tusen / result.aarets_budsjett_tusen;
  return result;
};

const expandedQuery = (base) => `
  with base as (${base}), expanded as (
    select period, section_code, financing, konto, value from base
    union all select period, 'all', financing, konto, value from base
    union all select period, section_code, 'alle', konto, value from base
    union all select period, 'all', 'alle', konto, value from base
  )
  select period, section_code, financing, konto, sum(value) as value
  from expanded group by all
`;

export const buildTask2Report = async (files) => {
  const db = await openLocalDuckDb(files, SOURCE_FILES);
  try {
    const [actual, budget, cash, structure, sectionRows, periods] = await Promise.all([
      db.query(expandedQuery(`
        select trim(period) as period,
          coalesce(nullif(trim(dim_1), ''), '__missing__') as section_code,
          case when trim(dim_4) in ('154322', '045101') then '154322+045101' else trim(dim_4) end as financing,
          lpad(trim(account), 4, '0') as konto,
          try_cast(amount as double) / 1000.0 as value
        from read_parquet('agltransact.parquet')
        where regexp_matches(trim(period), '^20[0-9]{2}(0[1-9]|1[0-2])$')
          and try_cast(account as integer) between 3000 and 8999
      `)),
      db.query(expandedQuery(`
        select trim(v.period) as period,
          coalesce(nullif(trim(h.dim_1), ''), '__missing__') as section_code,
          case when trim(h.dim_1) = '212' then '154345'
               when trim(h.dim_1) = '761' then '154322+045101'
               else '154301' end as financing,
          lpad(trim(h.account), 4, '0') as konto,
          coalesce(try_cast(v.amount as double), try_cast(v.amount1 as double)) / 1000.0 as value
        from read_parquet('apltransact.parquet') h
        join read_parquet('apltransactvalue.parquet') v using (trans_id)
        where h.version = substr(trim(v.period), 1, 4) || 'B'
          and regexp_matches(trim(v.period), '^20[0-9]{2}(0[1-9]|1[0-2])$')
          and try_cast(h.account as integer) between 3000 and 8999
      `)),
      db.query(expandedQuery(`
        select trim(pay_period) as period,
          coalesce(nullif(trim(dim_1), ''), '__missing__') as section_code,
          case when trim(dim_4) in ('154322', '045101') then '154322+045101' else trim(dim_4) end as financing,
          lpad(trim(account), 4, '0') as konto,
          try_cast(cash_amount as double) / 1000.0 as value
        from read_parquet('acatrans.parquet')
        where regexp_matches(trim(pay_period), '^20[0-9]{2}(0[1-9]|1[0-2])$')
          and try_cast(account as integer) between 3000 and 8999
      `)),
      db.query(`
        with accounts as (
          select distinct lpad(trim(account), 4, '0') as konto from read_parquet('agltransact.parquet') where try_cast(account as integer) between 3000 and 8999
          union select distinct lpad(trim(account), 4, '0') from read_parquet('apltransact.parquet') where try_cast(account as integer) between 3000 and 8999
          union select distinct lpad(trim(account), 4, '0') from read_parquet('acatrans.parquet') where try_cast(account as integer) between 3000 and 8999
        ), names as (
          select lpad(trim(dim_value), 4, '0') as konto, any_value(trim(description)) as konto_navn
          from read_parquet('agldimvalue.parquet') where attribute_id = 'A0' and try_cast(dim_value as integer) between 3000 and 8999 group by 1
        ), plan as (
          select cast(Konto as varchar) as prefix, Kontonavn as navn from read_parquet('nkom_kontoplan.parquet')
        )
        select accounts.konto, coalesce(names.konto_navn, 'Kontonavn mangler') as konto_navn,
          coalesce(main.navn, 'Kontoklasse ' || substr(accounts.konto, 1, 1)) as hovedgruppe,
          coalesce(sub.navn, 'Kontogruppe ' || substr(accounts.konto, 1, 2)) as undergruppe
        from accounts left join names using (konto)
        left join plan main on main.prefix = substr(accounts.konto, 1, 1)
        left join plan sub on sub.prefix = substr(accounts.konto, 1, 2)
        order by try_cast(accounts.konto as integer)
      `),
      db.query(`
        with codes as (
          select distinct trim(dim_1) as code from read_parquet('agltransact.parquet') where trim(coalesce(dim_1, '')) <> ''
          union select distinct trim(dim_1) from read_parquet('apltransact.parquet') where trim(coalesce(dim_1, '')) <> ''
          union select distinct trim(dim_1) from read_parquet('acatrans.parquet') where trim(coalesce(dim_1, '')) <> ''
        ), names as (
          select trim(dim_value) as code, any_value(trim(description)) as name
          from read_parquet('agldimvalue.parquet') where attribute_id = 'C1' group by 1
        )
        select codes.code, coalesce(names.name, 'Navn mangler i dimensjonsregisteret') as name
        from codes left join names using (code) order by try_cast(codes.code as integer), codes.code
      `),
      db.query(`select distinct trim(period) as period from read_parquet('agltransact.parquet') where regexp_matches(trim(period), '^20[0-9]{2}(0[1-9]|1[0-2])$') order by 1`)
    ]);

    const actualMap = valueMap(actual);
    const budgetMap = valueMap(budget);
    const cashMap = valueMap(cash);
    const scopes = [
      { section_code: 'all', section_name: 'Alle seksjoner', section_label: 'Alle seksjoner', section_sort: 0 },
      ...sectionRows.map((row) => ({
        section_code: String(row.code),
        section_name: String(row.name),
        section_label: `${row.code} · ${row.name}`,
        section_sort: /^\d+$/.test(String(row.code)) ? Number(row.code) : 90_000
      }))
    ];
    const grouped = new Map();
    for (const account of structure) {
      if (!grouped.has(account.hovedgruppe)) grouped.set(account.hovedgruppe, new Map());
      const subgroups = grouped.get(account.hovedgruppe);
      if (!subgroups.has(account.undergruppe)) subgroups.set(account.undergruppe, []);
      subgroups.get(account.undergruppe).push(account);
    }
    const reportRows = [];

    for (const scope of scopes) {
      for (const [financing, financingLabel] of FINANCING_OPTIONS) {
        for (const { period: endPeriod } of periods) {
          const year = Number(endPeriod.slice(0, 4));
          const endMonth = Number(endPeriod.slice(4));
          const context = {
            ...scope,
            finansiering: financing,
            finansiering_tekst: financingLabel,
            rapportperiode: endPeriod,
            report_year: year,
            period_to: Number(endPeriod),
            periodetekst: `Januar–${MONTH_NAMES[endMonth - 1]} ${year}`,
            budsjettversjon: `${year}B`
          };
          const accountsByNumber = new Map();
          for (const account of structure) {
            const number = String(account.konto);
            const monthly = Object.fromEntries(MONTH_COLUMNS.map((column, index) => [
              column,
              budgetMap.get(key(scope.section_code, financing, number, `${year}${String(index + 1).padStart(2, '0')}`)) ?? null
            ]));
            const actualValue = Array.from({ length: endMonth }, (_, index) =>
              actualMap.get(key(scope.section_code, financing, number, `${year}${String(index + 1).padStart(2, '0')}`)) ?? 0
            ).reduce((sum, value) => sum + value, 0);
            const cashValue = sumAvailable(Array.from({ length: endMonth }, (_, index) =>
              cashMap.get(key(scope.section_code, financing, number, `${year}${String(index + 1).padStart(2, '0')}`))
            ));
            const periodBudget = sumAvailable(MONTH_COLUMNS.slice(0, endMonth).map((column) => monthly[column]));
            const annualBudget = sumAvailable(Object.values(monthly));
            const investmentBudget = ['154345', 'alle'].includes(financing)
              ? sumAvailable(Array.from({ length: endMonth }, (_, index) => budgetMap.get(key(scope.section_code, '154345', number, `${year}${String(index + 1).padStart(2, '0')}`))))
              : null;
            const investmentActual = ['154345', 'alle'].includes(financing)
              ? Array.from({ length: endMonth }, (_, index) => actualMap.get(key(scope.section_code, '154345', number, `${year}${String(index + 1).padStart(2, '0')}`)) ?? 0).reduce((sum, value) => sum + value, 0)
              : null;
            if (![actualValue, ...Object.values(monthly), cashValue].some((value) => value !== null && Math.abs(Number(value)) > 1e-12)) continue;
            accountsByNumber.set(number, {
              ...context,
              hovedgruppe: account.hovedgruppe,
              row_type: 'account',
              radtekst: `${number} - ${account.konto_navn}`,
              konto: number,
              konto_navn: account.konto_navn,
              data_status: periodBudget === null && actualValue !== 0 ? 'Budsjettgrunnlag mangler' : 'Operative tall',
              virksomhet_budsjett_tusen: periodBudget,
              hovedbok_tusen: actualValue,
              avvik_tusen: periodBudget === null ? null : periodBudget - actualValue,
              aarets_budsjett_tusen: annualBudget,
              ...monthly,
              kontant_budsjett_tusen: null,
              kontant_tusen: cashValue,
              kontant_avvik_tusen: null,
              investeringsbudsjett_tusen: investmentBudget,
              investeringsregnskap_tusen: investmentActual,
              forbruk_av_aarets_budsjett: annualBudget ? actualValue / annualBudget : null,
              source_file: 'agltransact.parquet; apltransact.parquet; apltransactvalue.parquet; acatrans.parquet'
            });
          }

          let excelRow = 1;
          for (const [mainGroup, subgroups] of grouped) {
            const mainAccounts = [];
            reportRows.push({ ...context, excel_row: excelRow++, hovedgruppe: mainGroup, row_type: 'section', radtekst: mainGroup, ...Object.fromEntries(VALUE_COLUMNS.map((column) => [column, null])), forbruk_av_aarets_budsjett: null, source_file: 'nkom_kontoplan.parquet' });
            for (const [subgroup, accounts] of subgroups) {
              const subgroupRows = accounts.map((account) => accountsByNumber.get(String(account.konto))).filter(Boolean);
              if (!subgroupRows.length) continue;
              mainAccounts.push(...subgroupRows);
              reportRows.push({ ...context, excel_row: excelRow++, hovedgruppe: mainGroup, row_type: 'group', radtekst: subgroup, konto: null, konto_navn: null, ...summedValues(subgroupRows), source_file: 'nkom_kontoplan.parquet' });
              for (const row of subgroupRows) reportRows.push({ ...row, excel_row: excelRow++ });
            }
            reportRows.push({ ...context, excel_row: excelRow++, hovedgruppe: mainGroup, row_type: 'total', radtekst: `Totale ${String(mainGroup).toLocaleLowerCase('nb-NO')}`, konto: null, konto_navn: null, ...summedValues(mainAccounts), source_file: 'nkom_kontoplan.parquet' });
          }
        }
      }
    }
    return reportRows;
  } finally {
    await db.close();
  }
};
