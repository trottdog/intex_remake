"""Entrypoint for batch scoring."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.config.paths import ML_ROOT
from ml.src.inference.batch_score import score_batch_csv
from ml.src.pipelines.registry import list_predictive_pipelines


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser for batch scoring."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pipeline_name",
        choices=list_predictive_pipelines(),
        help="Predictive pipeline to score.",
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to the input CSV file to score.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output CSV path. Defaults to ml/reports/evaluation/<pipeline>_batch_scores.csv",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    output_path = (
        Path(args.output)
        if args.output is not None
        else ML_ROOT / "reports" / "evaluation" / f"{args.pipeline_name}_batch_scores.csv"
    )
    scored = score_batch_csv(
        args.input,
        pipeline_name=args.pipeline_name,
        output_path=output_path,
    )
    print(f"Scored {len(scored)} rows for {args.pipeline_name} and wrote {output_path}")


if __name__ == "__main__":
    main()
