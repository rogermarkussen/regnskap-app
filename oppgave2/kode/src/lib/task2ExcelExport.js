const TOTAL_COLUMNS = 20;
const MONTH_COLUMNS = Array.from(
  { length: 12 },
  (_, index) => `budsjett_${String(index + 1).padStart(2, '0')}_tusen`
);
const SUM_COLUMNS = [
  'virksomhet_budsjett_tusen',
  'hovedbok_tusen',
  'avvik_tusen',
  'aarets_budsjett_tusen',
  ...MONTH_COLUMNS,
  'kontant_budsjett_tusen',
  'kontant_tusen',
  'kontant_avvik_tusen'
];

const colors = {
  navy: '#183247',
  teal: '#0B7376',
  paleTeal: '#DDEEEE',
  paleGreen: '#DDF2AF',
  paleBlue: '#E9F0F5',
  businessHeader: '#D7E5EC',
  businessColumn: '#E8F0F4',
  monthlyHeader: '#D9ECE9',
  monthlyColumn: '#EDF7F5',
  cashHeader: '#EFE4D1',
  cashColumn: '#F8F0E2',
  groupDivider: '#8BA4B4',
  cashDivider: '#B49A68',
  line: '#C9D5DE',
  white: '#FFFFFF',
  ink: '#142D42',
  muted: '#587086'
};

const displayLabel = (value) =>
  String(value ?? '').replace(/\s*\(\s*\d{4}(?:\s*,\s*\d{4})*\s*\)\s*$/, '');

const matchesSearch = (row, normalizedSearch) =>
  [row.konto, row.konto_navn, row.radtekst, row.hovedgruppe].some((value) =>
    String(value ?? '').toLocaleLowerCase('nb-NO').includes(normalizedSearch)
  );

const sumColumn = (rows, column) => {
  const values = rows
    .map((row) => row[column])
    .filter((value) => value !== null && value !== undefined)
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
};

const aggregateAccounts = (rows) => {
  const aggregate = Object.fromEntries(
    SUM_COLUMNS.map((column) => [column, sumColumn(rows, column)])
  );
  const periodComparisonIncomplete = rows.some(
    (row) =>
      Number(row.hovedbok_tusen) !== 0 &&
      (row.virksomhet_budsjett_tusen === null || row.virksomhet_budsjett_tusen === undefined)
  );
  const annualComparisonIncomplete = rows.some(
    (row) =>
      Number(row.hovedbok_tusen) !== 0 &&
      (row.aarets_budsjett_tusen === null || row.aarets_budsjett_tusen === undefined)
  );
  const cashComparisonIncomplete = rows.some(
    (row) =>
      Number(row.kontant_tusen) !== 0 &&
      (row.kontant_budsjett_tusen === null || row.kontant_budsjett_tusen === undefined)
  );
  if (periodComparisonIncomplete) aggregate.avvik_tusen = null;
  if (cashComparisonIncomplete) aggregate.kontant_avvik_tusen = null;
  aggregate.forbruk_av_aarets_budsjett =
    !annualComparisonIncomplete && aggregate.aarets_budsjett_tusen
      ? aggregate.hovedbok_tusen / aggregate.aarets_budsjett_tusen
      : null;
  return aggregate;
};

export const selectTask2ExportRows = (
  rows,
  { mainGroup = 'alle', search = '' } = {}
) => {
  const scopedRows = rows.filter(
    (row) => mainGroup === 'alle' || row.hovedgruppe === mainGroup
  );
  const accounts = scopedRows.filter((row) => row.row_type === 'account');
  const normalizedSearch = search.trim().toLocaleLowerCase('nb-NO');

  const matchingGroups = new Set(
    scopedRows
      .filter((row) => row.row_type === 'group' && normalizedSearch && matchesSearch(row, normalizedSearch))
      .map((row) => row.group_key)
  );
  const matchingMainGroups = new Set(
    scopedRows
      .filter(
        (row) =>
          ['section', 'total'].includes(row.row_type) &&
          normalizedSearch &&
          matchesSearch(row, normalizedSearch)
      )
      .map((row) => row.hovedgruppe)
  );
  const selectedAccounts = accounts.filter(
    (row) =>
      !normalizedSearch ||
      matchesSearch(row, normalizedSearch) ||
      matchingGroups.has(row.parent_group_key) ||
      matchingMainGroups.has(row.hovedgruppe)
  );
  const selectedAccountSet = new Set(selectedAccounts);
  const selectedGroupKeys = new Set(selectedAccounts.map((row) => row.parent_group_key));
  const selectedMainGroups = new Set(selectedAccounts.map((row) => row.hovedgruppe));

  const result = [];
  for (const row of scopedRows) {
    if (row.radtekst === 'Driftskostnader') continue;
    if (row.row_type === 'section' && selectedMainGroups.has(row.hovedgruppe)) {
      result.push(row);
    } else if (row.row_type === 'group' && selectedGroupKeys.has(row.group_key)) {
      const children = selectedAccounts.filter(
        (account) => account.parent_group_key === row.group_key
      );
      result.push({ ...row, ...aggregateAccounts(children) });
    } else if (row.row_type === 'account' && selectedAccountSet.has(row)) {
      result.push(row);
    } else if (row.row_type === 'total' && selectedMainGroups.has(row.hovedgruppe)) {
      const children = selectedAccounts.filter(
        (account) => account.hovedgruppe === row.hovedgruppe
      );
      result.push({ ...row, ...aggregateAccounts(children) });
    }
  }

  if (selectedAccounts.length) {
    const operatingAccounts = selectedAccounts.filter(
      (row) => row.hovedgruppe !== 'Investeringsrapport'
    );
    if (operatingAccounts.length) {
      result.push({
        row_type: 'grand_total',
        radtekst: 'Driftskostnader',
        ...aggregateAccounts(operatingAccounts)
      });
    }
  }
  return result;
};

const emptyRow = () => Array.from({ length: TOTAL_COLUMNS }, () => null);

const mergedRow = (value, style = {}) => [
  { value, columnSpan: TOTAL_COLUMNS, ...style },
  ...Array.from({ length: TOTAL_COLUMNS - 1 }, () => null)
];

const mergedCellGroup = (value, span, style = {}) => [
  { value, columnSpan: span, ...style },
  ...Array.from({ length: span - 1 }, () => null)
];

const borderStyle = {
  borderColor: colors.line,
  borderStyle: 'thin'
};

const headerCell = (value, style = {}) => ({
  value,
  fontWeight: 'bold',
  textColor: colors.white,
  backgroundColor: colors.teal,
  align: 'center',
  alignVertical: 'center',
  wrap: true,
  height: 34,
  ...borderStyle,
  ...style
});

const numberCell = (value, style) => {
  const normalizedValue = value === undefined ? null : value;
  return {
    value: normalizedValue,
    ...(normalizedValue === null ? {} : { format: '#,##0.0;[Red]-#,##0.0;-' }),
    align: 'right',
    ...borderStyle,
    ...style
  };
};

const rowStyle = (row) => {
  if (row.row_type === 'section') {
    return { backgroundColor: colors.navy, textColor: colors.white, fontWeight: 'bold' };
  }
  if (row.row_type === 'group') {
    return { backgroundColor: colors.paleTeal, textColor: colors.ink, fontWeight: 'bold' };
  }
  if (row.row_type === 'total') {
    return { backgroundColor: colors.paleGreen, textColor: colors.ink, fontWeight: 'bold' };
  }
  if (row.row_type === 'grand_total') {
    return {
      backgroundColor: colors.teal,
      textColor: colors.white,
      fontWeight: 'bold',
      topBorderColor: colors.navy,
      topBorderStyle: 'thick'
    };
  }
  return { backgroundColor: colors.white, textColor: colors.ink };
};

const typeLabel = (rowType) => ({
  section: 'Hovedgruppe',
  group: 'Gruppe',
  account: 'Konto',
  total: 'Total',
  grand_total: 'Total'
})[rowType] ?? rowType;

const reportRow = (row) => {
  const style = rowStyle(row);
  const labelCell = {
    value: displayLabel(row.radtekst),
    wrap: true,
    indent: row.row_type === 'account' ? 1 : 0,
    alignVertical: 'center',
    ...borderStyle,
    ...style
  };
  const textCell = (value) => ({
    value,
    alignVertical: 'center',
    ...borderStyle,
    ...style
  });
  const percentageValue = row.forbruk_av_aarets_budsjett ?? null;
  const percentageCell = {
    value: percentageValue,
    ...(percentageValue === null ? {} : { format: '0.0%' }),
    align: 'right',
    ...borderStyle,
    ...style
  };
  const businessStartStyle = {
    ...style,
    leftBorderColor: colors.groupDivider,
    leftBorderStyle: 'medium'
  };
  const monthlyStartStyle = {
    ...style,
    leftBorderColor: colors.groupDivider,
    leftBorderStyle: 'medium'
  };
  const cashStartStyle = {
    ...style,
    leftBorderColor: colors.cashDivider,
    leftBorderStyle: 'medium'
  };
  return [
    labelCell,
    textCell(typeLabel(row.row_type)),
    numberCell(row.virksomhet_budsjett_tusen, businessStartStyle),
    numberCell(row.hovedbok_tusen, style),
    numberCell(row.avvik_tusen, style),
    numberCell(row.aarets_budsjett_tusen, style),
    percentageCell,
    ...MONTH_COLUMNS.map((column, index) => numberCell(
      row[column],
      index === 0 ? monthlyStartStyle : style
    )),
    numberCell(row.kontant_tusen, cashStartStyle)
  ];
};

const metadataRows = (metadata) => {
  const rows = [];
  for (let index = 0; index < metadata.length; index += 2) {
    const left = metadata[index];
    const right = metadata[index + 1];
    rows.push([
      ...mergedCellGroup(`${left.label}: ${left.value ?? ''}`, 9, {
        fontWeight: 'bold',
        textColor: colors.ink,
        backgroundColor: colors.paleBlue,
        wrap: true,
        ...borderStyle
      }),
      null,
      ...mergedCellGroup(right ? `${right.label}: ${right.value ?? ''}` : '', 10, {
        fontWeight: 'bold',
        textColor: colors.ink,
        backgroundColor: colors.paleBlue,
        wrap: true,
        ...borderStyle
      })
    ]);
  }
  return rows;
};

export const createTask2WorkbookSheets = ({
  rows,
  metadata = [],
  periodText,
  monthLabels = []
}) => {
  const metadataData = metadataRows(metadata);
  const groupHeader = [
    ...mergedCellGroup('Kontostruktur', 2, headerCell('Kontostruktur')),
    ...mergedCellGroup('Virksomhetsregnskap', 5, headerCell('Virksomhetsregnskap', {
      textColor: colors.ink,
      backgroundColor: colors.businessHeader,
      leftBorderColor: colors.groupDivider,
      leftBorderStyle: 'medium'
    })),
    ...mergedCellGroup('Månedsbudsjett', 12, headerCell('Månedsbudsjett', {
      textColor: '#185E60',
      backgroundColor: colors.monthlyHeader,
      leftBorderColor: colors.groupDivider,
      leftBorderStyle: 'medium'
    })),
    ...mergedCellGroup('Kontantregnskap', 1, headerCell('Kontantregnskap', {
      textColor: '#6C552D',
      backgroundColor: colors.cashHeader,
      leftBorderColor: colors.cashDivider,
      leftBorderStyle: 'medium'
    }))
  ];
  const divider = {
    leftBorderColor: colors.groupDivider,
    leftBorderStyle: 'medium'
  };
  const columnHeader = [
    headerCell('Kontogruppe / konto'),
    headerCell('Type'),
    ...[
      `Budsjett ${periodText}`,
      'Hovedbok',
      'Avvik',
      'Årsbudsjett',
      'Forbruk av årsbudsjett'
    ].map((value, index) => headerCell(value, {
      textColor: colors.ink,
      backgroundColor: colors.businessColumn,
      ...(index === 0 ? divider : {})
    })),
    ...Array.from({ length: 12 }, (_, index) => headerCell(
      monthLabels[index] ?? `Måned ${index + 1}`,
      {
        textColor: '#285D5E',
        backgroundColor: colors.monthlyColumn,
        ...(index === 0 ? divider : {})
      }
    )),
    headerCell('Kontant', {
      textColor: '#6C552D',
      backgroundColor: colors.cashColumn,
      leftBorderColor: colors.cashDivider,
      leftBorderStyle: 'medium'
    })
  ];
  const data = [
    mergedRow('Kontogruppering', {
      fontSize: 20,
      fontWeight: 'bold',
      textColor: colors.white,
      backgroundColor: colors.navy,
      height: 32,
      alignVertical: 'center'
    }),
    mergedRow('Full visning · virksomhetsregnskap, månedsbudsjett og kontantregnskap', {
      fontSize: 11,
      textColor: colors.white,
      backgroundColor: colors.navy,
      height: 22,
      alignVertical: 'center'
    }),
    ...metadataData,
    emptyRow(),
    groupHeader,
    columnHeader,
    ...rows.map(reportRow)
  ];
  const stickyRowsCount = 2 + metadataData.length + 1 + 2;

  return [{
    sheet: 'Kontogruppering',
    data,
    columns: [
      { width: 38 },
      { width: 13 },
      ...Array.from({ length: 18 }, () => ({ width: 13 }))
    ],
    stickyRowsCount,
    stickyColumnsCount: 2,
    orientation: 'landscape',
    showGridLines: false,
    zoomScale: 0.75
  }];
};

export const task2WorkbookFilename = (financing, periodText, sectionCode = 'all') => {
  const sectionSuffix = sectionCode === 'all' ? '' : `-seksjon-${sectionCode}`;
  return `kontogruppering-${financing}-${periodText
    .replaceAll('–', '-')
    .replace(' ', '-')}${sectionSuffix}.xlsx`;
};
