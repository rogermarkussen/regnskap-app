"""Ett grensesnitt mellom applikasjonskode og eksterne datafiler."""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


class DataContractError(RuntimeError):
    """Manifestet eller en fil bryter datakontrakten."""


@dataclass(frozen=True)
class Dataset:
    dataset_id: str
    path: Path
    format: str
    role: str
    classification: str
    sha256: str


class DataContract:
    def __init__(self, manifest_path: Path, data_root: Path | None = None) -> None:
        self.manifest_path = manifest_path.resolve()
        try:
            manifest = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise DataContractError(f"Kan ikke lese datamanifestet: {exc}") from exc

        if manifest.get("schema_version") != 1:
            raise DataContractError("Datamanifestet må ha schema_version 1")
        snapshot_id = manifest.get("snapshot_id")
        if not isinstance(snapshot_id, str) or not snapshot_id.strip():
            raise DataContractError("Datamanifestet mangler snapshot_id")

        env_name = manifest.get("data_root_env", "REGNSKAP_DATA_ROOT")
        configured_root = data_root or (
            Path(os.environ[env_name]).expanduser() if os.environ.get(env_name) else None
        )
        self.data_root = (
            configured_root or self.manifest_path.parent.parent / "Regnskap-data"
        ).resolve()
        test_env_name = manifest.get("test_data_root_env", "REGNSKAP_TEST_DATA_ROOT")
        configured_test_root = os.environ.get(test_env_name)
        self.test_data_root = (
            Path(configured_test_root).expanduser().resolve()
            if configured_test_root
            else None
        )
        self.snapshot_id = (
            str(manifest.get("test_snapshot_id") or snapshot_id)
            if self.test_data_root
            else snapshot_id
        )
        generated_snapshot_ids = (
            manifest.get("test_generated_snapshot_ids", {})
            if self.test_data_root
            else manifest.get("generated_snapshot_ids", {})
        )
        if not isinstance(generated_snapshot_ids, dict):
            raise DataContractError("Oppgavespesifikke snapshot-ID-er må være et objekt")
        self._generated_snapshot_ids = {}
        for task_name, generated_snapshot_id in generated_snapshot_ids.items():
            task = str(task_name)
            value = str(generated_snapshot_id)
            if (
                not task
                or any(part in task for part in ("/", "\\", ".."))
                or not value
                or any(part in value for part in ("/", "\\", ".."))
            ):
                raise DataContractError(
                    f"Ugyldig oppgavespesifikk snapshot-ID: {task_name}={generated_snapshot_id}"
                )
            self._generated_snapshot_ids[task] = value
        datasets = manifest.get("datasets")
        if not isinstance(datasets, dict) or not datasets:
            raise DataContractError("Datamanifestet må inneholde minst ett datasett")
        self._datasets = dict(datasets)
        self._dataset_roots = {
            dataset_id: self.data_root for dataset_id in self._datasets
        }
        if self.test_data_root:
            test_datasets = manifest.get("test_datasets")
            if not isinstance(test_datasets, dict) or not test_datasets:
                raise DataContractError(
                    f"{test_env_name} er satt, men manifestet mangler test_datasets"
                )
            self._datasets.update(test_datasets)
            self._dataset_roots.update(
                {dataset_id: self.test_data_root for dataset_id in test_datasets}
            )

    def dataset(self, dataset_id: str, *, verify_hash: bool = False) -> Dataset:
        raw = self._datasets.get(dataset_id)
        if not isinstance(raw, dict):
            raise DataContractError(f"Ukjent datasett-ID: {dataset_id}")
        relative = Path(str(raw.get("path", "")))
        if relative.is_absolute() or ".." in relative.parts:
            raise DataContractError(f"Ugyldig relativ datasti for {dataset_id}: {relative}")
        dataset_root = self._dataset_roots[dataset_id]
        path = (dataset_root / relative).resolve()
        if not path.is_relative_to(dataset_root):
            raise DataContractError(f"Datast stikker utenfor dataroten: {dataset_id}")
        if not path.is_file():
            raise DataContractError(f"Mangler datasett {dataset_id}: {path}")

        expected_hash = str(raw.get("sha256", ""))
        if len(expected_hash) != 64:
            raise DataContractError(f"Ugyldig SHA-256 for {dataset_id}")
        dataset = Dataset(
            dataset_id=dataset_id,
            path=path,
            format=str(raw.get("format", "")),
            role=str(raw.get("role", "")),
            classification=str(raw.get("classification", "")),
            sha256=expected_hash,
        )
        if verify_hash and _sha256(path) != expected_hash:
            raise DataContractError(f"Kontrollsummen er feil for {dataset_id}: {path}")
        return dataset

    def path(self, dataset_id: str, *, verify_hash: bool = False) -> Path:
        return self.dataset(dataset_id, verify_hash=verify_hash).path

    def datasets(self, roles: Iterable[str] | None = None) -> list[Dataset]:
        accepted = set(roles) if roles is not None else None
        result = []
        for dataset_id in sorted(self._datasets):
            dataset = self.dataset(dataset_id)
            if accepted is None or dataset.role in accepted:
                result.append(dataset)
        return result

    def verify_all(self) -> list[Dataset]:
        return [self.dataset(dataset_id, verify_hash=True) for dataset_id in sorted(self._datasets)]

    def generated_dir(self, task_name: str) -> Path:
        if not task_name or any(part in task_name for part in ("/", "\\", "..")):
            raise DataContractError(f"Ugyldig oppgavenavn: {task_name}")
        output_root = self.test_data_root or self.data_root
        snapshot_id = self._generated_snapshot_ids.get(task_name, self.snapshot_id)
        return output_root / "generated" / snapshot_id / task_name


def load_data_contract(repo_root: Path | None = None) -> DataContract:
    root = (repo_root or Path(__file__).resolve().parents[1]).resolve()
    return DataContract(root / "data-manifest.json")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
