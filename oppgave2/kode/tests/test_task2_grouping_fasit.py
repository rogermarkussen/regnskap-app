from __future__ import annotations

import unittest

import duckdb
import pandas as pd

from scripts.prepare_data import REPORT_VALUE_COLUMNS
from tests.fasit_support import CONTRACT, grouped_finance_fasit_rows_frame


TOLERANCE = 0.00001
COMPARISON_COLUMNS = [*REPORT_VALUE_COLUMNS, "forbruk_av_aarets_budsjett"]


class Task2GroupingFasitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        calculated_path = (
            CONTRACT.generated_dir("oppgave2") / "static-app" / "grouped_finance_rows.parquet"
        )
        connection = duckdb.connect()
        try:
            columns = {
                row[0]
                for row in connection.execute(
                    f"describe select * from read_parquet('{calculated_path.as_posix()}')"
                ).fetchall()
            }
            if "report_year" in columns:
                cls.new_schema = True
                cls.comparison_columns = [
                    column
                    for column in COMPARISON_COLUMNS
                    if column
                    not in {"kontant_budsjett_tusen", "kontant_avvik_tusen"}
                ]
                cls.calculated = connection.execute(
                    f"""
                    select *
                    from read_parquet('{calculated_path.as_posix()}')
                    where report_year = 2026
                      and period_to = 202603
                      and section_code = 'all'
                    """
                ).df()
                cls.calculated = cls.calculated.rename(
                    columns={
                        f"budsjett_{month:02d}_tusen": f"budsjett_2026{month:02d}_tusen"
                        for month in range(1, 13)
                    }
                )
            else:
                cls.new_schema = False
                cls.comparison_columns = COMPARISON_COLUMNS
                cls.calculated = connection.execute(
                    f"select * from read_parquet('{calculated_path.as_posix()}') where rapportperiode = 'p1_3'"
                ).df()
        finally:
            connection.close()
        cls.fasit = grouped_finance_fasit_rows_frame()

    def test_calculated_accounts_and_totals_match_independent_fasit(self) -> None:
        for financing in ("154301", "alle"):
            with self.subTest(financing=financing):
                calculated = self.calculated[self.calculated["finansiering"] == financing]
                expected = self.fasit[self.fasit["finansiering"] == financing]
                expected_accounts = expected[expected["row_type"] == "account"]
                calculated_accounts = calculated[calculated["row_type"] == "account"]
                comparison = expected_accounts[["konto", *self.comparison_columns]].merge(
                    calculated_accounts[["konto", *self.comparison_columns]],
                    on="konto",
                    how="left",
                    suffixes=("_fasit", "_beregnet"),
                    validate="one_to_one",
                )
                missing = comparison[
                    comparison.filter(like="_beregnet").isna().all(axis=1)
                ]
                missing_nonzero = missing[
                    missing[
                        [f"{column}_fasit" for column in self.comparison_columns]
                    ]
                    .fillna(0)
                    .abs()
                    .max(axis=1)
                    > TOLERANCE
                ]
                self.assertTrue(
                    missing_nonzero.empty,
                    f"{financing}: mangler fasitkontoer med verdi",
                )
                for column in self.comparison_columns:
                    comparable = comparison
                    if self.new_schema and column == "avvik_tusen":
                        comparable = comparison[
                            comparison["virksomhet_budsjett_tusen_beregnet"].notna()
                        ]
                    elif self.new_schema and column == "forbruk_av_aarets_budsjett":
                        comparable = comparison[
                            comparison["aarets_budsjett_tusen_beregnet"].notna()
                        ]
                    difference = (
                        comparable[f"{column}_fasit"].fillna(0)
                        - comparable[f"{column}_beregnet"].fillna(0)
                    ).abs()
                    self.assertTrue(
                        bool((difference <= TOLERANCE).all()),
                        f"{financing}: avvik i {column}",
                    )

                expected_total = expected[expected["radtekst"] == "Driftskostnader"].iloc[0]
                if self.new_schema:
                    total_accounts = calculated_accounts[
                        calculated_accounts["konto"].isin(expected_accounts["konto"])
                        & calculated_accounts["konto"].astype(int).between(5000, 7834)
                    ]
                    total_comparison_incomplete = (
                        (total_accounts["hovedbok_tusen"].fillna(0).abs() > TOLERANCE)
                        & total_accounts["virksomhet_budsjett_tusen"].isna()
                    ).any()
                    calculated_values = {
                        column: float(total_accounts[column].fillna(0).sum())
                        for column in self.comparison_columns
                        if column != "forbruk_av_aarets_budsjett"
                    }
                    annual = calculated_values["aarets_budsjett_tusen"]
                    calculated_values["forbruk_av_aarets_budsjett"] = (
                        None
                        if annual == 0
                        else calculated_values["hovedbok_tusen"] / annual
                    )
                else:
                    calculated_total = calculated[
                        calculated["radtekst"] == "Driftskostnader"
                    ].iloc[0]
                    calculated_values = {
                        column: calculated_total[column]
                        for column in self.comparison_columns
                    }
                for column in self.comparison_columns:
                    if (
                        self.new_schema
                        and total_comparison_incomplete
                        and column in {"avvik_tusen", "forbruk_av_aarets_budsjett"}
                    ):
                        continue
                    expected_value = 0.0 if pd.isna(expected_total[column]) else float(expected_total[column])
                    raw_calculated = calculated_values[column]
                    calculated_value = 0.0 if pd.isna(raw_calculated) else float(raw_calculated)
                    self.assertLessEqual(abs(expected_value - calculated_value), TOLERANCE)
