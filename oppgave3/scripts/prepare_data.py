"""Bygg kun workflow- og månedsavslutningsdata for oppgave 3."""

from __future__ import annotations

import shutil
from pathlib import Path

import duckdb

try:
    from .monthly_close_data import build_monthly_close
    from .project_data import task3_sources
    from .workflow_data import workflow_invoice_frames
except ImportError:
    from monthly_close_data import build_monthly_close
    from project_data import task3_sources
    from workflow_data import workflow_invoice_frames


ROOT = Path(__file__).resolve().parents[1]
PARQUET_DIR = task3_sources().generated_dir / "evidence"
SOURCE_DIR = ROOT / "sources" / "regnskap"
DUCKDB_PATH = SOURCE_DIR / "regnskap.duckdb"


def write_table(connection: duckdb.DuckDBPyConnection, name: str, frame) -> Path:
    path = PARQUET_DIR / f"{name}.parquet"
    connection.register("frame_to_write", frame)
    connection.execute(
        f"copy frame_to_write to '{path.as_posix()}' (format parquet, compression zstd)"
    )
    connection.unregister("frame_to_write")
    return path


def main() -> None:
    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    workflow_status, events, validations, metadata = workflow_invoice_frames(ROOT)
    monthly_close = build_monthly_close(ROOT)
    frames = {
        "workflow_invoice_status": workflow_status,
        "workflow_invoice_events": events,
        "workflow_invoice_validation": validations,
        "workflow_source_metadata": metadata,
        "monthly_close_summary": monthly_close.summary,
        "monthly_close_invoices": monthly_close.invoices,
        "monthly_close_validation": monthly_close.validations,
    }

    writer = duckdb.connect()
    try:
        outputs = {
            name: write_table(writer, name, frame) for name, frame in frames.items()
        }
    finally:
        writer.close()

    if DUCKDB_PATH.exists():
        DUCKDB_PATH.unlink()
    database = duckdb.connect(DUCKDB_PATH)
    try:
        for name, path in outputs.items():
            database.execute(
                f"create table {name} as select * from read_parquet('{path.as_posix()}')"
            )
    finally:
        database.close()
    print("Oppgave 3: skrev 7 isolerte datatabeller")


if __name__ == "__main__":
    main()
