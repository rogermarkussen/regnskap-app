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
GENERATED_DIR = SOURCES.generated_dir / "static-app"
VALIDATION_PARQUET = GENERATED_DIR / "grouped_finance_validation.parquet"
ROWS_PARQUET = GENERATED_DIR / "grouped_finance_rows.parquet"
SECTION_ROWS_PARQUET = GENERATED_DIR / "section_grouped_finance_rows.parquet"


def main() -> None:
    if not VALIDATION_PARQUET.exists() or not ROWS_PARQUET.exists() or not SECTION_ROWS_PARQUET.exists():
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
        section_summary = conn.execute(
            f"""
            select
              section_code,
              count(distinct (finansiering, rapportperiode)) as report_choices,
              count(*) filter (where row_type = 'account') as account_rows,
              count(*) filter (where radtekst = 'Driftskostnader') as grand_totals,
              count(*) filter (
                where section_code <> 'all'
                  and (
                    kontant_budsjett_tusen is not null
                    or kontant_tusen is not null
                    or kontant_avvik_tusen is not null
                  )
              ) as section_cash_values
            from read_parquet('{SECTION_ROWS_PARQUET.as_posix()}')
            group by section_code
            order by section_code
            """
        ).df()
        section_reconciliation = conn.execute(
            f"""
            with totals as (
              select
                section_code,
                finansiering,
                rapportperiode,
                hovedbok_tusen,
                virksomhet_budsjett_tusen
              from read_parquet('{ROWS_PARQUET.as_posix()}')
              where radtekst = 'Driftskostnader'
              union all
              select
                section_code,
                finansiering,
                rapportperiode,
                hovedbok_tusen,
                virksomhet_budsjett_tusen
              from read_parquet('{SECTION_ROWS_PARQUET.as_posix()}')
              where radtekst = 'Driftskostnader'
            )
            select
              finansiering,
              rapportperiode,
              abs(
                sum(hovedbok_tusen) filter (where section_code <> 'all')
                - max(hovedbok_tusen) filter (where section_code = 'all')
              ) as hovedbok_avvik,
              abs(
                sum(virksomhet_budsjett_tusen) filter (where section_code <> 'all')
                - max(virksomhet_budsjett_tusen) filter (where section_code = 'all')
              ) as budsjett_avvik
            from totals
            group by finansiering, rapportperiode
            """
        ).df()
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

    if section_summary.empty:
        raise SystemExit("Seksjonsrapportene mangler")
    invalid_section_choices = section_summary[section_summary["report_choices"] != 16]
    if not invalid_section_choices.empty:
        raise SystemExit("Hver seksjon skal ha alle 16 finansierings-/periodevalg")
    invalid_section_accounts = section_summary[section_summary["account_rows"] != 16 * 114]
    if not invalid_section_accounts.empty:
        raise SystemExit("Hver seksjon skal vise alle 114 kontoer i hvert rapportvalg")
    invalid_section_totals = section_summary[section_summary["grand_totals"] != 16]
    if not invalid_section_totals.empty:
        raise SystemExit("Hver seksjon skal ha én driftskostnadstotal per rapportvalg")
    if int(section_summary["section_cash_values"].sum()) != 0:
        raise SystemExit("Kontantverdier skal være tomme når kilden ikke kan fordeles på seksjon")

    # Alle-synet for Jan–mar bruker et avstemt Excel-uttrekk. Seksjonene bruker
    # operativ Parquet og kan derfor ha det dokumenterte avviket på 1,99 tusen.
    comparable = section_reconciliation[
        ~(
            (section_reconciliation["finansiering"] == "alle")
            & (section_reconciliation["rapportperiode"] == "p1_3")
        )
    ]
    if (comparable["hovedbok_avvik"] > 0.01).any():
        raise SystemExit("Seksjonssummene avstemmer ikke mot hovedbokstotalen")
    if (comparable["budsjett_avvik"] > 0.01).any():
        raise SystemExit("Seksjonssummene avstemmer ikke mot budsjettotalen")

    warnings = validations[validations["status"] == "warning"]
    print("Oppgave 2-validering bestått")
    for row in row_summary.itertuples():
        print(f"- {row.finansiering}/{row.rapportperiode}: {row.rows} rapportlinjer")
    for row in warnings.itertuples():
        print(f"- Merknad {row.finansiering}/{row.rapportperiode}: {row.detalj}")


if __name__ == "__main__":
    main()
