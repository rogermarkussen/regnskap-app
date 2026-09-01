"""Revidert budsjett for 2026; eksisterende budsjettvalg for øvrige år."""


def budget_version_for_year(year: object) -> str:
    return "2026RV" if str(year) == "2026" else f"{year}B"


def budget_version_sql(year_expression: str) -> str:
    return f"case when cast({year_expression} as varchar) = '2026' then '2026RV' else cast({year_expression} as varchar) || 'B' end"
