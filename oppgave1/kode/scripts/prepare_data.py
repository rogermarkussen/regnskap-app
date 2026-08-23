"""Bygg kun datatabellene som oppgave 1 publiserer."""

from __future__ import annotations

from pathlib import Path

import duckdb

try:
    from .dashboard_kpi_data import build_dashboard_kpi_frame, build_dashboard_kpi_metadata_frame
    from .project_data import task1_sources
except ImportError:
    from dashboard_kpi_data import build_dashboard_kpi_frame, build_dashboard_kpi_metadata_frame
    from project_data import task1_sources


CODE_ROOT = Path(__file__).resolve().parents[1]
TASK_ROOT = CODE_ROOT.parent
PARQUET_DIR = task1_sources().generated_dir / "evidence"
SOURCE_DIR = CODE_ROOT / "sources" / "regnskap"
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
    writer = duckdb.connect()
    try:
        outputs = {
            "dashboard_kpi_calculated": write_table(
                writer, "dashboard_kpi_calculated", build_dashboard_kpi_frame(TASK_ROOT)
            ),
            "dashboard_kpi_source_metadata": write_table(
                writer,
                "dashboard_kpi_source_metadata",
                build_dashboard_kpi_metadata_frame(TASK_ROOT),
            ),
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
    print("Oppgave 1: skrev 2 isolerte datatabeller")


if __name__ == "__main__":
    main()
