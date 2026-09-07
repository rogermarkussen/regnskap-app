"""Bekreftet dobbeltføring, utelatt etter brukerbeslutning 08.09.2026.

Transaksjon 5733017 på 771 beholdes. Operative kildedata endres ikke.
"""


def budget_inclusion_sql(alias: str = "h") -> str:
    return f"""not (
      coalesce(trim(cast({alias}.version as varchar)), '') = '2026RV'
      and coalesce(trim(cast({alias}.trans_id as varchar)), '') = '5219663'
      and coalesce(trim(cast({alias}.dim_1 as varchar)), '') = '711'
    )"""
