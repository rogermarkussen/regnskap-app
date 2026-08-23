"""Oppgave 1: beregn først fra Parquet, sammenlign deretter med Excel-fasit."""

from __future__ import annotations

import math
import json
import tempfile
import unittest
from pathlib import Path
import sys

import duckdb
from openpyxl import load_workbook

from scripts.dashboard_kpi_data import (
    BUSINESS_RULE_VERSION,
    _budget_financing,
    build_dashboard_kpi_frame,
    build_dashboard_kpi_metadata_frame,
)


CODE_ROOT = Path(__file__).resolve().parents[1]
ROOT = CODE_ROOT.parent
REPO_ROOT = ROOT.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import load_data_contract


FASIT = load_data_contract(REPO_ROOT).path("fasit.dashboard_kpi")


class Task1ExcelFasitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.calculated = build_dashboard_kpi_frame(ROOT)
        cls.aggregate = cls.calculated[cls.calculated["section_code"] == "all"]
        cls.fasit = load_workbook(FASIT, read_only=True, data_only=True)[
            "Dashboard med tall"
        ]

    def value(
        self,
        period: str,
        financing: str,
        metric: str,
        column: str,
    ) -> float:
        match = self.aggregate[
            (self.aggregate["period_key"] == period)
            & (self.aggregate["finansiering"] == financing)
            & (self.aggregate["metric"] == metric)
        ]
        self.assertEqual(len(match), 1)
        return float(match.iloc[0][column])

    def assert_matches(
        self,
        period: str,
        financing: str,
        metric: str,
        column: str,
        cell: str,
    ) -> None:
        calculated = self.value(period, financing, metric, column)
        expected = float(self.fasit[cell].value)
        self.assertTrue(
            math.isclose(calculated, expected, abs_tol=1e-8),
            (
                f"{financing} {metric} {column}: beregnet {calculated:.12f}, "
                f"Excel {expected:.12f}, avvik {calculated - expected:.12f}"
            ),
        )

    def test_alle_uavhengig_reproduserbare_dashboardtall(self) -> None:
        checks = [
            ("202603", "154301", "ADK", "budsjett_nok1000", "D10"),
            (
                "202603",
                "154301",
                "Konsulentkostnader",
                "hovedbok_nok1000",
                "C11",
            ),
            (
                "202603",
                "154301",
                "Konsulentkostnader",
                "budsjett_nok1000",
                "D11",
            ),
            ("202603", "154301", "Reisekostnader", "hovedbok_nok1000", "C12"),
            ("202603", "154301", "Reisekostnader", "budsjett_nok1000", "D12"),
            ("202603", "154301", "Overtid", "hovedbok_nok1000", "C13"),
            ("202603", "154301", "Overtid", "budsjett_nok1000", "D13"),
            (
                "202604",
                "154345",
                "Totalt regnskap vs budsjett",
                "hovedbok_nok1000",
                "C21",
            ),
            (
                "202604",
                "154345",
                "Totalt regnskap vs budsjett",
                "budsjett_nok1000",
                "D21",
            ),
            (
                "202603",
                "154322+045101",
                "ADK",
                "hovedbok_nok1000",
                "C29",
            ),
            (
                "202603",
                "154322+045101",
                "ADK",
                "budsjett_nok1000",
                "D29",
            ),
            (
                "202603",
                "154322+045101",
                "Testlab",
                "hovedbok_nok1000",
                "C30",
            ),
        ]
        for check in checks:
            with self.subTest(cell=check[-1]):
                self.assert_matches(*check)

    def test_tidligere_kildeavvik_er_lukket_av_nyere_hovedbok(self) -> None:
        calculated_adk = self.value("202603", "154301", "ADK", "hovedbok_nok1000")
        expected_adk = float(self.fasit["C10"].value)
        self.assertAlmostEqual(calculated_adk, expected_adk, delta=0.00001)

        calculated_ratio = self.value(
            "202603",
            "154301",
            "Lønnsandel av totale kostnader",
            "prosentverdi",
        )
        expected_ratio = float(self.fasit["C15"].value)
        self.assertAlmostEqual(calculated_ratio, expected_ratio, delta=1e-10)

    def test_alle_63_kortlinjer_har_sporbart_regnestykke(self) -> None:
        self.assertEqual(len(self.aggregate), 63)
        self.assertEqual(
            set(self.calculated["kilde_hovedbok"]), {"agltransact.parquet"}
        )
        self.assertTrue(
            self.calculated["kilde_budsjett"].str.contains("apltransact.parquet").all()
        )

        for row in self.aggregate.itertuples():
            with self.subTest(period=row.period_key, metric=row.metric):
                details = json.loads(row.grunnlag_json)
                if not math.isnan(float(row.prosentverdi)):
                    self.assertEqual(len(details), 3)
                    self.assertAlmostEqual(
                        float(row.prosentverdi),
                        float(details[0]["value"]) / float(details[1]["value"]),
                    )
                    continue

                self.assertAlmostEqual(
                    sum(float(detail["value"]) for detail in details),
                    float(row.hovedbok_nok1000),
                    places=9,
                )
                if not math.isnan(float(row.budsjett_nok1000)):
                    self.assertAlmostEqual(
                        float(row.gjenstaar_nok1000),
                        float(row.budsjett_nok1000) - float(row.hovedbok_nok1000),
                    )
                    if float(row.budsjett_nok1000) != 0:
                        self.assertAlmostEqual(
                            float(row.budsjettandel),
                            float(row.hovedbok_nok1000) / float(row.budsjett_nok1000),
                        )

    def test_kildemetadata_identifiserer_det_lokale_datasettet(self) -> None:
        metadata = build_dashboard_kpi_metadata_frame(ROOT).iloc[0]
        self.assertRegex(str(metadata["datasett_id"]), r"^[0-9a-f]{64}$")
        self.assertEqual(metadata["datasett_id_kort"], metadata["datasett_id"][:12])
        self.assertGreaterEqual(str(metadata["hovedbok_periode_til"]), "202606")
        self.assertGreaterEqual(str(metadata["budsjett_periode_til"]), "202606")
        self.assertEqual(
            metadata["uttrekkstidspunkt_status"], "Ikke dokumentert i kildefilene"
        )
        self.assertEqual(metadata["periodestatus"], "Ikke dokumentert i kildefilene")

    def test_godkjente_forretningsregler_er_versjonert(self) -> None:
        self.assertEqual(set(self.calculated["regelversjon"]), {BUSINESS_RULE_VERSION})
        self.assertEqual(set(self.calculated["budsjettversjon"]), {"2026B"})
        self.assertEqual(_budget_financing("212"), "154345")
        self.assertEqual(_budget_financing("761"), "154322+045101")
        self.assertEqual(_budget_financing("711"), "154301")

        ratio = self.calculated[
            (self.calculated["section_code"] == "all")
            & (self.calculated["period_key"] == "202603")
            & (self.calculated["finansiering"] == "154322+045101")
            & (self.calculated["metric"] == "Lønnsandel av totale kostnader")
        ].iloc[0]
        self.assertEqual(ratio["beregningsregel"], "konto 5000–5999 / konto 5000–7834")
        self.assertNotAlmostEqual(
            float(ratio["prosentverdi"]),
            float(self.fasit["C32"].value),
            places=8,
            msg="Godkjent total-kost-nevner skal ikke endres tilbake til gammel Excel-regel",
        )

        testlab = self.calculated[
            (self.calculated["section_code"] == "all")
            & (self.calculated["period_key"] == "202603")
            & (self.calculated["finansiering"] == "154322+045101")
            & (self.calculated["metric"] == "Testlab")
        ].iloc[0]
        self.assertEqual(testlab["beregningsregel"], "konto 5000–7834, prosjekt 7114")

    def test_manglende_testlab_budsjett_blir_ikke_gjort_til_excel_null(self) -> None:
        match = self.calculated[
            (self.calculated["section_code"] == "all")
            & (self.calculated["period_key"] == "202603")
            & (self.calculated["finansiering"] == "154322+045101")
            & (self.calculated["metric"] == "Testlab")
        ].iloc[0]
        self.assertTrue(math.isnan(float(match["budsjett_nok1000"])))
        self.assertEqual(float(self.fasit["D30"].value), 0.0)
        self.assertEqual(match["kommentar"], "Mangler budsjett")

    def test_endret_raapost_endrer_svarene_etter_formelen(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            base_path = temp / "actual_base.parquet"
            changed_path = temp / "actual_changed.parquet"
            connection = duckdb.connect()
            try:
                connection.execute(
                    f"""
                    copy (
                      select * from (
                        values
                          ('5000', '154301', null, '251', '202603', 10000.0),
                          ('6700', '154301', null, '251', '202603', 1000.0)
                      ) as t(account, dim_4, dim_2, dim_1, period, amount)
                    ) to '{base_path.as_posix()}' (format parquet)
                    """
                )
                connection.execute(
                    f"""
                    copy (
                      select * from (
                        values
                          ('5000', '154301', null, '251', '202603', 10000.0),
                          ('6700', '154301', null, '251', '202603', 2000.0)
                      ) as t(account, dim_4, dim_2, dim_1, period, amount)
                    ) to '{changed_path.as_posix()}' (format parquet)
                    """
                )
            finally:
                connection.close()

            before = build_dashboard_kpi_frame(ROOT, actual_path=base_path)
            after = build_dashboard_kpi_frame(ROOT, actual_path=changed_path)

        def metric(frame, name):
            return frame[
                (frame["section_code"] == "all")
                & (frame["period_key"] == "202603")
                & (frame["finansiering"] == "154301")
                & (frame["metric"] == name)
            ].iloc[0]

        self.assertAlmostEqual(
            float(metric(after, "Konsulentkostnader")["hovedbok_nok1000"])
            - float(metric(before, "Konsulentkostnader")["hovedbok_nok1000"]),
            1.0,
        )
        self.assertAlmostEqual(
            float(metric(after, "ADK")["hovedbok_nok1000"])
            - float(metric(before, "ADK")["hovedbok_nok1000"]),
            1.0,
        )
        self.assertNotEqual(
            metric(after, "Lønnsandel av totale kostnader")["prosentverdi"],
            metric(before, "Lønnsandel av totale kostnader")["prosentverdi"],
        )
        self.assertEqual(
            metric(after, "Overtid")["hovedbok_nok1000"],
            metric(before, "Overtid")["hovedbok_nok1000"],
        )

    def test_produksjonssiden_leser_ikke_fasit(self) -> None:
        page = (CODE_ROOT / "pages" / "index.md").read_text(encoding="utf-8")
        component = (CODE_ROOT / "components" / "ExecutiveDashboard.svelte").read_text(
            encoding="utf-8"
        )
        calculation = (CODE_ROOT / "scripts" / "dashboard_kpi_data.py").read_text(
            encoding="utf-8"
        )

        self.assertIn("dashboard_kpi_calculated", page)
        self.assertNotIn("from dashboard_kpi\n", page)
        self.assertFalse((CODE_ROOT / "pages" / "validation.md").exists())
        self.assertNotIn('href="/validation"', component)
        self.assertFalse((CODE_ROOT / "pages" / "prosjektoversikt.md").exists())
        self.assertNotIn('href="/prosjektoversikt"', component)
        self.assertNotIn('accept=".xlsx,application/', component)
        self.assertNotIn('accept=".csv,text/csv"', component)
        self.assertNotIn("XLSX.read(await file.arrayBuffer()", component)
        self.assertNotIn("Last opp Excel", component)
        self.assertNotIn("Last opp operative Parquet", component)
        self.assertNotIn("Avansert dataimport", component)
        self.assertNotIn("Last ned som Excel", component)
        self.assertNotIn("kpi-dashboard-2026-", component)
        self.assertNotIn("Last opp beregnet Parquet", component)
        self.assertNotIn("Aktiver data", component)
        self.assertNotIn("localStorage", component)
        self.assertNotIn("Last opp CSV", component)
        self.assertIn("NOK 1 000", component)
        self.assertNotIn("/dashboard_cards.json", component)
        self.assertFalse((CODE_ROOT / "static" / "dashboard_cards.json").exists())
        self.assertFalse(
            (CODE_ROOT / "sources" / "regnskap" / "dashboard_kpi.sql").exists()
        )
        self.assertNotIn("'fasit'", component)
        self.assertNotIn("Fasit/", calculation)
        self.assertNotIn("openpyxl", calculation)
        self.assertNotIn(".xlsx", calculation)
        self.assertNotIn("data-fra-økonomi", calculation)

        copied_answers = (
            "19729.169889",
            "34637.325491",
            "7906.93518",
            "9686.77782",
            "5015.27399",
            "9186.33332",
            "12491.56045",
            "22809.75",
        )
        for answer in copied_answers:
            with self.subTest(answer=answer):
                self.assertNotIn(answer, calculation)
                self.assertNotIn(answer, component)

    def test_beregningen_fungerer_uten_at_fasitmappen_finnes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            isolated_root = Path(temp_dir)
            self.assertFalse((isolated_root / "Fasit").exists())
            contract = load_data_contract(REPO_ROOT)
            calculated_without_fasit = build_dashboard_kpi_frame(
                isolated_root,
                actual_path=contract.path("common.ledger"),
                budget_header_path=contract.path("common.budget_header"),
                budget_value_path=contract.path("common.budget_values"),
            )

        aggregate = calculated_without_fasit[
            calculated_without_fasit["section_code"] == "all"
        ]
        self.assertEqual(len(aggregate), 63)
        self.assertEqual(
            set(aggregate["finansiering"]),
            {"154301", "154345", "154322+045101"},
        )

    def test_seksjonsfilteret_er_komplett_og_avstemmer_mot_totalen(self) -> None:
        self.assertIn("711", set(self.calculated["section_code"]))
        self.assertIn("251", set(self.calculated["section_code"]))
        self.assertIn("__missing__", set(self.calculated["section_code"]))
        counts = self.calculated.groupby("section_code").size()
        self.assertTrue((counts == 63).all())

        adk = self.calculated[
            (self.calculated["period_key"] == "202606")
            & (self.calculated["finansiering"] == "154301")
            & (self.calculated["metric"] == "ADK")
        ]
        for field in ("hovedbok_nok1000", "budsjett_nok1000"):
            total = float(adk[adk["section_code"] == "all"][field].iloc[0])
            sections = float(adk[adk["section_code"] != "all"][field].sum())
            self.assertAlmostEqual(total, sections, places=9, msg=field)


if __name__ == "__main__":
    unittest.main()
