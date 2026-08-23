from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import load_data_contract


@dataclass(frozen=True)
class Task3Sources:
    ledger: Path
    budget_header: Path
    budget_values: Path
    workflow: Path
    monthly_close_template: Path
    generated_dir: Path


def task3_sources() -> Task3Sources:
    contract = load_data_contract(REPO_ROOT)
    return Task3Sources(
        ledger=contract.path("common.ledger"),
        budget_header=contract.path("common.budget_header"),
        budget_values=contract.path("common.budget_values"),
        workflow=contract.path("task3.workflow"),
        monthly_close_template=contract.path("task3.monthly_close_template"),
        generated_dir=contract.generated_dir("oppgave3"),
    )
