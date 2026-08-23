from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import DataContractError, load_data_contract


def main() -> int:
    try:
        contract = load_data_contract(REPO_ROOT)
        datasets = contract.verify_all()
    except DataContractError as exc:
        print(f"Datakontrakt feilet: {exc}", file=sys.stderr)
        return 1

    print(f"Datakontrakt bestått for snapshot {contract.snapshot_id}")
    print(f"- Datarot: {contract.data_root}")
    print(f"- {len(datasets)} filer med gyldig SHA-256")
    for role in sorted({dataset.role for dataset in datasets}):
        count = sum(dataset.role == role for dataset in datasets)
        print(f"- {role}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
