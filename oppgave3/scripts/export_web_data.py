"""Eksporter validerte Parquet-tabeller til statiske JSON-filer med DuckDB CLI."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

try:
    from .project_data import task3_sources
except ImportError:
    from project_data import task3_sources


ROOT = Path(__file__).resolve().parents[1]
PARQUET_DIR = task3_sources().generated_dir / "web"
OUTPUT_DIR = ROOT / "static" / "data"
TABLES = (
    "workflow_invoice_status",
    "workflow_invoice_validation",
    "workflow_source_metadata",
    "monthly_close_summary",
    "monthly_close_invoices",
    "monthly_close_validation",
)
EVENT_SHARDS = 16


def _sql_path(path: Path) -> str:
    value = path.resolve().as_posix()
    if "'" in value:
        raise ValueError(f"Filstien kan ikke brukes i DuckDB SQL: {path}")
    return value


def main() -> None:
    duckdb = shutil.which("duckdb")
    if not duckdb:
        raise SystemExit("DuckDB CLI mangler. Installer duckdb før webdata eksporteres.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    expected = {f"{name}.json" for name in TABLES} | {
        f"workflow_invoice_events_{shard:02d}.json" for shard in range(EVENT_SHARDS)
    }
    for stale in OUTPUT_DIR.glob("*.json"):
        if stale.name not in expected:
            stale.unlink()

    for table in TABLES:
        source = PARQUET_DIR / f"{table}.parquet"
        target = OUTPUT_DIR / f"{table}.json"
        if not source.is_file():
            raise SystemExit(f"Mangler generert tabell: {source}")
        projection = (
            "*, abs(hash(cast(fakturanr as varchar))) % "
            f"{EVENT_SHARDS} as event_shard"
            if table == "workflow_invoice_status"
            else "*"
        )
        command = (
            f"copy (select {projection} from read_parquet('"
            + _sql_path(source)
            + "')) to '"
            + _sql_path(target)
            + "' (format json, array true);"
        )
        subprocess.run([duckdb, "-c", command], check=True)

    event_source = PARQUET_DIR / "workflow_invoice_events.parquet"
    if not event_source.is_file():
        raise SystemExit(f"Mangler generert tabell: {event_source}")
    for shard in range(EVENT_SHARDS):
        target = OUTPUT_DIR / f"workflow_invoice_events_{shard:02d}.json"
        command = (
            "copy (select * from read_parquet('"
            + _sql_path(event_source)
            + f"') where abs(hash(cast(fakturanr as varchar))) % {EVENT_SHARDS} = {shard}) to '"
            + _sql_path(target)
            + "' (format json, array true);"
        )
        subprocess.run([duckdb, "-c", command], check=True)

    print(
        f"Oppgave 3: eksporterte {len(TABLES)} tabeller og "
        f"{EVENT_SHARDS} hendelsesdeler til {OUTPUT_DIR}"
    )


if __name__ == "__main__":
    main()
