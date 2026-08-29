export const displayLabel = (value) =>
  String(value ?? '').replace(/\s*\(\s*\d{4}(?:\s*,\s*\d{4})*\s*\)\s*$/, '');

export const budgetMonthValue = (row, month) =>
  row[`budsjett_${String(month).padStart(2, '0')}_tusen`];

export const selectReportRows = (
  rows,
  { financing, reportPeriod, sectionCode }
) => {
  let currentGroupKey = null;
  return rows
    .filter(
      (row) =>
        row.finansiering === financing &&
        row.rapportperiode === reportPeriod &&
        row.section_code === sectionCode
    )
    .sort((left, right) => left.excel_row - right.excel_row)
    .map((row) => {
      if (row.row_type === 'group') {
        currentGroupKey = [sectionCode, financing, reportPeriod, row.excel_row].join(':');
      }
      if (row.row_type === 'section' || row.row_type === 'total') currentGroupKey = null;
      return {
        ...row,
        group_key: row.row_type === 'group' ? currentGroupKey : null,
        parent_group_key: row.row_type === 'account' ? currentGroupKey : null
      };
    });
};

export const filterReportRows = (
  rows,
  { mainGroup = 'alle', level = 'oversikt', search = '', openGroups = [] }
) => {
  const normalizedSearch = search.trim().toLocaleLowerCase('nb-NO');
  return rows.filter((row) => {
    const groupMatches = mainGroup === 'alle' || row.hovedgruppe === mainGroup;
    const searchMatches =
      !normalizedSearch ||
      [row.konto, row.konto_navn, row.radtekst, row.hovedgruppe].some((value) =>
        String(value ?? '').toLocaleLowerCase('nb-NO').includes(normalizedSearch)
      );
    const levelMatches =
      (level === 'oversikt' &&
        (['section', 'group', 'total'].includes(row.row_type) ||
          (row.row_type === 'account' &&
            (openGroups.includes(row.parent_group_key) || Boolean(normalizedSearch))))) ||
      (level === 'konto' && row.row_type === 'account');
    return groupMatches && searchMatches && levelMatches;
  });
};

export const reportTotals = (rows) => {
  const accountRows = rows.filter((row) => row.row_type === 'account');
  const sum = (column) => {
    const values = accountRows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined)
      .map(Number)
      .filter(Number.isFinite);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  const calculated = {
    hovedbok_tusen: sum('hovedbok_tusen'),
    virksomhet_budsjett_tusen: sum('virksomhet_budsjett_tusen'),
    avvik_tusen: sum('avvik_tusen'),
    aarets_budsjett_tusen: sum('aarets_budsjett_tusen')
  };
  const periodComparisonIncomplete = accountRows.some(
    (row) =>
      Number(row.hovedbok_tusen) !== 0 &&
      (row.virksomhet_budsjett_tusen === null || row.virksomhet_budsjett_tusen === undefined)
  );
  const annualComparisonIncomplete = accountRows.some(
    (row) =>
      Number(row.hovedbok_tusen) !== 0 &&
      (row.aarets_budsjett_tusen === null || row.aarets_budsjett_tusen === undefined)
  );
  if (periodComparisonIncomplete) calculated.avvik_tusen = null;
  calculated.forbruk_av_aarets_budsjett =
    !annualComparisonIncomplete && calculated.aarets_budsjett_tusen
    ? calculated.hovedbok_tusen / calculated.aarets_budsjett_tusen
    : null;
  return {
    grandTotal: rows.find((row) => row.radtekst === 'Driftskostnader') ?? calculated,
    summaryRows: rows.filter((row) => row.row_type === 'total'),
    mainGroups: [...new Set(rows.map((row) => row.hovedgruppe).filter(Boolean))],
    groupKeys: rows.filter((row) => row.row_type === 'group').map((row) => row.group_key)
  };
};
