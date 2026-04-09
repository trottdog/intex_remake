"""Entrypoint to export model artifacts for API integration."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.inference.batch_score import build_sample_batch_request, score_batch_records
from ml.src.inference.serializers import build_pipeline_manifest, write_json
from ml.src.pipelines.registry import list_predictive_pipelines


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI parser for API export."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pipeline_name",
        nargs="?",
        choices=list_predictive_pipelines(),
        help="Optional single pipeline to export. Omit to export all predictive pipelines.",
    )
    return parser


def export_pipeline(pipeline_name: str, output_dir: Path) -> list[Path]:
    """Export request/response examples and a manifest for one pipeline."""

    request_payload = {
        "pipeline_name": pipeline_name,
        "records": build_sample_batch_request(pipeline_name, sample_size=3),
    }
    response_payload = score_batch_records(
        request_payload["records"],
        pipeline_name=pipeline_name,
    )
    manifest_payload = build_pipeline_manifest(pipeline_name)

    return [
        write_json(request_payload, output_dir / f"{pipeline_name}_request.json"),
        write_json(response_payload, output_dir / f"{pipeline_name}_response.json"),
        write_json(manifest_payload, output_dir / f"{pipeline_name}_manifest.json"),
    ]


def main() -> None:
    args = build_parser().parse_args()
    selected = [args.pipeline_name] if args.pipeline_name else list_predictive_pipelines()
    output_dir = REPO_ROOT / "ml" / "app-integration" / "payload_examples"

    exported: list[Path] = []
    for pipeline_name in selected:
        exported.extend(export_pipeline(pipeline_name, output_dir))

    print(f"Exported {len(exported)} Phase F API files to {output_dir}")


if __name__ == "__main__":
    main()
