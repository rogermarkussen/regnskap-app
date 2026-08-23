from __future__ import annotations

from pathlib import Path

import duckdb

try:
    from .project_data import task2_sources
except ImportError:
    from project_data import task2_sources


CODE_ROOT = Path(__file__).resolve().parents[1]
ROOT = CODE_ROOT.parent
SOURCES = task2_sources()
GENERATED_DIR = SOURCES.generated_dir / "evidence"
VALIDATION_PARQUET = GENERATED_DIR / "grouped_finance_validation.parquet"
ROWS_PARQUET = GENERATED_DIR / "grouped_finance_rows.parquet"


def main() -> None:
    if not VALIDATION_PARQUET.exists() or not ROWS_PARQUET.exists():
        raise SystemExit("Genererte oppgave 2-data mangler. Kjør npm run prepare:data først.")

    conn = duckdb.connect()
    try:
        validations = conn.execute(
            f"select * from read_parquet('{VALIDATION_PARQUET.as_posix()}')"
        ).df()
        row_summary = conn.execute(
            f"""
            select
              finansiering,
              rapportperiode,
              count(*) as rows,
              count(*) filter (where row_type = 'account') as account_rows,
              count(*) filter (where radtekst = 'Driftskostnader') as grand_totals
            from read_parquet('{ROWS_PARQUET.as_posix()}')
            group by finansiering, rapportperiode
            order by finansiering, rapportperiode
            """
        ).df()
        account_6735 = conn.execute(
            f"""
            select
              aarets_budsjett_tusen,
              budsjett_202604_tusen,
              budsjett_202611_tusen,
              source_file
            from read_parquet('{ROWS_PARQUET.as_posix()}')
            where finansiering = 'alle'
              and rapportperiode = 'p1_3'
              and row_type = 'account'
              and konto = '6735'
            """
        ).fetchall()
    finally:
        conn.close()

    expected_financing = {
        "154301",
        "154345",
        "154322+045101",
        "alle",
    }
    actual_financing = set(row_summary["finansiering"])
    if actual_financing != expected_financing:
        raise SystemExit(
            f"Uventede finansieringsvalg: forventet {sorted(expected_financing)}, fikk {sorted(actual_financing)}"
        )

    expected_periods = {"p1_3", "p1_4", "p1_6", "latest"}
    actual_combinations = set(
        zip(row_summary["finansiering"], row_summary["rapportperiode"])
    )
    expected_combinations = {
        (financing, period)
        for financing in expected_financing
        for period in expected_periods
    }
    if actual_combinations != expected_combinations:
        raise SystemExit("Mangler ett eller flere finansierings-/periodevalg")

    expected_validation_count = len(expected_combinations) * 5
    if len(validations) != expected_validation_count:
        raise SystemExit(
            f"Forventet {expected_validation_count} automatiske kontroller, "
            f"fikk {len(validations)}"
        )

    if len(account_6735) != 1:
        raise SystemExit("Forventet én beregnet rad for konto 6735 under alle finansieringer")
    annual, april, november, source_file = account_6735[0]
    if (annual, april, november) != (3000.0, 375.0, 375.0):
        raise SystemExit("Konto 6735 skal beregnes til 3 000 i årsbudsjett fra 2026B")
    if "apltransactvalue.parquet (2026B)" not in source_file:
        raise SystemExit("Konto 6735 skal være merket med operativ Parquet-kilde")

    errors = validations[validations["status"] == "error"]
    if not errors.empty:
        details = "; ".join(
            f"{row.finansiering}: {row.kontroll} ({row.antall_avvik} avvik)"
            for row in errors.itertuples()
        )
        raise SystemExit(f"Datakontroll feilet: {details}")

    invalid_totals = row_summary[row_summary["grand_totals"] != 1]
    if not invalid_totals.empty:
        raise SystemExit("Hver rapport må inneholde nøyaktig én totalrad for Driftskostnader")

    incomplete_account_sets = row_summary[row_summary["account_rows"] != 114]
    if not incomplete_account_sets.empty:
        raise SystemExit("Hver rapport skal vise alle 114 definerte kontoer")

    warnings = validations[validations["status"] == "warning"]
    print("Oppgave 2-validering bestått")
    for row in row_summary.itertuples():
        print(f"- {row.finansiering}/{row.rapportperiode}: {row.rows} rapportlinjer")
    for row in warnings.itertuples():
        print(f"- Merknad {row.finansiering}/{row.rapportperiode}: {row.detalj}")


if __name__ == "__main__":
    main()
