from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from shared.data_contract import DataContract, DataContractError


class DataContractTest(unittest.TestCase):
    def _contract(self, relative_path: str, expected_hash: str) -> tuple[DataContract, Path]:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        data_root = root / "data"
        data_root.mkdir()
        manifest = {
            "schema_version": 1,
            "snapshot_id": "test",
            "datasets": {
                "sample": {
                    "path": relative_path,
                    "format": "txt",
                    "role": "operative",
                    "classification": "internal",
                    "sha256": expected_hash,
                }
            },
        }
        manifest_path = root / "data-manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return DataContract(manifest_path, data_root), data_root

    def test_returns_verified_external_file(self) -> None:
        content = b"regnskap\n"
        expected_hash = hashlib.sha256(content).hexdigest()
        contract, data_root = self._contract("snapshot/source.txt", expected_hash)
        source = data_root / "snapshot" / "source.txt"
        source.parent.mkdir()
        source.write_bytes(content)

        self.assertEqual(contract.path("sample", verify_hash=True), source)

    def test_rejects_changed_file(self) -> None:
        expected_hash = hashlib.sha256(b"forventet").hexdigest()
        contract, data_root = self._contract("source.txt", expected_hash)
        (data_root / "source.txt").write_bytes(b"endret")

        with self.assertRaisesRegex(DataContractError, "Kontrollsummen er feil"):
            contract.path("sample", verify_hash=True)

    def test_rejects_path_outside_data_root(self) -> None:
        expected_hash = hashlib.sha256(b"x").hexdigest()
        contract, _ = self._contract("../outside.txt", expected_hash)

        with self.assertRaisesRegex(DataContractError, "Ugyldig relativ datasti"):
            contract.path("sample")
