"""Entrypoint to train a single predictive pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.pipelines.registry import list_predictive_pipelines, run_predictive_pipeline


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI argument parser."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pipeline_name",
        choices=list_predictive_pipelines(),
        help="Registered predictive pipeline to train.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    metrics = run_predictive_pipeline(args.pipeline_name)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
