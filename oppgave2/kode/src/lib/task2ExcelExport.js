const headerCell = (value) => ({
  value,
  fontWeight: 'bold',
  backgroundColor: '#E8EEF6'
});

const normalizeCell = (value) => (value === undefined ? null : value);

export const rowsToSheetData = (rows) => {
  if (!rows.length) return [[null]];
  const headers = Object.keys(rows[0]);
  return [
    headers.map(headerCell),
    ...rows.map((row) => headers.map((header) => normalizeCell(row[header])))
  ];
};

const sheetColumns = (rows) => {
  if (!rows.length) return [{ width: 12 }];
  return Object.keys(rows[0]).map((header) => ({
    width: Math.min(
      48,
      Math.max(
        header.length + 2,
        ...rows.slice(0, 250).map((row) => String(row[header] ?? '').length + 2)
      )
    )
  }));
};

export const createTask2WorkbookSheets = ({
  virksomhetRows,
  kontantRows,
  maanedRows,
  metadata
}) =>
  [
    { sheet: 'Virksomhet', rows: virksomhetRows },
    { sheet: 'Kontant', rows: kontantRows },
    { sheet: 'Måneder', rows: maanedRows },
    { sheet: 'Rapportinfo', rows: metadata }
  ].map(({ sheet, rows }) => ({
    sheet,
    data: rowsToSheetData(rows),
    columns: sheetColumns(rows),
    stickyRowsCount: 1
  }));

export const task2WorkbookFilename = (financing, periodText, sectionCode = 'all') => {
  const sectionSuffix = sectionCode === 'all' ? '' : `-seksjon-${sectionCode}`;
  return `kontogruppering-${financing}-${periodText
    .replaceAll('–', '-')
    .replace(' ', '-')}${sectionSuffix}.xlsx`;
};
