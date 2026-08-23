from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import load_data_contract


@dataclass(frozen=True)
class Task2Sources:
    ledger: Path
    budget_header: Path
    budget_values: Path
    dashboard_workbook: Path
    raw_transactions_workbook: Path
    account_grouping_workbook: Path
    generated_dir: Path


def task2_sources() -> Task2Sources:
    contract = load_data_contract(REPO_ROOT)
    return Task2Sources(
        ledger=contract.path("common.ledger"),
        budget_header=contract.path("common.budget_header"),
        budget_values=contract.path("common.budget_values"),
        dashboard_workbook=contract.path("task2.dashboard_workbook"),
        raw_transactions_workbook=contract.path("task2.raw_transactions_workbook"),
        account_grouping_workbook=contract.path("task2.account_grouping_workbook"),
        generated_dir=contract.generated_dir("oppgave2"),
    )
