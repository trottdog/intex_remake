"""Shared prediction-service example for Phase F deployment reuse."""

from __future__ import annotations

from ml.src.inference.batch_score import score_batch_records
from ml.src.inference.serializers import build_pipeline_manifest
from ml.src.pipelines.registry import get_predictive_pipeline_spec, list_predictive_pipelines


def list_supported_pipelines() -> list[str]:
    """Return the predictive pipelines currently exposed to the app layer."""

    return list_predictive_pipelines()


def list_pipeline_catalog() -> list[dict[str, object]]:
    """Return a compact pipeline catalog for API integration surfaces."""

    return [
        {
            "pipeline_name": pipeline_name,
            "display_name": get_predictive_pipeline_spec(pipeline_name)["display_name"],
            "manifest": build_pipeline_manifest(pipeline_name),
        }
        for pipeline_name in list_predictive_pipelines()
    ]


def predict_pipeline_records(
    pipeline_name: str,
    records: list[dict[str, object]],
) -> dict[str, object]:
    """Generic endpoint-style helper for app integration."""

    return score_batch_records(records, pipeline_name=pipeline_name)


def get_pipeline_manifest_payload(pipeline_name: str) -> dict[str, object]:
    """Return the deployment-facing manifest for one predictive pipeline."""

    return build_pipeline_manifest(pipeline_name)
