"""Beregn oppgave 1 fra operative Parquet-kilder.

Modulen kjenner ikke til Excel-fasiten. Fasitavstemming ligger i testlaget.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import pandas as pd

try:
    from .project_data import task1_sources
except ImportError:
    from project_data import task1_sources


@dataclass(frozen=True)
class MetricRule:
    financing: str
    metric: str
    title: str
    account_from: int | None = None
    account_to: int | None = None
    accounts: tuple[str, ...] = ()
    project: str | None = None
    ratio_numerator: tuple[int, int] | None = None
    ratio_denominator: tuple[int, int] | None = None


@dataclass(frozen=True)
class SectionScope:
    code: str
    name: str
    label: str
    sort_order: int


BUSINESS_RULE_VERSION = "2026-08-06"

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


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_dashboard_kpi_metadata_frame(root: Path) -> pd.DataFrame:
    """Beskriv nøyaktig hvilket lokalt datasett oppgave 1 er bygget fra."""
    sources = task1_sources()
    actual_path = sources.ledger
    budget_header_path = sources.budget_header
    budget_value_path = sources.budget_values
    source_paths = (actual_path, budget_header_path, budget_value_path)

    missing = [path.as_posix() for path in source_paths if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            f"Mangler operative Parquet-kilder: {', '.join(missing)}"
        )

    connection = duckdb.connect()
    try:
        actual = connection.execute(
            f"""
            select
              min(trim(period)) as periode_fra,
              max(trim(period)) as periode_til,
              max(try_cast(trans_date as date)) as siste_transaksjonsdato,
              count(*) as antall_rader,
              count(*) filter (where try_cast(amount as double) is null) as ugyldige_belop
            from read_parquet('{actual_path.as_posix()}')
            where regexp_matches(trim(period), '^[0-9]{{6}}$')
              and try_cast(substr(trim(period), 5, 2) as integer) between 1 and 12
            """
        ).fetchone()
        budget = connection.execute(
            f"""
            select
              min(trim(v.period)) as periode_fra,
              max(trim(v.period)) as periode_til,
              count(*) as antall_rader,
              count(*) filter (where try_cast(v.amount as double) is null) as ugyldige_belop
            from read_parquet('{budget_header_path.as_posix()}') h
            join read_parquet('{budget_value_path.as_posix()}') v using (trans_id)
            where h.version = substr(trim(v.period), 1, 4) || 'B'
              and regexp_matches(trim(v.period), '^[0-9]{{6}}$')
              and try_cast(substr(trim(v.period), 5, 2) as integer) between 1 and 12
            """
        ).fetchone()
    finally:
        connection.close()

    if not actual[3] or actual[4]:
        raise ValueError("Hovedbokskilden er tom eller har ugyldige beløp")
    if not budget[2] or budget[3]:
        raise ValueError("Budsjettkilden er tom eller har ugyldige beløp")

    source_hashes = [_file_sha256(path) for path in source_paths]
    combined = hashlib.sha256("|".join(source_hashes).encode("ascii")).hexdigest()
    latest_local_change = max(path.stat().st_mtime for path in source_paths)

    return pd.DataFrame(
        [
            {
                "datasett_id": combined,
                "datasett_id_kort": combined[:12],
                "beregnet_tidspunkt": datetime.now(timezone.utc),
                "siste_lokale_filendring": datetime.fromtimestamp(
                    latest_local_change, timezone.utc
                ),
                "hovedbok_kilde": actual_path.name,
                "hovedbok_periode_fra": actual[0],
                "hovedbok_periode_til": actual[1],
                "hovedbok_siste_transaksjonsdato": actual[2],
                "hovedbok_rader": actual[3],
                "budsjett_kilde": f"{budget_header_path.name} + {budget_value_path.name}",
                "budsjettversjon": "Opprinnelig budsjett per år",
                "budsjett_periode_fra": budget[0],
                "budsjett_periode_til": budget[1],
                "budsjett_rader": budget[2],
                "uttrekkstidspunkt_status": "Ikke dokumentert i kildefilene",
                "periodestatus": "Ikke dokumentert i kildefilene",
            }
        ]
    )


METRIC_RULES = (
    MetricRule("154301", "ADK", "ADK", 6110, 7834),
    MetricRule(
        "154301",
        "Konsulentkostnader",
        "Konsulent",
        accounts=("6700", "6710", "6720", "6730", "6731", "6732"),
    ),
    MetricRule(
        "154301",
        "Reisekostnader",
        "Reise",
        accounts=("7100", "7130", "7131", "7150", "7190", "7199"),
    ),
    MetricRule("154301", "Overtid", "Overtid", accounts=("5050", "5150")),
    MetricRule(
        "154301",
        "Lønnsandel av totale kostnader",
        "Lønnsandel",
        ratio_numerator=(5000, 5999),
        ratio_denominator=(5000, 7834),
    ),
    MetricRule(
        "154345",
        "Totalt regnskap vs budsjett",
        "Totalt regnskap vs budsjett",
        6110,
        7834,
    ),
    MetricRule("154322+045101", "ADK", "ADK", 6110, 7834),
    MetricRule(
        "154322+045101",
        "Testlab",
        "Testlab prosjekt 7114",
        5000,
        7834,
        project="7114",
    ),
    MetricRule(
        "154322+045101",
        "Lønnsandel av totale kostnader",
        "Lønnsandel",
        ratio_numerator=(5000, 5999),
        ratio_denominator=(5000, 7834),
    ),
)


def _budget_financing(dim_1: object) -> str:
    """Godkjent budsjettmapping, regelversjon 2026-08-06."""
    value = str(dim_1).strip()
    if value == "212":
        return "154345"
    if value == "761":
        return "154322+045101"
    return "154301"


def _read_sources(
    actual_path: Path,
    budget_header_path: Path,
    budget_value_path: Path,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    connection = duckdb.connect()
    try:
        actual = connection.execute(
            f"""
            select
              cast(account as varchar) as account,
              cast(dim_4 as varchar) as dim_4,
              cast(dim_2 as varchar) as dim_2,
              case
                when dim_1 is null or trim(cast(dim_1 as varchar)) = '' then '__missing__'
                else trim(cast(dim_1 as varchar))
              end as section_code,
              trim(cast(period as varchar)) as period,
              try_cast(amount as double) / 1000.0 as amount_tusen
            from read_parquet('{actual_path.as_posix()}')
            where regexp_matches(trim(cast(period as varchar)), '^[0-9]{{6}}$')
              and try_cast(substr(trim(cast(period as varchar)), 5, 2) as integer)
                  between 1 and 12
            """
        ).fetchdf()
        budget = connection.execute(
            f"""
            select
              cast(h.account as varchar) as account,
              cast(h.dim_1 as varchar) as dim_1,
              cast(h.dim_2 as varchar) as dim_2,
              case
                when h.dim_1 is null or trim(cast(h.dim_1 as varchar)) = '' then '__missing__'
                else trim(cast(h.dim_1 as varchar))
              end as section_code,
              trim(cast(v.period as varchar)) as period,
              cast(h.version as varchar) as budget_version,
              try_cast(v.amount as double) / 1000.0 as amount_tusen
            from read_parquet('{budget_header_path.as_posix()}') h
            join read_parquet('{budget_value_path.as_posix()}') v using (trans_id)
            where h.version = substr(trim(cast(v.period as varchar)), 1, 4) || 'B'
              and regexp_matches(trim(cast(v.period as varchar)), '^[0-9]{{6}}$')
              and try_cast(substr(trim(cast(v.period as varchar)), 5, 2) as integer)
                  between 1 and 12
            """
        ).fetchdf()
    finally:
        connection.close()

    actual["account_number"] = pd.to_numeric(actual["account"], errors="coerce")
    budget["account_number"] = pd.to_numeric(budget["account"], errors="coerce")
    budget["financing"] = budget["dim_1"].map(_budget_financing)
    return actual, budget


def _read_section_names(path: Path) -> dict[str, str]:
    connection = duckdb.connect()
    try:
        rows = connection.execute(
            f"""
            select
              trim(cast(dim_value as varchar)) as section_code,
              any_value(trim(cast(description as varchar))) as section_name
            from read_parquet('{path.as_posix()}')
            where attribute_id = 'C1'
              and dim_value is not null
            group by 1
            """
        ).fetchall()
    finally:
        connection.close()
    return {str(code): str(name) for code, name in rows if code}


def _section_scopes(
    actual: pd.DataFrame,
    budget: pd.DataFrame,
    names: dict[str, str],
) -> tuple[SectionScope, ...]:
    codes = sorted(
        set(actual["section_code"].dropna()) | set(budget["section_code"].dropna()),
        key=lambda code: (
            code == "__missing__",
            int(code) if str(code).isdigit() else 10_000,
            str(code),
        ),
    )
    scopes = [SectionScope("all", "Alle kostnadssteder", "Alle kostnadssteder", 0)]
    for code in codes:
        if code == "__missing__":
            scopes.append(
                SectionScope(code, "Uten kostnadsstedskode", "Uten kostnadsstedskode", 99_999)
            )
            continue
        name = names.get(str(code), "Navn mangler i dimensjonsregisteret")
        sort_order = int(code) if str(code).isdigit() else 90_000
        scopes.append(SectionScope(str(code), name, f"{code} · {name}", sort_order))
    return tuple(scopes)


def _accounts(frame: pd.DataFrame, rule: MetricRule) -> pd.DataFrame:
    if rule.accounts:
        return frame[frame["account"].isin(rule.accounts)]
    return frame[
        frame["account_number"].between(
            rule.account_from,
            rule.account_to,
            inclusive="both",
        )
    ]


def _actual_scope(
    frame: pd.DataFrame,
    rule: MetricRule,
    end_period: str,
    section_code: str,
) -> pd.DataFrame:
    if rule.financing == "154322+045101":
        scoped = frame[frame["dim_4"].isin(["154322", "045101"])]
    else:
        scoped = frame[frame["dim_4"] == rule.financing]
    start_period = f"{end_period[:4]}01"
    scoped = scoped[scoped["period"].between(start_period, end_period)]
    if section_code != "all":
        scoped = scoped[scoped["section_code"] == section_code]
    if rule.project:
        scoped = scoped[scoped["dim_2"] == rule.project]
    return scoped


def _budget_scope(
    frame: pd.DataFrame,
    rule: MetricRule,
    end_period: str,
    section_code: str,
) -> pd.DataFrame:
    year = end_period[:4]
    scoped = frame[frame["period"].between(f"{year}01", end_period)]
    scoped = scoped[scoped["budget_version"] == f"{year}B"]
    scoped = scoped[scoped["financing"] == rule.financing]
    if section_code != "all":
        scoped = scoped[scoped["section_code"] == section_code]
    if rule.project:
        return scoped[scoped["dim_2"] == rule.project]
    return scoped


def _ratio_sum(frame: pd.DataFrame, bounds: tuple[int, int]) -> float:
    selected = frame[
        frame["account_number"].between(bounds[0], bounds[1], inclusive="both")
    ]
    return float(selected["amount_tusen"].sum())


def _status(
    actual: float, budget: float | None
) -> tuple[float | None, str | None, str | None]:
    if budget in (None, 0):
        return None, None, None
    share = actual / budget
    if share > 1:
        return share, "danger", "Over budsjett"
    if share >= 0.85:
        return share, "warning", "Nær budsjett"
    return share, "ok", "Innenfor budsjett"


def build_dashboard_kpi_frame(
    root: Path,
    *,
    actual_path: Path | None = None,
    budget_header_path: Path | None = None,
    budget_value_path: Path | None = None,
    dimension_values_path: Path | None = None,
) -> pd.DataFrame:
    sources = task1_sources()
    actual_source = actual_path or sources.ledger
    budget_header_source = budget_header_path or sources.budget_header
    budget_value_source = budget_value_path or sources.budget_values
    dimension_values_source = dimension_values_path or sources.dimension_values
    actual, budget = _read_sources(
        actual_source,
        budget_header_source,
        budget_value_source,
    )
    section_names = _read_section_names(dimension_values_source)
    sections = _section_scopes(actual, budget, section_names)

    periods = sorted(actual["period"].dropna().astype(str).unique())
    if not periods:
        raise ValueError("Hovedbokskilden inneholder ingen gyldige rapportperioder")

    latest_period = periods[-1]
    rows: list[dict[str, object]] = []
    for section in sections:
        for end_period in periods:
            period_year = int(end_period[:4])
            period_month = int(end_period[4:6])
            period_fields = {
                "period_key": end_period,
                "end_period": end_period,
                "period_year": period_year,
                "period_month": period_month,
                "period_label": f"{MONTH_NAMES[period_month - 1]} {period_year}",
                "period_sort": int(end_period),
                "is_latest_period": end_period == latest_period,
                "budsjettversjon": f"{period_year}B",
            }
            for rule in METRIC_RULES:
                actual_scope = _actual_scope(actual, rule, end_period, section.code)
                section_fields = {
                    "section_code": section.code,
                    "section_name": section.name,
                    "section_label": section.label,
                    "section_sort": section.sort_order,
                }
                if rule.ratio_numerator and rule.ratio_denominator:
                    numerator = _ratio_sum(actual_scope, rule.ratio_numerator)
                    denominator = _ratio_sum(actual_scope, rule.ratio_denominator)
                    ratio = numerator / denominator if denominator else None
                    details = [
                        {"label": "Lønnskostnader", "value": numerator},
                        {
                            "label": "Totale kostnader",
                            "value": denominator,
                        },
                    ]
                    if ratio is not None:
                        details.append(
                            {
                                "label": "Andel (%)",
                                "value": ratio * 100,
                                "format": "pct",
                            }
                        )
                    rows.append(
                        {
                            **section_fields,
                            **period_fields,
                            "finansiering": rule.financing,
                            "metric": rule.metric,
                            "tittel": rule.title,
                            "hovedbok_nok1000": ratio,
                            "budsjett_nok1000": None,
                            "budsjettandel": None,
                            "status": None,
                            "status_tekst": None,
                            "prosentverdi": ratio,
                            "gjenstaar_nok1000": -ratio if ratio is not None else None,
                            "kommentar": None,
                            "grunnlag_json": json.dumps(details, ensure_ascii=False),
                            "beregningsregel": (
                                f"konto {rule.ratio_numerator[0]}–{rule.ratio_numerator[1]} "
                                f"/ konto {rule.ratio_denominator[0]}–{rule.ratio_denominator[1]}"
                            ),
                        }
                    )
                    continue

                actual_rows = _accounts(actual_scope, rule)
                budget_rows = _accounts(
                    _budget_scope(budget, rule, end_period, section.code), rule
                )
                actual_by_account = actual_rows.groupby("account", as_index=False)[
                    "amount_tusen"
                ].sum()
                actual_total = float(actual_by_account["amount_tusen"].sum())
                budget_total = (
                    None
                    if budget_rows.empty
                    else float(budget_rows["amount_tusen"].sum())
                )
                budget_share, status, status_text = _status(actual_total, budget_total)
                details = [
                    {"label": row.account, "value": float(row.amount_tusen)}
                    for row in actual_by_account.itertuples()
                    if abs(float(row.amount_tusen)) > 1e-12
                ]
                if rule.accounts:
                    account_rule = ", ".join(rule.accounts)
                else:
                    account_rule = f"{rule.account_from}–{rule.account_to}"
                if rule.project:
                    account_rule += f", prosjekt {rule.project}"
                rows.append(
                    {
                        **section_fields,
                        **period_fields,
                        "finansiering": rule.financing,
                        "metric": rule.metric,
                        "tittel": rule.title,
                        "hovedbok_nok1000": actual_total,
                        "budsjett_nok1000": budget_total,
                        "budsjettandel": budget_share,
                        "status": status,
                        "status_tekst": status_text,
                        "prosentverdi": None,
                        "gjenstaar_nok1000": (
                            budget_total - actual_total
                            if budget_total is not None
                            else None
                        ),
                        "kommentar": (
                            "Mangler budsjett" if budget_total is None else None
                        ),
                        "grunnlag_json": json.dumps(details, ensure_ascii=False),
                        "beregningsregel": f"konto {account_rule}",
                    }
                )

    result = pd.DataFrame(rows)
    result["kilde_hovedbok"] = actual_source.name
    result["kilde_budsjett"] = (
        f"{budget_header_source.name} + {budget_value_source.name}, "
        "opprinnelig budsjett for valgt år"
    )
    result["regelversjon"] = BUSINESS_RULE_VERSION
    return result
