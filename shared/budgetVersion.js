// Revidert budsjett er vedtatt beregningsgrunnlag for rapportåret 2026.
export const budgetVersionForYear = (year) => String(year) === '2026' ? '2026RV' : `${year}B`;

export const budgetVersionSql = (yearExpression) =>
  `case when cast(${yearExpression} as varchar) = '2026' then '2026RV' else cast(${yearExpression} as varchar) || 'B' end`;
