import { BUDGET_VERSION, KPI_UPLOAD_DEFINITIONS } from './task1Parquet.js';

const REQUIRED_FIELDS = [
  'rapportperiode',
  'finansiering',
  'tittel',
  'hovedbok_nok1000',
  'budsjett_nok1000',
  'prosentverdi',
  'kommentar'
];

export const EXCEL_PERIODS = [
  { key: 'p1_3', label: 'Jan-mar' },
  { key: 'p1_4', label: 'Jan-apr' },
  { key: 'p1_6', label: 'Jan-jun' }
];

const PERIOD_BY_VALUE = new Map(
  EXCEL_PERIODS.flatMap((period) => [
    [period.key.toLowerCase(), period],
    [period.label.toLowerCase(), period]
  ])
);

const EXPECTED_ROWS = new Map(
  KPI_UPLOAD_DEFINITIONS.map((definition) => [
    `${definition.financing}|${definition.title}`,
    definition
  ])
);

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parsePeriod = (value, formatLabel) => {
  const period = PERIOD_BY_VALUE.get(String(value ?? '').trim().toLowerCase());
  if (!period) {
    throw new Error(
      `${formatLabel} har ugyldig rapportperiode «${String(value ?? '').trim()}». ` +
      'Bruk Jan-mar, Jan-apr eller Jan-jun'
    );
  }
  return period;
};

const buildUploadRow = (record, period) => {
  const hovedbok = parseNumber(record.hovedbok_nok1000);
  const budsjett = parseNumber(record.budsjett_nok1000);
  const prosent = parseNumber(record.prosentverdi);
  if (Number.isNaN(hovedbok) || Number.isNaN(budsjett) || Number.isNaN(prosent)) {
    throw new Error(`Ugyldig tallverdi for «${record.tittel}»`);
  }

  const row = {
    rapportperiode: period.label,
    period_key: period.key,
    finansiering: String(record.finansiering ?? '').trim(),
    tittel: String(record.tittel ?? '').trim(),
    hovedbok_nok1000: hovedbok,
    budsjett_nok1000: budsjett,
    prosentverdi: prosent,
    kommentar: String(record.kommentar ?? '').trim() || null,
    grunnlag_json: null,
    regelversjon: 'Manuell Excel',
    budsjettversjon: BUDGET_VERSION
  };

  if (prosent !== null) {
    row.budsjettandel = null;
    row.status = null;
    row.status_tekst = null;
    row.gjenstaar_nok1000 = -prosent;
  } else {
    row.budsjettandel = budsjett ? hovedbok / budsjett : null;
    row.status = row.budsjettandel === null
      ? null
      : row.budsjettandel > 1
        ? 'danger'
        : row.budsjettandel >= 0.85
          ? 'warning'
          : 'ok';
    row.status_tekst = row.status === 'danger'
      ? 'Over budsjett'
      : row.status === 'warning'
        ? 'Nær budsjett'
        : row.status === 'ok'
          ? 'Innenfor budsjett'
          : null;
    row.gjenstaar_nok1000 = budsjett === null ? null : budsjett - hovedbok;
  }
  return row;
};

export const validateExcelRecords = (records, formatLabel = 'Excel') => {
  if (!records.length) throw new Error(`${formatLabel}-filen inneholder ingen datarader`);
  const headers = Object.keys(records[0]).map((header) => header.trim());
  for (const field of REQUIRED_FIELDS) {
    if (!headers.includes(field)) throw new Error(`${formatLabel} mangler kolonnen «${field}»`);
  }
  const expectedCount = EXPECTED_ROWS.size * EXCEL_PERIODS.length;
  if (records.length !== expectedCount) {
    throw new Error(
      `${formatLabel} må inneholde nøyaktig ${expectedCount} KPI-rader ` +
      `(${EXPECTED_ROWS.size} for hver rapportperiode)`
    );
  }

  const rowsByKey = new Map();
  for (const record of records) {
    const period = parsePeriod(record.rapportperiode ?? record.period_key, formatLabel);
    const metricKey = `${String(record.finansiering ?? '').trim()}|${String(record.tittel ?? '').trim()}`;
    const rowKey = `${period.key}|${metricKey}`;
    const definition = EXPECTED_ROWS.get(metricKey);
    if (!definition) throw new Error(`${formatLabel} inneholder ukjent KPI: ${metricKey}`);
    if (rowsByKey.has(rowKey)) {
      throw new Error(`${formatLabel} inneholder duplikat KPI i ${period.label}: ${metricKey}`);
    }
    const row = buildUploadRow(record, period);
    if (definition.percentage) {
      if (row.prosentverdi === null) throw new Error(`${formatLabel} mangler prosentverdi for ${metricKey}`);
      if (row.hovedbok_nok1000 !== null || row.budsjett_nok1000 !== null) {
        throw new Error(`${formatLabel}: beløpsfeltene skal være tomme for ${metricKey}`);
      }
    } else {
      if (row.hovedbok_nok1000 === null) throw new Error(`${formatLabel} mangler hovedbokbeløp for ${metricKey}`);
      if (row.prosentverdi !== null) throw new Error(`${formatLabel}: prosentverdi skal være tom for ${metricKey}`);
    }
    rowsByKey.set(rowKey, row);
  }

  return EXCEL_PERIODS.flatMap((period) =>
    KPI_UPLOAD_DEFINITIONS.map((definition) =>
      rowsByKey.get(`${period.key}|${definition.financing}|${definition.title}`)
    )
  );
};

export const validateStoredExcelRows = (records, formatLabel = 'Lagret Excel-import') => {
  const isLegacyImport = records.length === EXPECTED_ROWS.size && records.every(
    (record) => !record.rapportperiode && !record.period_key && record.regelversjon === 'Manuell Excel'
  );
  if (!isLegacyImport) return validateExcelRecords(records, formatLabel);

  const migrated = EXCEL_PERIODS.flatMap((period) =>
    records.map((record) => ({ ...record, rapportperiode: period.label }))
  );
  return validateExcelRecords(migrated, formatLabel);
};
