"""Entrypoint to run the implemented predictive pipelines."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.config.paths import REPORTS_DIR
from ml.src.pipelines.registry import run_predictive_pipelines


def save_summary(summary) -> None:
    """Persist the predictive-pipeline training summary."""

    output_path = REPORTS_DIR / "evaluation" / "phase3_predictive_summary.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    summary.to_csv(output_path, index=False)


def main() -> None:
    summary = run_predictive_pipelines()
    save_summary(summary)
    print(summary.to_string(index=False))


if __name__ == "__main__":
    main()
