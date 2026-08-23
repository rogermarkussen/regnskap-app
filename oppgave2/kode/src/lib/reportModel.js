export const displayLabel = (value) =>
  String(value ?? '').replace(/\s*\(\s*\d{4}(?:\s*,\s*\d{4})*\s*\)\s*$/, '');

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

export const reportTotals = (rows) => ({
  grandTotal: rows.find((row) => row.radtekst === 'Driftskostnader') ?? {},
  summaryRows: rows.filter((row) => row.row_type === 'total'),
  mainGroups: [...new Set(rows.map((row) => row.hovedgruppe).filter(Boolean))],
  groupKeys: rows.filter((row) => row.row_type === 'group').map((row) => row.group_key)
});
