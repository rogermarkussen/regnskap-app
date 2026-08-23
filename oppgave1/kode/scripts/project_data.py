from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import load_data_contract


@dataclass(frozen=True)
class Task1Sources:
    ledger: Path
    budget_header: Path
    budget_values: Path
    generated_dir: Path


def task1_sources() -> Task1Sources:
    contract = load_data_contract(REPO_ROOT)
    return Task1Sources(
        ledger=contract.path("common.ledger"),
        budget_header=contract.path("common.budget_header"),
        budget_values=contract.path("common.budget_values"),
        generated_dir=contract.generated_dir("oppgave1"),
    )
