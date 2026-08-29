from __future__ import annotations

import hashlib
import json
import os
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

    def test_test_root_overrides_only_declared_datasets(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        production_root = root / "production"
        test_root = root / "test"
        production_root.mkdir()
        test_root.mkdir()
        production_file = production_root / "template.txt"
        production_file.write_text("mal", encoding="utf-8")
        test_file = test_root / "ledger.txt"
        test_file.write_text("testdata", encoding="utf-8")
        manifest = {
            "schema_version": 1,
            "snapshot_id": "production",
            "test_snapshot_id": "test-snapshot",
            "test_generated_snapshot_ids": {"oppgave3": "task3-v2"},
            "test_data_root_env": "REGNSKAP_TEST_DATA_ROOT",
            "datasets": {
                "ledger": {
                    "path": "old-ledger.txt",
                    "format": "txt",
                    "role": "operative",
                    "classification": "internal",
                    "sha256": hashlib.sha256(b"old").hexdigest(),
                },
                "template": {
                    "path": "template.txt",
                    "format": "txt",
                    "role": "template",
                    "classification": "internal",
                    "sha256": hashlib.sha256(b"mal").hexdigest(),
                },
            },
            "test_datasets": {
                "ledger": {
                    "path": "ledger.txt",
                    "format": "txt",
                    "role": "operative",
                    "classification": "internal",
                    "sha256": hashlib.sha256(b"testdata").hexdigest(),
                }
            },
        }
        manifest_path = root / "data-manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

        previous = os.environ.get("REGNSKAP_TEST_DATA_ROOT")
        os.environ["REGNSKAP_TEST_DATA_ROOT"] = str(test_root)
        self.addCleanup(
            lambda: (
                os.environ.pop("REGNSKAP_TEST_DATA_ROOT", None)
                if previous is None
                else os.environ.__setitem__("REGNSKAP_TEST_DATA_ROOT", previous)
            )
        )
        contract = DataContract(manifest_path, production_root)

        self.assertEqual(contract.path("ledger", verify_hash=True), test_file)
        self.assertEqual(contract.path("template", verify_hash=True), production_file)
        self.assertEqual(contract.snapshot_id, "test-snapshot")
        self.assertEqual(
            contract.generated_dir("oppgave2"),
            test_root / "generated" / "test-snapshot" / "oppgave2",
        )
        self.assertEqual(
            contract.generated_dir("oppgave3"),
            test_root / "generated" / "task3-v2" / "oppgave3",
        )
