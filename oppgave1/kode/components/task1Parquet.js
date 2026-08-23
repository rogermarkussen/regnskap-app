import { parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';

export const BUSINESS_RULE_VERSION = '2026-08-06';
export const BUDGET_VERSION = '2026B';

const PERIODS = {
  202601: '202601',
  202602: '202602',
  202603: '202603',
  202604: '202604',
  202605: '202605',
  202606: '202606',
  202607: '202607'
};

const LEGACY_PERIODS = {
  p1_3: '202603',
  p1_4: '202604',
  p1_6: '202606'
};

const METRIC_RULES = [
  { financing: '154301', metric: 'ADK', title: 'ADK', accountFrom: 6110, accountTo: 7834 },
  {
    financing: '154301', metric: 'Konsulentkostnader', title: 'Konsulent',
    accounts: ['6700', '6710', '6720', '6730', '6731', '6732']
  },
  {
    financing: '154301', metric: 'Reisekostnader', title: 'Reise',
    accounts: ['7100', '7130', '7131', '7150', '7190', '7199']
  },
  { financing: '154301', metric: 'Overtid', title: 'Overtid', accounts: ['5050', '5150'] },
  {
    financing: '154301', metric: 'Lønnsandel av totale kostnader', title: 'Lønnsandel',
    ratioNumerator: [5000, 5999], ratioDenominator: [5000, 7834]
  },
  {
    financing: '154345', metric: 'Totalt regnskap vs budsjett',
    title: 'Totalt regnskap vs budsjett', accountFrom: 6110, accountTo: 7834
  },
  { financing: '154322+045101', metric: 'ADK', title: 'ADK', accountFrom: 6110, accountTo: 7834 },
  {
    financing: '154322+045101', metric: 'Testlab', title: 'Testlab prosjekt 7114',
    accountFrom: 5000, accountTo: 7834, project: '7114'
  },
  {
    financing: '154322+045101', metric: 'Lønnsandel av totale kostnader', title: 'Lønnsandel',
    ratioNumerator: [5000, 5999], ratioDenominator: [5000, 7834]
  }
];

export const KPI_UPLOAD_DEFINITIONS = METRIC_RULES.map((rule) => ({
  financing: rule.financing,
  title: rule.title,
  percentage: Boolean(rule.ratioNumerator)
}));

export const mergeOperationalFileSelection = (currentFiles, newFiles) => {
  const byName = new Map(
    Array.from(currentFiles ?? []).map((file) => [file.name.toLowerCase(), file])
  );
  for (const file of Array.from(newFiles ?? [])) byName.set(file.name.toLowerCase(), file);
  return [...byName.values()];
};

const expectedRowsFor = (periods) => new Map(
  Object.keys(periods).flatMap((periodKey) => METRIC_RULES.map((rule) => [
    `${periodKey}|${rule.financing}|${rule.metric}`,
    rule
  ]))
);

const text = (value) => value === undefined || value === null ? '' : String(value).trim();
const number = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const budgetFinancing = (dim1) => {
  const value = text(dim1);
  if (value === '212') return '154345';
  if (value === '761') return '154322+045101';
  return '154301';
};

const accountMatches = (row, rule) => {
  const account = text(row.account);
  if (rule.accounts) return rule.accounts.includes(account);
  const accountNumber = Number(account);
  return Number.isFinite(accountNumber)
    && accountNumber >= rule.accountFrom
    && accountNumber <= rule.accountTo;
};

const actualMatchesFinancing = (row, financing) => financing === '154322+045101'
  ? ['154322', '045101'].includes(text(row.dim_4))
  : text(row.dim_4) === financing;

const sumAmounts = (rows) => rows.reduce((total, row) => total + (number(row.amount_tusen) ?? 0), 0);

const ratioSum = (rows, [from, to]) => rows.reduce((total, row) => {
  const account = Number(text(row.account));
  return Number.isFinite(account) && account >= from && account <= to
    ? total + (number(row.amount_tusen) ?? 0)
    : total;
}, 0);

const status = (actual, budget) => {
  if (budget === null || budget === 0) return [null, null, null];
  const share = actual / budget;
  if (share > 1) return [share, 'danger', 'Over budsjett'];
  if (share >= 0.85) return [share, 'warning', 'Nær budsjett'];
  return [share, 'ok', 'Innenfor budsjett'];
};

const calculationRule = (rule) => {
  if (rule.ratioNumerator) {
    return `konto ${rule.ratioNumerator[0]}–${rule.ratioNumerator[1]} / konto ${rule.ratioDenominator[0]}–${rule.ratioDenominator[1]}`;
  }
  const accounts = rule.accounts ? rule.accounts.join(', ') : `${rule.accountFrom}–${rule.accountTo}`;
  return `konto ${accounts}${rule.project ? `, prosjekt ${rule.project}` : ''}`;
};

const actualDetails = (rows) => {
  const totals = new Map();
  for (const row of rows) {
    const account = text(row.account);
    totals.set(account, (totals.get(account) ?? 0) + (number(row.amount_tusen) ?? 0));
  }
  return [...totals.entries()]
    .filter(([, value]) => Math.abs(value) > 1e-12)
    .sort(([left], [right]) => left.localeCompare(right, 'nb'))
    .map(([label, value]) => ({ label, value }));
};

export const classifyParquetRows = (datasets) => {
  let actual;
  let budgetHeader;
  let budgetValue;
  let calculated;

  for (const dataset of datasets) {
    const columns = new Set(Object.keys(dataset.rows[0] ?? {}));
    if (columns.has('period_key') && columns.has('finansiering') && columns.has('tittel')) {
      if (calculated) throw new Error('Det er valgt mer enn én beregnet KPI-Parquet');
      calculated = dataset;
    } else if (columns.has('dim_4') && columns.has('account') && columns.has('period') && columns.has('amount')) {
      if (actual) throw new Error('Det er valgt mer enn én hovedboksfil');
      actual = dataset;
    } else if (columns.has('version') && columns.has('trans_id') && columns.has('account')) {
      if (budgetHeader) throw new Error('Det er valgt mer enn én budsjettfil med transaksjonshoder');
      budgetHeader = dataset;
    } else if (columns.has('trans_id') && columns.has('period') && columns.has('amount')) {
      if (budgetValue) throw new Error('Det er valgt mer enn én budsjettfil med periodeverdier');
      budgetValue = dataset;
    } else {
      throw new Error(`Kjenner ikke Parquet-skjemaet i «${dataset.name}»`);
    }
  }

  return { actual, budgetHeader, budgetValue, calculated };
};

const normalizeCalculatedRows = (rows) => rows.map((row) => ({
  ...row,
  period_key: text(row.period_key),
  finansiering: text(row.finansiering),
  metric: text(row.metric),
  tittel: text(row.tittel),
  end_period: text(row.end_period),
  hovedbok_nok1000: number(row.hovedbok_nok1000),
  budsjett_nok1000: number(row.budsjett_nok1000),
  budsjettandel: number(row.budsjettandel),
  prosentverdi: number(row.prosentverdi),
  gjenstaar_nok1000: number(row.gjenstaar_nok1000),
  kommentar: row.kommentar === undefined ? null : row.kommentar,
  grunnlag_json: row.grunnlag_json ?? null,
  regelversjon: text(row.regelversjon),
  budsjettversjon: text(row.budsjettversjon),
  beregningsregel: text(row.beregningsregel)
}));

const validateDetails = (value, key) => {
  if (value === null || value === '') throw new Error(`Mangler grunnlag_json for ${key}`);
  try {
    const details = JSON.parse(value);
    if (!Array.isArray(details)) throw new Error();
    for (const detail of details) {
      if (!text(detail?.label) || number(detail?.value) === null) throw new Error();
    }
    return details;
  } catch {
    throw new Error(`Ugyldig grunnlag_json for ${key}`);
  }
};

const closeEnough = (left, right) => Math.abs(left - right) <= 1e-8 * Math.max(1, Math.abs(right));

export const validateCalculatedRows = (inputRows) => {
  const rows = normalizeCalculatedRows(inputRows);
  const periods = rows.every((row) => Object.hasOwn(PERIODS, row.period_key))
    ? PERIODS
    : LEGACY_PERIODS;
  const expectedCalculatedRows = expectedRowsFor(periods);
  if (rows.length !== expectedCalculatedRows.size) {
    throw new Error(`Beregnet KPI-Parquet må inneholde nøyaktig ${expectedCalculatedRows.size} rader`);
  }

  const seen = new Set();
  for (const row of rows) {
    const key = `${row.period_key}|${row.finansiering}|${row.metric}`;
    const rule = expectedCalculatedRows.get(key);
    if (!rule) throw new Error(`Ukjent periode, finansiering eller KPI: ${key}`);
    if (seen.has(key)) throw new Error(`Duplikat KPI-rad: ${key}`);
    seen.add(key);
    if (row.tittel !== rule.title) {
      throw new Error(`Feil tittel for ${key}: forventet «${rule.title}»`);
    }
    if (row.end_period !== periods[row.period_key]) {
      throw new Error(`Feil sluttperiode for ${key}: forventet ${periods[row.period_key]}`);
    }
    if (row.regelversjon !== BUSINESS_RULE_VERSION) {
      throw new Error(
        `Beregnet KPI-Parquet må ha regelversjon ${BUSINESS_RULE_VERSION} på alle rader`
      );
    }
    if (row.budsjettversjon !== BUDGET_VERSION) {
      throw new Error(`Beregnet KPI-Parquet må ha budsjettversjon ${BUDGET_VERSION} på alle rader`);
    }
    if (row.beregningsregel !== calculationRule(rule)) {
      throw new Error(`Ugyldig beregningsregel for ${key}`);
    }
    const details = validateDetails(row.grunnlag_json, key);

    if (rule.ratioNumerator) {
      if (row.prosentverdi === null) throw new Error(`Mangler prosentverdi for ${key}`);
      const numerator = details.find((detail) => detail.label === 'Lønnskostnader');
      const denominator = details.find((detail) => detail.label === 'Totale kostnader');
      if (!numerator || !denominator || number(denominator.value) === 0) {
        throw new Error(`Ufullstendig prosentgrunnlag for ${key}`);
      }
      const calculatedRatio = number(numerator.value) / number(denominator.value);
      if (!closeEnough(calculatedRatio, row.prosentverdi)) {
        throw new Error(`Prosentverdi stemmer ikke med grunnlaget for ${key}`);
      }
      row.hovedbok_nok1000 = row.prosentverdi;
      row.budsjett_nok1000 = null;
      row.budsjettandel = null;
      row.status = null;
      row.status_tekst = null;
      row.gjenstaar_nok1000 = -row.prosentverdi;
      continue;
    }

    if (row.hovedbok_nok1000 === null) throw new Error(`Mangler hovedbok_nok1000 for ${key}`);
    const detailTotal = details.reduce((total, detail) => total + number(detail.value), 0);
    if (!closeEnough(detailTotal, row.hovedbok_nok1000)) {
      throw new Error(`Hovedbokbeløp stemmer ikke med grunnlaget for ${key}`);
    }
    row.prosentverdi = null;
    const [budgetShare, rowStatus, statusText] = status(
      row.hovedbok_nok1000,
      row.budsjett_nok1000
    );
    row.budsjettandel = budgetShare;
    row.status = rowStatus;
    row.status_tekst = statusText;
    row.gjenstaar_nok1000 = row.budsjett_nok1000 === null
      ? null
      : row.budsjett_nok1000 - row.hovedbok_nok1000;
    if (row.budsjett_nok1000 === null && !row.kommentar) row.kommentar = 'Mangler budsjett';
  }

  if (seen.size !== expectedCalculatedRows.size) {
    throw new Error('Beregnet KPI-Parquet mangler én eller flere forventede KPI-rader');
  }
  return rows;
};

export const buildDashboardRowsFromSources = ({ actualRows, budgetHeaderRows, budgetValueRows }) => {
  const actual = actualRows
    .map((row) => ({
      account: text(row.account),
      dim_4: text(row.dim_4),
      dim_2: text(row.dim_2),
      period: text(row.period),
      amount_tusen: (number(row.amount) ?? 0) / 1000
    }))
    .filter((row) => row.period >= '202601' && row.period <= '202607');

  const headers = new Map(
    budgetHeaderRows
      .filter((row) => text(row.version) === BUDGET_VERSION)
      .map((row) => [text(row.trans_id), row])
  );
  const budget = budgetValueRows.flatMap((valueRow) => {
    const header = headers.get(text(valueRow.trans_id));
    const period = text(valueRow.period);
    if (!header || period < '202601' || period > '202607') return [];
    return [{
      account: text(header.account),
      dim_1: text(header.dim_1),
      dim_2: text(header.dim_2),
      financing: budgetFinancing(header.dim_1),
      period,
      amount_tusen: (number(valueRow.amount) ?? 0) / 1000
    }];
  });

  const result = [];
  for (const [periodKey, endPeriod] of Object.entries(PERIODS)) {
    for (const rule of METRIC_RULES) {
      const actualScope = actual.filter((row) =>
        actualMatchesFinancing(row, rule.financing)
        && row.period >= '202601'
        && row.period <= endPeriod
        && (!rule.project || row.dim_2 === rule.project)
      );

      if (rule.ratioNumerator && rule.ratioDenominator) {
        const numerator = ratioSum(actualScope, rule.ratioNumerator);
        const denominator = ratioSum(actualScope, rule.ratioDenominator);
        const ratio = denominator ? numerator / denominator : null;
        const details = [
          { label: 'Lønnskostnader', value: numerator },
          { label: 'Totale kostnader', value: denominator }
        ];
        if (ratio !== null) details.push({ label: 'Andel (%)', value: ratio * 100, format: 'pct' });
        result.push({
          period_key: periodKey,
          end_period: endPeriod,
          finansiering: rule.financing,
          metric: rule.metric,
          tittel: rule.title,
          hovedbok_nok1000: ratio,
          budsjett_nok1000: null,
          budsjettandel: null,
          status: null,
          status_tekst: null,
          prosentverdi: ratio,
          gjenstaar_nok1000: ratio === null ? null : -ratio,
          kommentar: null,
          grunnlag_json: JSON.stringify(details),
          beregningsregel: calculationRule(rule),
          regelversjon: BUSINESS_RULE_VERSION,
          budsjettversjon: BUDGET_VERSION
        });
        continue;
      }

      const actualSelected = actualScope.filter((row) => accountMatches(row, rule));
      const budgetSelected = budget.filter((row) =>
        row.financing === rule.financing
        && row.period >= '202601'
        && row.period <= endPeriod
        && (!rule.project || row.dim_2 === rule.project)
        && accountMatches(row, rule)
      );
      const actualTotal = sumAmounts(actualSelected);
      const budgetTotal = budgetSelected.length ? sumAmounts(budgetSelected) : null;
      const [budgetShare, rowStatus, statusText] = status(actualTotal, budgetTotal);
      result.push({
        period_key: periodKey,
        end_period: endPeriod,
        finansiering: rule.financing,
        metric: rule.metric,
        tittel: rule.title,
        hovedbok_nok1000: actualTotal,
        budsjett_nok1000: budgetTotal,
        budsjettandel: budgetShare,
        status: rowStatus,
        status_tekst: statusText,
        prosentverdi: null,
        gjenstaar_nok1000: budgetTotal === null ? null : budgetTotal - actualTotal,
        kommentar: budgetTotal === null ? 'Mangler budsjett' : null,
        grunnlag_json: JSON.stringify(actualDetails(actualSelected)),
        beregningsregel: calculationRule(rule),
        regelversjon: BUSINESS_RULE_VERSION,
        budsjettversjon: BUDGET_VERSION
      });
    }
  }
  return result;
};

export const readParquetFile = async (file) => ({
  name: file.name,
  rows: await parquetReadObjects({ file: await file.arrayBuffer(), compressors })
});

const validateSelectedParquetFiles = (files) => {
  const selected = Array.from(files ?? []);
  if (!selected.length) throw new Error('Velg Parquet-filer');
  if (selected.some((file) => !file.name.toLowerCase().endsWith('.parquet'))) {
    throw new Error('Alle valgte filer må være Parquet-filer');
  }
  const totalBytes = selected.reduce((total, file) => total + file.size, 0);
  if (totalBytes > 150 * 1024 * 1024) {
    throw new Error('Parquet-filene kan samlet være maksimalt 150 MB');
  }
  return selected;
};

const requireColumns = (dataset, columns) => {
  const available = new Set(Object.keys(dataset.rows[0] ?? {}));
  for (const column of columns) {
    if (!available.has(column)) throw new Error(`«${dataset.name}» mangler kolonnen «${column}»`);
  }
};

const validatePeriod = (value, context) => {
  const period = text(value);
  if (!/^\d{6}$/.test(period) || Number(period.slice(4)) < 1 || Number(period.slice(4)) > 12) {
    throw new Error(`Ugyldig periode «${period || '(tom)'}» i ${context}`);
  }
  return period;
};

const requireReportingCoverage = (periods, label) => {
  const reportingPeriods = periods.filter((period) => period >= '202601' && period <= '202606');
  if (!reportingPeriods.length || reportingPeriods.sort()[0] !== '202601' || reportingPeriods.at(-1) !== '202606') {
    throw new Error(`${label} må dekke perioden 202601–202606`);
  }
};

export const validateOperationalDatasets = ({ actual, budgetHeader, budgetValue }) => {
  requireColumns(actual, ['account', 'dim_4', 'dim_2', 'period', 'amount']);
  requireColumns(budgetHeader, ['trans_id', 'account', 'dim_1', 'dim_2', 'version']);
  requireColumns(budgetValue, ['trans_id', 'period', 'amount']);

  if (!actual.rows.length || !budgetHeader.rows.length || !budgetValue.rows.length) {
    throw new Error('Ingen av de operative Parquet-filene kan være tomme');
  }

  const actualPeriods = [];
  let relevantActualRows = 0;
  actual.rows.forEach((row, index) => {
    const period = validatePeriod(row.period, `${actual.name}, rad ${index + 1}`);
    if (period < '202601' || period > '202606') return;
    const financing = text(row.dim_4);
    if (!['154301', '154345', '154322', '045101'].includes(financing)) return;
    if (!text(row.account)) {
      throw new Error(`Mangler konto eller finansiering i ${actual.name}, rad ${index + 1}`);
    }
    if (number(row.amount) === null) {
      throw new Error(`Ugyldig beløp i ${actual.name}, rad ${index + 1}`);
    }
    actualPeriods.push(period);
    relevantActualRows += 1;
  });
  requireReportingCoverage(actualPeriods, 'Hovedboksfilen');
  if (!relevantActualRows) throw new Error('Hovedboksfilen inneholder ingen relevante finansieringer');

  const currentHeaders = new Map();
  budgetHeader.rows.forEach((row, index) => {
    if (text(row.version) !== BUDGET_VERSION) return;
    const transId = text(row.trans_id);
    if (!transId || !text(row.account) || !text(row.dim_1)) {
      throw new Error(`Mangler koblingsnøkkel, konto eller budsjettdimensjon i ${budgetHeader.name}, rad ${index + 1}`);
    }
    if (currentHeaders.has(transId)) {
      throw new Error(`Duplikat trans_id «${transId}» for budsjettversjon ${BUDGET_VERSION}`);
    }
    currentHeaders.set(transId, row);
  });
  if (!currentHeaders.size) {
    throw new Error(`Budsjettfilen inneholder ingen rader for versjon ${BUDGET_VERSION}`);
  }

  const budgetPeriods = [];
  const seenValues = new Set();
  let currentValueRows = 0;
  budgetValue.rows.forEach((row, index) => {
    const transId = text(row.trans_id);
    if (!transId) throw new Error(`Mangler trans_id i ${budgetValue.name}, rad ${index + 1}`);
    const header = currentHeaders.get(transId);
    if (!header) return;
    const period = validatePeriod(row.period, `${budgetValue.name}, rad ${index + 1}`);
    if (period < '202601' || period > '202606') return;
    if (number(row.amount) === null) {
      throw new Error(`Ugyldig beløp i ${budgetValue.name}, rad ${index + 1}`);
    }
    const valueKey = `${transId}|${period}`;
    if (seenValues.has(valueKey)) throw new Error(`Duplikat budsjettverdi for ${valueKey}`);
    seenValues.add(valueKey);
    budgetPeriods.push(period);
    currentValueRows += 1;
  });
  if (!currentValueRows) {
    throw new Error(`Budsjettverdifilen inneholder ingen verdier for versjon ${BUDGET_VERSION}`);
  }
  requireReportingCoverage(budgetPeriods, `Budsjettversjon ${BUDGET_VERSION}`);
};

export const loadOperationalParquetFiles = async (files) => {
  const selected = validateSelectedParquetFiles(files);
  if (selected.length !== 3) {
    throw new Error('Operativ import krever nøyaktig tre Parquet-filer');
  }
  const datasets = await Promise.all(selected.map(readParquetFile));
  const { actual, budgetHeader, budgetValue, calculated } = classifyParquetRows(datasets);
  if (calculated || !actual || !budgetHeader || !budgetValue) {
    throw new Error('Velg agltransact, apltransact og apltransactvalue samtidig');
  }
  validateOperationalDatasets({ actual, budgetHeader, budgetValue });
  return buildDashboardRowsFromSources({
    actualRows: actual.rows,
    budgetHeaderRows: budgetHeader.rows,
    budgetValueRows: budgetValue.rows
  });
};

export const loadCalculatedParquetFile = async (files) => {
  const selected = validateSelectedParquetFiles(files);
  if (selected.length !== 1) {
    throw new Error('Beregnet import krever nøyaktig én KPI-Parquet');
  }
  const datasets = await Promise.all(selected.map(readParquetFile));
  const { actual, budgetHeader, budgetValue, calculated } = classifyParquetRows(datasets);
  if (!calculated || actual || budgetHeader || budgetValue) {
    throw new Error('Filen har ikke skjema for beregnede KPI-er');
  }
  const aggregateRows = calculated.rows.some((row) => text(row.section_code))
    ? calculated.rows.filter((row) => text(row.section_code) === 'all')
    : calculated.rows;
  return validateCalculatedRows(aggregateRows);
};

export const loadDashboardRowsFromParquetFiles = async (files) => {
  const selected = validateSelectedParquetFiles(files);
  return selected.length === 1
    ? loadCalculatedParquetFile(selected)
    : loadOperationalParquetFiles(selected);
};
