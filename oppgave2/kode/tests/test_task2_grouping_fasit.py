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
            CONTRACT.generated_dir("oppgave2") / "evidence" / "grouped_finance_rows.parquet"
        )
        connection = duckdb.connect()
        try:
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
                comparison = expected_accounts[["konto", *COMPARISON_COLUMNS]].merge(
                    calculated_accounts[["konto", *COMPARISON_COLUMNS]],
                    on="konto",
                    how="left",
                    suffixes=("_fasit", "_beregnet"),
                    validate="one_to_one",
                )
                self.assertFalse(comparison.filter(like="_beregnet").isna().all(axis=1).any())
                for column in COMPARISON_COLUMNS:
                    difference = (
                        comparison[f"{column}_fasit"].fillna(0)
                        - comparison[f"{column}_beregnet"].fillna(0)
                    ).abs()
                    self.assertTrue(
                        bool((difference <= TOLERANCE).all()),
                        f"{financing}: avvik i {column}",
                    )

                expected_total = expected[expected["radtekst"] == "Driftskostnader"].iloc[0]
                calculated_total = calculated[calculated["radtekst"] == "Driftskostnader"].iloc[0]
                for column in COMPARISON_COLUMNS:
                    expected_value = 0.0 if pd.isna(expected_total[column]) else float(expected_total[column])
                    calculated_value = 0.0 if pd.isna(calculated_total[column]) else float(calculated_total[column])
                    self.assertLessEqual(abs(expected_value - calculated_value), TOLERANCE)
