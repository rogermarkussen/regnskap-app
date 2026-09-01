from __future__ import annotations

import sys
import argparse
import hashlib
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from shared.data_contract import DataContractError, load_data_contract


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--upload', action='store_true', help='Kontroller bare snapshotet med de 12 opplastingsfilene')
    parser.add_argument('--folder', type=Path, help='Kontroller i tillegg at en lokal opplastingsmappe er identisk med snapshotet')
    args = parser.parse_args()
    if args.folder and not args.upload:
        parser.error('--folder krever --upload')
    try:
        contract = load_data_contract(REPO_ROOT)
        if args.upload:
            manifest = json.loads((REPO_ROOT / 'data-manifest.json').read_text())
            ids = sorted(key for key in manifest['datasets'] if key.startswith('upload.'))
            if len(ids) != 12:
                raise DataContractError('Opplastingssnapshotet skal inneholde 12 datasett')
            datasets = [contract.dataset(key, verify_hash=True) for key in ids]
            snapshot_id = manifest['upload_snapshot_id']
            if args.folder:
                expected = {dataset.path.name: dataset.sha256 for dataset in datasets}
                paths = list(args.folder.iterdir())
                if any(not path.is_file() for path in paths) or {path.name for path in paths} != set(expected):
                    raise DataContractError('Opplastingsmappen skal inneholde nøyaktig de 12 filene, uten undermapper')
                for path in paths:
                    if hashlib.sha256(path.read_bytes()).hexdigest() != expected[path.name]:
                        raise DataContractError(f'Kontrollsummen er feil for {path}')
        else:
            datasets = contract.verify_all()
            snapshot_id = contract.snapshot_id
    except DataContractError as exc:
        print(f"Datakontrakt feilet: {exc}", file=sys.stderr)
        return 1

    print(f"Datakontrakt bestått for snapshot {snapshot_id}")
    print(f"- Datarot: {contract.data_root}")
    print(f"- {len(datasets)} filer med gyldig SHA-256")
    for role in sorted({dataset.role for dataset in datasets}):
        count = sum(dataset.role == role for dataset in datasets)
        print(f"- {role}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
