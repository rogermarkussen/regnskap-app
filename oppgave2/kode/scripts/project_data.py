from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import load_data_contract
from shared.data_contract import DataContractError


@dataclass(frozen=True)
class Task2Sources:
    ledger: Path
    budget_header: Path
    budget_values: Path
    dimension_values: Path
    dashboard_workbook: Path
    raw_transactions_workbook: Path
    account_grouping_workbook: Path
    cash_ledger: Path | None
    cash_accounts: Path | None
    account_plan: Path | None
    generated_dir: Path


def task2_sources() -> Task2Sources:
    contract = load_data_contract(REPO_ROOT)

    def optional_path(dataset_id: str) -> Path | None:
        try:
            return contract.path(dataset_id)
        except DataContractError:
            return None

    return Task2Sources(
        ledger=contract.path("common.ledger"),
        budget_header=contract.path("common.budget_header"),
        budget_values=contract.path("common.budget_values"),
        dimension_values=contract.path("common.dimension_values"),
        dashboard_workbook=contract.path("task2.dashboard_workbook"),
        raw_transactions_workbook=contract.path("task2.raw_transactions_workbook"),
        account_grouping_workbook=contract.path("task2.account_grouping_workbook"),
        cash_ledger=optional_path("common.cash_ledger"),
        cash_accounts=optional_path("common.cash_accounts"),
        account_plan=optional_path("common.account_plan"),
        generated_dir=contract.generated_dir("oppgave2"),
    )
