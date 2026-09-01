export const MISSING_FINANCING = 'Uten finansiering';

// Finansieringen kommer fra dim_4. Koststed skal aldri gi en reservekode.
export const normalizeFinancing = (value) => {
  const code = String(value ?? '').trim();
  return /^\d{1,6}$/.test(code) ? code.padStart(6, '0') : code || MISSING_FINANCING;
};

export const reportFinancing = (value) => {
  const code = normalizeFinancing(value);
  return ['154322', '045101'].includes(code) ? '154322+045101' : code;
};

export const financingSql = (field) => {
  const value = `nullif(trim(cast(${field} as varchar)), '')`;
  const code = `(case when regexp_full_match(${value}, '[0-9]{1,6}') then lpad(${value}, 6, '0') else ${value} end)`;
  return `case when ${code} in ('154322', '045101') then '154322+045101' else coalesce(${code}, '${MISSING_FINANCING}') end`;
};

export const requireBudgetFinancing = async (db) => {
  const columns = await db.query("describe select * from read_parquet('apltransact.parquet')");
  if (!columns.some((column) => column.column_name === 'dim_4')) {
    throw new Error('apltransact.parquet mangler dim_4 (finansiering). Velg et oppdatert budsjettuttrekk.');
  }
};
