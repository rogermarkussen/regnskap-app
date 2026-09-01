"""Finansiering fra dim_4, uten reserveverdi fra koststed."""

import re


MISSING_FINANCING = "Uten finansiering"


def report_financing(value: object) -> str:
    code = "" if value is None else str(value).strip()
    if re.fullmatch(r"[0-9]{1,6}", code):
        code = code.zfill(6)
    if code in ("154322", "045101"):
        return "154322+045101"
    return code or MISSING_FINANCING


def financing_sql(field: str) -> str:
    value = f"nullif(trim(cast({field} as varchar)), '')"
    code = f"(case when regexp_full_match({value}, '[0-9]{{1,6}}') then lpad({value}, 6, '0') else {value} end)"
    return f"case when {code} in ('154322', '045101') then '154322+045101' else coalesce({code}, '{MISSING_FINANCING}') end"
