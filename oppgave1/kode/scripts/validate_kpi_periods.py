#!/usr/bin/env python3
"""Regresjonskontroller for periodar og seksjonar i KPI-dashboardet."""

import json
import math
import re
from pathlib import Path

import duckdb

from project_data import task1_sources


ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "sources" / "regnskap" / "regnskap.duckdb"


def close(actual: float, expected: float, label: str) -> None:
    if not math.isclose(actual, expected, abs_tol=1e-9):
        raise AssertionError(f"{label}: forventet {expected}, fikk {actual}")


def main() -> None:
    ledger_path = task1_sources().ledger
    connection = duckdb.connect(str(DB), read_only=True)
    rows = connection.execute(
        """
        select * from dashboard_kpi_calculated
        where section_code = 'all'
          and finansiering = '154322+045101'
        """
    ).fetchdf()
    section_counts = connection.execute(
        """
        select section_code, count(*) as antall
        from dashboard_kpi_calculated
        group by section_code
        order by section_code
        """
    ).fetchdf()
    period_coverage = connection.execute(
        """
        select
          count(distinct period_key) as period_count,
          count(distinct period_year) as year_count,
          min(period_key) as min_period,
          max(period_key) as max_period,
          count(*) filter (
            where period_year = 2025 and budsjett_nok1000 is not null
          ) as budget_2025_rows
        from dashboard_kpi_calculated
        """
    ).fetchone()
    section_reconciliation = connection.execute(
        """
        select
          max(hovedbok_nok1000) filter (where section_code = 'all') as hovedbok_total,
          sum(hovedbok_nok1000) filter (where section_code <> 'all') as hovedbok_seksjonssum,
          max(budsjett_nok1000) filter (where section_code = 'all') as budsjett_total,
          sum(budsjett_nok1000) filter (where section_code <> 'all') as budsjett_seksjonssum
        from dashboard_kpi_calculated
        where period_key = '202606'
          and finansiering = '154301'
          and metric = 'ADK'
        """
    ).fetchone()
    metadata = connection.execute(
        "select * from dashboard_kpi_source_metadata"
    ).fetchdf()
    ledger_imbalances = connection.execute(
        f"""
        select trim(period) as period, sum(try_cast(amount as double)) as balance_nok
        from read_parquet('{ledger_path.as_posix()}')
        group by trim(period)
        having abs(sum(try_cast(amount as double))) > 0.01
        order by period
        """
    ).fetchall()
    ledger_coverage = connection.execute(
        f"""
        select
          count(distinct trim(period)) as period_count,
          count(distinct substr(trim(period), 1, 4)) as year_count,
          min(trim(period)) as min_period,
          max(trim(period)) as max_period,
          count(*) filter (where substr(trim(period), 1, 4) = '2025') as rows_2025
        from read_parquet('{ledger_path.as_posix()}')
        where regexp_matches(trim(period), '^20[0-9]{{2}}(0[1-9]|1[0-2])$')
        """
    ).fetchone()

    if len(metadata) != 1:
        raise AssertionError("KPI-dashboardet skal ha nøyaktig én kildemetadatarad")
    if ledger_imbalances:
        details = ", ".join(
            f"{period}: {balance:,.2f} NOK" for period, balance in ledger_imbalances
        )
        raise AssertionError(f"Hovudboka balanserer ikkje per periode: {details}")
    source = metadata.iloc[0]
    if not re.fullmatch(r"[0-9a-f]{64}", str(source.datasett_id)):
        raise AssertionError("Datasett-ID skal være et komplett SHA-256-fingeravtrykk")
    if str(source.hovedbok_periode_til) < "202606":
        raise AssertionError("Hovedboken dekker ikke alle publiserte rapportperioder")
    if str(source.budsjett_periode_til) < "202606":
        raise AssertionError("Budsjettet dekker ikke alle publiserte rapportperioder")
    if source.uttrekkstidspunkt_status != "Ikke dokumentert i kildefilene":
        raise AssertionError("Manglende uttrekkstidspunkt skal vises eksplisitt")
    if source.periodestatus != "Ikke dokumentert i kildefilene":
        raise AssertionError("Manglende periodestatus skal vises eksplisitt")
    period_count, year_count, min_period, max_period, budget_2025_rows = period_coverage
    expected_period_count, expected_year_count, expected_min, expected_max, rows_2025 = (
        ledger_coverage
    )
    if (
        period_count,
        year_count,
        min_period,
        max_period,
    ) != (
        expected_period_count,
        expected_year_count,
        expected_min,
        expected_max,
    ):
        raise AssertionError(
            "Dashboardet dekker ikkje alle periodane i hovudboka: "
            f"{min_period}–{max_period}, {period_count} periodar mot "
            f"{expected_min}–{expected_max}, {expected_period_count} periodar"
        )
    if rows_2025 and budget_2025_rows == 0:
        raise AssertionError("2025-budsjettet er tomt; amount1 er ikkje lese")
    expected_per_section = int(period_count) * 9
    if section_counts.empty or not (section_counts.antall == expected_per_section).all():
        raise AssertionError(
            f"Kvart kostnadssted skal ha ni KPI-ar i {period_count} rapportperiodar"
        )
    if "all" not in set(section_counts.section_code):
        raise AssertionError("Seksjonsfilteret manglar samla visning")
    close(
        float(section_reconciliation[1]),
        float(section_reconciliation[0]),
        "Seksjonssum mot samla ADK-hovudbok",
    )
    close(
        float(section_reconciliation[3]),
        float(section_reconciliation[2]),
        "Seksjonssum mot samla ADK-budsjett",
    )

    adk = rows[(rows.period_key == "202603") & (rows.tittel == "ADK")].iloc[0]
    close(float(adk.budsjett_nok1000), 22809.75, "ADK-budsjett Jan–Mar")

    details = json.loads(adk.grunnlag_json)
    detail_total = sum(float(row["value"]) for row in details)
    close(detail_total, float(adk.hovedbok_nok1000), "ADK-total mot Vis grunnlag")

    testlab = rows[
        (rows.period_key == "202603") & (rows.tittel == "Testlab prosjekt 7114")
    ].iloc[0]
    if not math.isnan(float(testlab.budsjett_nok1000)):
        raise AssertionError("Testlab 7114 skal ha manglende budsjett (NULL)")
    if testlab.kommentar != "Mangler budsjett":
        raise AssertionError("Testlab 7114 skal merkes «Mangler budsjett»")

    testlab_details = json.loads(testlab.grunnlag_json)
    testlab_total = sum(float(row["value"]) for row in testlab_details)
    close(
        testlab_total, float(testlab.hovedbok_nok1000), "Testlab-total mot Vis grunnlag"
    )

    print("KPI-periodekontroller bestått")
    print(f"- Datasett-ID: {source.datasett_id_kort}")
    print(
        f"- Hovedbokdekning: {source.hovedbok_periode_fra}–{source.hovedbok_periode_til}"
    )


if __name__ == "__main__":
    main()
