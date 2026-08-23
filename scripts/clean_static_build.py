from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("task_root", type=Path)
    args = parser.parse_args()
    task_root = args.task_root.resolve()
    for path in (
        task_root / "build",
        task_root / ".evidence" / "template" / "build",
        task_root / ".evidence" / "template" / ".svelte-kit" / "output",
    ):
        if path.is_dir():
            shutil.rmtree(path)
        elif path.exists():
            path.unlink()


if __name__ == "__main__":
    main()
