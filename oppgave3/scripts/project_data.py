from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import DataContractError, load_data_contract


@dataclass(frozen=True)
class Task3Sources:
    ledger: Path
    budget_header: Path
    budget_values: Path
    workflow: Path
    invoice_queue_history: Path | None
    receivables: Path | None
    ledger_map: Path | None
    cash_ledger: Path | None
    monthly_close_template: Path
    generated_dir: Path


def task3_sources() -> Task3Sources:
    contract = load_data_contract(REPO_ROOT)

    def optional_path(dataset_id: str) -> Path | None:
        try:
            return contract.path(dataset_id)
        except DataContractError:
            return None

    return Task3Sources(
        ledger=contract.path("common.ledger"),
        budget_header=contract.path("common.budget_header"),
        budget_values=contract.path("common.budget_values"),
        workflow=contract.path("task3.workflow"),
        invoice_queue_history=optional_path("task3.invoice_queue_history"),
        receivables=optional_path("common.receivables"),
        ledger_map=optional_path("common.ledger_map"),
        cash_ledger=optional_path("common.cash_ledger"),
        monthly_close_template=contract.path("task3.monthly_close_template"),
        generated_dir=contract.generated_dir("oppgave3"),
    )
