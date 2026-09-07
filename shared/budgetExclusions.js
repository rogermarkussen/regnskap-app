// Brukerbeslutning 08.09.2026: posten er flyttet til transaksjon 5733017 på 771.
// Kildedata beholdes; kun den bekreftede dobbeltføringen i 2026RV utelates.
export const includeBudgetHeader = (row) => !(
  String(row.version ?? '').trim() === '2026RV'
  && String(row.trans_id ?? '').trim() === '5219663'
  && String(row.dim_1 ?? '').trim() === '711'
);

export const budgetInclusionSql = (alias = 'h') => `not (
  coalesce(trim(cast(${alias}.version as varchar)), '') = '2026RV'
  and coalesce(trim(cast(${alias}.trans_id as varchar)), '') = '5219663'
  and coalesce(trim(cast(${alias}.dim_1 as varchar)), '') = '711'
)`;
