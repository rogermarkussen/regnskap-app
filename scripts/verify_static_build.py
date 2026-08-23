from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = REPO_ROOT / "deployment-policy.json"
FORBIDDEN_SUFFIXES = {".csv", ".db", ".duckdb", ".py", ".sql"}
FORBIDDEN_PATH_PARTS = {
    "data-fra-økonomi",
    "data-ny",
    "fasit",
    "sources",
    "testdata-opplasting",
    "tests",
}
RAW_DATA_NAMES = {
    "agldimvalue",
    "agltransact",
    "agltransact_beriket",
    "apltransact",
    "apltransactvalue",
    "aplversion",
    "awftaskfin",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("application", choices=("oppgave1", "oppgave2", "oppgave3"))
    parser.add_argument("task_root", type=Path)
    parser.add_argument("--profile", choices=("internal", "public"), default="internal")
    args = parser.parse_args()
    policy = json.loads(POLICY_PATH.read_text(encoding="utf-8"))["applications"][args.application]
    if args.profile == "public" and not policy.get("public_without_data", False):
        print(
            f"Offentlig bygg er sperret for {args.application}: {policy['reason']}",
            file=sys.stderr,
        )
        return 1

    build = args.task_root.resolve() / "build"
    if not (build / "index.html").is_file():
        print(f"Produksjonskontroll feilet: {build / 'index.html'} finnes ikke.", file=sys.stderr)
        return 1
    allowed_parquet = set() if args.profile == "public" else set(policy["allowed_parquet"])
    allowed_xlsx = set() if args.profile == "public" else set(policy["allowed_xlsx"])
    findings = []
    for path in build.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(build)
        lowered_parts = {part.lower() for part in relative.parts}
        suffix = path.suffix.lower()
        public_data_file = args.profile == "public" and (
            suffix in {".parquet", ".xlsx"}
            or "data" in lowered_parts
        )
        if (
            public_data_file
            or suffix in FORBIDDEN_SUFFIXES
            or (suffix == ".parquet" and path.name not in allowed_parquet)
            or (suffix == ".xlsx" and path.name not in allowed_xlsx)
            or path.name.lower().endswith(".map")
            or lowered_parts & FORBIDDEN_PATH_PARTS
            or path.stem.lower() in RAW_DATA_NAMES
        ):
            findings.append(relative)
    if findings:
        print("Produksjonskontroll feilet. Disse filene skal ikke publiseres:", file=sys.stderr)
        for path in findings:
            print(f"- {path}", file=sys.stderr)
        return 1

    file_count = sum(path.is_file() for path in build.rglob("*"))
    size_bytes = sum(path.stat().st_size for path in build.rglob("*") if path.is_file())
    print(
        f"Produksjonskontroll bestått for {args.application}: "
        f"{file_count} filer, {size_bytes / 1024 / 1024:.1f} MB, profil {args.profile}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
