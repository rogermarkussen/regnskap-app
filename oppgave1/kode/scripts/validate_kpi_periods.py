#!/usr/bin/env python3
"""Regresjonskontroller for periodeberegningene i KPI-dashboardet."""

import json
import math
import re
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "pages" / "index.md"
DB = ROOT / "sources" / "regnskap" / "regnskap.duckdb"


def query_from_page(name: str) -> str:
    content = PAGE.read_text(encoding="utf-8")
    match = re.search(rf"```sql {re.escape(name)}\n(.*?)\n```", content, re.DOTALL)
    if not match:
        raise AssertionError(f"Fant ikke SQL-blokken {name!r} i {PAGE}")
    return match.group(1)


def close(actual: float, expected: float, label: str) -> None:
    if not math.isclose(actual, expected, abs_tol=1e-9):
        raise AssertionError(f"{label}: forventet {expected}, fikk {actual}")


def main() -> None:
    connection = duckdb.connect(str(DB), read_only=True)
    rows = connection.execute(query_from_page("fin154322_period_all")).fetchdf()
    metadata = connection.execute(
        "select * from dashboard_kpi_source_metadata"
    ).fetchdf()

    if len(metadata) != 1:
        raise AssertionError("KPI-dashboardet skal ha nøyaktig én kildemetadatarad")
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

    adk = rows[(rows.period_key == "p1_3") & (rows.tittel == "ADK")].iloc[0]
    close(float(adk.budsjett_nok1000), 22809.75, "ADK-budsjett Jan–Mar")

    details = json.loads(adk.grunnlag_json)
    detail_total = sum(float(row["value"]) for row in details)
    close(detail_total, float(adk.hovedbok_nok1000), "ADK-total mot Vis grunnlag")

    testlab = rows[
        (rows.period_key == "p1_3") & (rows.tittel == "Testlab prosjekt 7114")
    ].iloc[0]
    if not math.isnan(float(testlab.budsjett_nok1000)):
        raise AssertionError("Testlab 7114 skal ha manglende budsjett (NULL)")
    if testlab.kommentar != "Mangler budsjett":
        raise AssertionError("Testlab 7114 skal merkes «Mangler budsjett»")

    testlab_details = json.loads(testlab.grunnlag_json)
    testlab_total = sum(float(row["value"]) for row in testlab_details)
    close(testlab_total, float(testlab.hovedbok_nok1000), "Testlab-total mot Vis grunnlag")

    print("KPI-periodekontroller bestått")
    print(f"- Datasett-ID: {source.datasett_id_kort}")
    print(
        f"- Hovedbokdekning: {source.hovedbok_periode_fra}–{source.hovedbok_periode_til}"
    )


if __name__ == "__main__":
    main()
