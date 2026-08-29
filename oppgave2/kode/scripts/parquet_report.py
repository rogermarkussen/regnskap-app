"""Bygg den flerårige kontogrupperingen bare fra operative Parquet-kilder."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import duckdb
import pandas as pd


MONTH_NAMES = (
    "Januar",
    "Februar",
    "Mars",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Desember",
)
FINANCING_MEMBERS = ("154301", "154345", "154322", "045101")
FINANCING_OPTIONS = (
    ("154301", "Finansiering 154301"),
    ("154345", "Finansiering 154345"),
    ("154322+045101", "Finansiering 154322 + 045101"),
    ("alle", "Alle finansieringer"),
)


@dataclass(frozen=True)
class ParquetReportSources:
    ledger: Path
    budget_header: Path
    budget_values: Path
    dimension_values: Path
    cash_ledger: Path
    cash_accounts: Path
    account_plan: Path


def _financing_sql(alias: str, field: str = "dim_4") -> str:
    return f"""
        case
          when trim({alias}.{field}) in ('154322', '045101') then '154322+045101'
          else trim({alias}.{field})
        end
    """


def _budget_financing_sql(alias: str) -> str:
    return f"""
        case
          when trim({alias}.dim_1) = '212' then '154345'
          when trim({alias}.dim_1) = '761' then '154322+045101'
          else '154301'
        end
    """


def _expanded_values(
    conn: duckdb.DuckDBPyConnection,
    sources: ParquetReportSources,
    source: str,
) -> pd.DataFrame:
    if source == "actual":
        base = f"""
            select
              trim(period) as period,
              coalesce(nullif(trim(dim_1), ''), '__missing__') as section_code,
              {_financing_sql('a')} as financing,
              lpad(trim(account), 4, '0') as konto,
              try_cast(amount as double) / 1000.0 as value
            from read_parquet('{sources.ledger.as_posix()}') a
            where regexp_matches(trim(period), '^20[0-9]{{2}}(0[1-9]|1[0-2])$')
              and try_cast(account as integer) between 3000 and 8999
        """
    elif source == "budget":
        base = f"""
            select
              trim(v.period) as period,
              coalesce(nullif(trim(h.dim_1), ''), '__missing__') as section_code,
              {_budget_financing_sql('h')} as financing,
              lpad(trim(h.account), 4, '0') as konto,
              coalesce(
                try_cast(v.amount as double),
                try_cast(v.amount1 as double)
              ) / 1000.0 as value
            from read_parquet('{sources.budget_header.as_posix()}') h
            join read_parquet('{sources.budget_values.as_posix()}') v using (trans_id)
            where h.version = substr(trim(v.period), 1, 4) || 'B'
              and regexp_matches(trim(v.period), '^20[0-9]{{2}}(0[1-9]|1[0-2])$')
              and try_cast(h.account as integer) between 3000 and 8999
        """
    elif source == "cash":
        base = f"""
            select
              trim(pay_period) as period,
              coalesce(nullif(trim(dim_1), ''), '__missing__') as section_code,
              {_financing_sql('c')} as financing,
              lpad(trim(account), 4, '0') as konto,
              try_cast(cash_amount as double) / 1000.0 as value
            from read_parquet('{sources.cash_ledger.as_posix()}') c
            where regexp_matches(trim(pay_period), '^20[0-9]{{2}}(0[1-9]|1[0-2])$')
              and try_cast(account as integer) between 3000 and 8999
        """
    else:
        raise ValueError(f"Ukjent kilde: {source}")

    return conn.execute(
        f"""
        with base as ({base}), expanded as (
          select period, section_code, financing, konto, value from base
          union all
          select period, 'all', financing, konto, value from base
          union all
          select period, section_code, 'alle', konto, value from base
          union all
          select period, 'all', 'alle', konto, value from base
        )
        select period, section_code, financing, konto, sum(value) as value
        from expanded
        group by all
        """
    ).df()


def _account_structure(
    conn: duckdb.DuckDBPyConnection,
    sources: ParquetReportSources,
) -> list[dict[str, object]]:
    rows = conn.execute(
        f"""
        with accounts as (
          select distinct lpad(trim(account), 4, '0') as konto
          from read_parquet('{sources.ledger.as_posix()}')
          where try_cast(account as integer) between 3000 and 8999
          union
          select distinct lpad(trim(account), 4, '0')
          from read_parquet('{sources.budget_header.as_posix()}')
          where try_cast(account as integer) between 3000 and 8999
          union
          select distinct lpad(trim(account), 4, '0')
          from read_parquet('{sources.cash_ledger.as_posix()}')
          where try_cast(account as integer) between 3000 and 8999
        ), names as (
          select
            lpad(trim(dim_value), 4, '0') as konto,
            any_value(trim(description)) as konto_navn
          from read_parquet('{sources.dimension_values.as_posix()}')
          where attribute_id = 'A0'
            and try_cast(dim_value as integer) between 3000 and 8999
          group by 1
        ), plan as (
          select cast(Konto as varchar) as prefix, Kontonavn as navn
          from read_parquet('{sources.account_plan.as_posix()}')
        )
        select
          accounts.konto,
          coalesce(names.konto_navn, 'Kontonavn mangler') as konto_navn,
          substr(accounts.konto, 1, 1) as hovedgruppekode,
          coalesce(main.navn, 'Kontoklasse ' || substr(accounts.konto, 1, 1)) as hovedgruppe,
          substr(accounts.konto, 1, 2) as undergruppekode,
          coalesce(sub.navn, 'Kontogruppe ' || substr(accounts.konto, 1, 2)) as undergruppe
        from accounts
        left join names using (konto)
        left join plan main on main.prefix = substr(accounts.konto, 1, 1)
        left join plan sub on sub.prefix = substr(accounts.konto, 1, 2)
        order by try_cast(accounts.konto as integer)
        """
    ).df()
    return rows.to_dict("records")


def _section_scopes(
    conn: duckdb.DuckDBPyConnection,
    sources: ParquetReportSources,
) -> list[dict[str, object]]:
    rows = conn.execute(
        f"""
        with codes as (
          select distinct trim(dim_1) as code
          from read_parquet('{sources.ledger.as_posix()}')
          where trim(coalesce(dim_1, '')) <> ''
          union
          select distinct trim(dim_1)
          from read_parquet('{sources.budget_header.as_posix()}')
          where trim(coalesce(dim_1, '')) <> ''
          union
          select distinct trim(dim_1)
          from read_parquet('{sources.cash_ledger.as_posix()}')
          where trim(coalesce(dim_1, '')) <> ''
        ), names as (
          select trim(dim_value) as code, any_value(trim(description)) as name
          from read_parquet('{sources.dimension_values.as_posix()}')
          where attribute_id = 'C1'
          group by 1
        )
        select codes.code, coalesce(names.name, 'Navn mangler i dimensjonsregisteret') as name
        from codes left join names using (code)
        order by try_cast(codes.code as integer), codes.code
        """
    ).fetchall()
    scopes = [
        {
            "section_code": "all",
            "section_name": "Alle seksjoner",
            "section_label": "Alle seksjoner",
            "section_sort": 0,
        }
    ]
    for code, name in rows:
        scopes.append(
            {
                "section_code": str(code),
                "section_name": str(name),
                "section_label": f"{code} · {name}",
                "section_sort": int(code) if str(code).isdigit() else 90_000,
            }
        )
    return scopes


def _value_maps(frame: pd.DataFrame) -> dict[tuple[str, str, str, str], float]:
    return {
        (str(row.section_code), str(row.financing), str(row.konto), str(row.period)): float(row.value)
        for row in frame.itertuples(index=False)
        if not pd.isna(row.value)
    }


def _summed_values(rows: list[dict[str, object]], columns: list[str]) -> dict[str, float | None]:
    result: dict[str, float | None] = {}
    for column in columns:
        values = [float(row[column]) for row in rows if row.get(column) is not None]
        result[column] = sum(values) if values else None
    missing_period_budget = any(
        row.get("virksomhet_budsjett_tusen") is None
        and row.get("hovedbok_tusen") not in (None, 0, 0.0)
        for row in rows
    )
    missing_annual_budget = any(
        row.get("aarets_budsjett_tusen") is None
        and row.get("hovedbok_tusen") not in (None, 0, 0.0)
        for row in rows
    )
    if missing_period_budget:
        result["avvik_tusen"] = None
    annual = result.get("aarets_budsjett_tusen")
    actual = result.get("hovedbok_tusen")
    result["forbruk_av_aarets_budsjett"] = (
        None
        if missing_annual_budget or annual in (None, 0) or actual is None
        else actual / annual
    )
    return result


def _sum_available(values: list[float | None]) -> float | None:
    present = [float(value) for value in values if value is not None]
    return sum(present) if present else None


def build_parquet_report(
    sources: ParquetReportSources,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Returner kontoplan, rapport og kildekontroll for alle tilgjengelige perioder."""
    conn = duckdb.connect()
    try:
        actual = _expanded_values(conn, sources, "actual")
        budget = _expanded_values(conn, sources, "budget")
        cash = _expanded_values(conn, sources, "cash")
        structure = _account_structure(conn, sources)
        scopes = _section_scopes(conn, sources)
        periods = [
            str(row[0])
            for row in conn.execute(
                f"""
                select distinct trim(period)
                from read_parquet('{sources.ledger.as_posix()}')
                where regexp_matches(trim(period), '^20[0-9]{{2}}(0[1-9]|1[0-2])$')
                order by 1
                """
            ).fetchall()
        ]
        invalid_cash_accounts = conn.execute(
            f"""
            select count(distinct trim(c.acc_no))
            from read_parquet('{sources.cash_ledger.as_posix()}') c
            left join read_parquet('{sources.cash_accounts.as_posix()}') a
              on trim(c.acc_no) = trim(a.acc_no)
            where trim(coalesce(c.acc_no, '')) <> '' and a.acc_no is null
            """
        ).fetchone()[0]
    finally:
        conn.close()

    actual_map = _value_maps(actual)
    budget_map = _value_maps(budget)
    cash_map = _value_maps(cash)
    month_columns = [f"budsjett_{month:02d}_tusen" for month in range(1, 13)]
    value_columns = [
        "virksomhet_budsjett_tusen",
        "hovedbok_tusen",
        "avvik_tusen",
        "aarets_budsjett_tusen",
        *month_columns,
        "kontant_budsjett_tusen",
        "kontant_tusen",
        "kontant_avvik_tusen",
        "investeringsbudsjett_tusen",
        "investeringsregnskap_tusen",
    ]
    report_rows: list[dict[str, object]] = []
    grouped_structure: dict[str, dict[str, list[dict[str, object]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for account in structure:
        grouped_structure[str(account["hovedgruppe"])][str(account["undergruppe"])].append(account)

    for scope in scopes:
        section_code = str(scope["section_code"])
        for financing, financing_label in FINANCING_OPTIONS:
            for end_period in periods:
                year = int(end_period[:4])
                end_month = int(end_period[4:])
                period_label = f"Januar–{MONTH_NAMES[end_month - 1].lower()} {year}"
                budget_version = f"{year}B"
                account_rows_by_number: dict[str, dict[str, object]] = {}
                for account in structure:
                    number = str(account["konto"])
                    monthly = {
                        f"budsjett_{month:02d}_tusen": budget_map.get(
                            (section_code, financing, number, f"{year}{month:02d}")
                        )
                        for month in range(1, 13)
                    }
                    actual_value = sum(
                        actual_map.get(
                            (section_code, financing, number, f"{year}{month:02d}"),
                            0.0,
                        )
                        for month in range(1, end_month + 1)
                    )
                    cash_month_values = [
                        cash_map.get(
                            (section_code, financing, number, f"{year}{month:02d}")
                        )
                        for month in range(1, end_month + 1)
                    ]
                    present_cash = [value for value in cash_month_values if value is not None]
                    cash_value = sum(present_cash) if present_cash else None
                    period_budget = _sum_available(
                        [
                            monthly[f"budsjett_{month:02d}_tusen"]
                            for month in range(1, end_month + 1)
                        ]
                    )
                    annual_budget = _sum_available(list(monthly.values()))
                    investment_budget = None
                    investment_actual = None
                    if financing in {"154345", "alle"}:
                        investment_budget = _sum_available(
                            [
                                budget_map.get(
                                    (
                                        section_code,
                                        "154345",
                                        number,
                                        f"{year}{month:02d}",
                                    )
                                )
                                for month in range(1, end_month + 1)
                            ]
                        )
                        investment_actual = sum(
                            actual_map.get(
                                (section_code, "154345", number, f"{year}{month:02d}"),
                                0.0,
                            )
                            for month in range(1, end_month + 1)
                        )
                    has_data = any(
                        abs(float(value)) > 1e-12
                        for value in [actual_value, *monthly.values(), cash_value]
                        if value is not None
                    )
                    if not has_data:
                        continue
                    account_rows_by_number[number] = {
                        **scope,
                        "finansiering": financing,
                        "finansiering_tekst": financing_label,
                        "rapportperiode": end_period,
                        "report_year": year,
                        "period_to": int(end_period),
                        "periodetekst": period_label,
                        "budsjettversjon": budget_version,
                        "hovedgruppe": account["hovedgruppe"],
                        "row_type": "account",
                        "radtekst": f"{number} - {account['konto_navn']}",
                        "konto": number,
                        "konto_navn": account["konto_navn"],
                        "data_status": (
                            "Budsjettgrunnlag mangler"
                            if period_budget is None and actual_value != 0
                            else "Operative tall"
                        ),
                        "virksomhet_budsjett_tusen": period_budget,
                        "hovedbok_tusen": actual_value,
                        "avvik_tusen": (
                            None if period_budget is None else period_budget - actual_value
                        ),
                        "aarets_budsjett_tusen": annual_budget,
                        **monthly,
                        "kontant_budsjett_tusen": None,
                        "kontant_tusen": cash_value,
                        "kontant_avvik_tusen": None,
                        "investeringsbudsjett_tusen": investment_budget,
                        "investeringsregnskap_tusen": investment_actual,
                        "forbruk_av_aarets_budsjett": (
                            None
                            if annual_budget in (None, 0)
                            else actual_value / annual_budget
                        ),
                        "source_file": (
                            f"{sources.ledger.name}; {sources.budget_header.name}; "
                            f"{sources.budget_values.name}; {sources.cash_ledger.name}"
                        ),
                    }

                excel_row = 1
                for main_group, subgroups in grouped_structure.items():
                    main_accounts: list[dict[str, object]] = []
                    report_rows.append(
                        {
                            **scope,
                            "finansiering": financing,
                            "finansiering_tekst": financing_label,
                            "rapportperiode": end_period,
                            "report_year": year,
                            "period_to": int(end_period),
                            "periodetekst": period_label,
                            "budsjettversjon": budget_version,
                            "excel_row": excel_row,
                            "hovedgruppe": main_group,
                            "row_type": "section",
                            "radtekst": main_group,
                            **{column: None for column in value_columns},
                            "forbruk_av_aarets_budsjett": None,
                            "source_file": sources.account_plan.name,
                        }
                    )
                    excel_row += 1
                    for subgroup, accounts in subgroups.items():
                        subgroup_rows = [
                            account_rows_by_number[str(account["konto"])]
                            for account in accounts
                            if str(account["konto"]) in account_rows_by_number
                        ]
                        if not subgroup_rows:
                            continue
                        main_accounts.extend(subgroup_rows)
                        report_rows.append(
                            {
                                **scope,
                                "finansiering": financing,
                                "finansiering_tekst": financing_label,
                                "rapportperiode": end_period,
                                "report_year": year,
                                "period_to": int(end_period),
                                "periodetekst": period_label,
                                "budsjettversjon": budget_version,
                                "excel_row": excel_row,
                                "hovedgruppe": main_group,
                                "row_type": "group",
                                "radtekst": subgroup,
                                "konto": None,
                                "konto_navn": None,
                                **_summed_values(subgroup_rows, value_columns),
                                "source_file": sources.account_plan.name,
                            }
                        )
                        excel_row += 1
                        for row in subgroup_rows:
                            report_rows.append({**row, "excel_row": excel_row})
                            excel_row += 1
                    report_rows.append(
                        {
                            **scope,
                            "finansiering": financing,
                            "finansiering_tekst": financing_label,
                            "rapportperiode": end_period,
                            "report_year": year,
                            "period_to": int(end_period),
                            "periodetekst": period_label,
                            "budsjettversjon": budget_version,
                            "excel_row": excel_row,
                            "hovedgruppe": main_group,
                            "row_type": "total",
                            "radtekst": f"Totale {main_group.lower()}",
                            "konto": None,
                            "konto_navn": None,
                            **_summed_values(main_accounts, value_columns),
                            "source_file": sources.account_plan.name,
                        }
                    )
                    excel_row += 1

    report = pd.DataFrame(report_rows)
    groups = pd.DataFrame(
        [
            {
                "hovedgruppe": account["hovedgruppe"],
                "undergruppe": account["undergruppe"],
                "konto": account["konto"],
                "konto_navn": account["konto_navn"],
            }
            for account in structure
        ]
    )
    validations = pd.DataFrame(
        [
            {
                "kontroll": "Årsdekning",
                "status": "ok" if len({period[:4] for period in periods}) >= 3 else "warning",
                "antall_avvik": 0 if len({period[:4] for period in periods}) >= 3 else 1,
                "detalj": f"Perioder fra {periods[0]} til {periods[-1]}.",
            },
            {
                "kontroll": "Kontantkontoer",
                "status": "ok" if invalid_cash_accounts == 0 else "error",
                "antall_avvik": int(invalid_cash_accounts),
                "detalj": "Alle kontantkontoer finnes i acaaccounts."
                if invalid_cash_accounts == 0
                else f"{invalid_cash_accounts} kontantkontoer mangler i acaaccounts.",
            },
            {
                "kontroll": "Kontantperiode",
                "status": "ok" if not cash.empty else "error",
                "antall_avvik": 0 if not cash.empty else 1,
                "detalj": "Kontantregnskapet bruker pay_period fra acatrans.",
            },
            {
                "kontroll": "Kontantbudsjett",
                "status": "warning",
                "antall_avvik": 1,
                "detalj": (
                    "Mappen har operativt kontantregnskap, men ingen egen kilde for "
                    "periodisert kontantbudsjett. Feltet holdes derfor tomt."
                ),
            },
        ]
    )
    return groups, report, validations
