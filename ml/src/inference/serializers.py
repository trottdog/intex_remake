"""Prediction serialization helpers."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pandas as pd

from ml.src.config.paths import REPORTS_DIR
from ml.src.inference.predict import load_model_bundle, resolve_task_type
from ml.src.pipelines.registry import (
    build_predictive_dataset,
    get_notebook_pipeline_spec,
    get_predictive_pipeline_spec,
    load_predictive_pipeline_config,
)
from ml.src.pipelines.common import resolve_drop_columns

ML_CONTRACT_VERSION = "2026-04-phase-f"


def to_jsonable(value: Any) -> Any:
    """Convert pandas and numpy-friendly values into JSON-safe Python values."""

    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def dataframe_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Serialize a dataframe into JSON-safe row dictionaries."""

    records: list[dict[str, Any]] = []
    for row in df.to_dict(orient="records"):
        records.append({key: to_jsonable(value) for key, value in row.items()})
    return records


def load_metrics_payload(pipeline_name: str) -> dict[str, Any]:
    """Load a saved metrics payload for a predictive pipeline."""

    metrics_path = REPORTS_DIR / "evaluation" / f"{pipeline_name}_metrics.json"
    if not metrics_path.exists():
        return {}
    return json.loads(metrics_path.read_text(encoding="utf-8"))


def resolve_pipeline_task_type(pipeline_name: str) -> str:
    """Resolve a predictive pipeline task type from saved artifacts or metrics."""

    try:
        bundle = load_model_bundle(pipeline_name)
    except FileNotFoundError:
        metrics = load_metrics_payload(pipeline_name)
        task_type = str(metrics.get("task_type") or "").strip().lower()
        if task_type in {"classification", "regression"}:
            return task_type

        best_model_name = str(metrics.get("best_model_name") or "").lower()
        if "regressor" in best_model_name or "regression" in best_model_name:
            return "regression"
        return "classification"

    return resolve_task_type(bundle)


def infer_entity_type(id_columns: list[str]) -> str:
    """Infer the primary entity type from the pipeline id columns."""

    if "supporter_id" in id_columns:
        return "supporter"
    if "resident_id" in id_columns:
        return "resident"
    if "safehouse_id" in id_columns and "resident_id" not in id_columns:
        return "safehouse"
    if "post_id" in id_columns:
        return "social_media_post"
    return "record"


def build_route_hints(pipeline_name: str, *, entity_type: str) -> dict[str, Any]:
    """Build route hints for app integration consumers."""

    entity_endpoint = None
    if entity_type == "supporter":
        entity_endpoint = "/ml/supporters/{supporterId}/insights"
    elif entity_type == "resident":
        entity_endpoint = "/ml/residents/{residentId}/insights"
    elif entity_type == "safehouse":
        entity_endpoint = "/ml/safehouses/{safehouseId}/insights"

    return {
        "latest_run_endpoint": f"/ml/pipelines/{pipeline_name}",
        "prediction_feed_endpoint": f"/ml/pipelines/{pipeline_name}/predictions",
        "entity_insight_endpoint": entity_endpoint,
    }


def build_prediction_contract(task_type: str) -> dict[str, Any]:
    """Describe the prediction payload semantics for app consumers."""

    if task_type == "regression":
        return {
            "prediction_field": "prediction",
            "score_field": "prediction_score",
            "score_semantics": "predicted numeric value",
            "snapshot_value_field": "prediction_value",
            "snapshot_value_semantics": "null in published snapshots for regression pipelines",
        }

    return {
        "prediction_field": "prediction",
        "score_field": "prediction_score",
        "score_semantics": "positive-class probability",
        "snapshot_value_field": "prediction_value",
        "snapshot_value_semantics": "predicted binary class in published snapshots",
    }


def build_request_frame(
    pipeline_name: str,
    *,
    dataset: pd.DataFrame | None = None,
    sample_size: int = 3,
) -> pd.DataFrame:
    """Build a sample request frame for a predictive pipeline."""

    spec = get_predictive_pipeline_spec(pipeline_name)
    config = load_predictive_pipeline_config(pipeline_name)
    source = dataset if dataset is not None else build_predictive_dataset(pipeline_name, save_output=False)
    resolved_drop_cols = resolve_drop_columns(
        source,
        target_col=str(config["target"]),
        configured_drop_cols=[str(value) for value in config["drop_cols"]],
    )

    model_columns = [
        column
        for column in source.columns
        if column
        not in {
            str(config["target"]),
            str(config["split_col"]),
            *resolved_drop_cols,
        }
    ]
    request_columns = list(dict.fromkeys([*spec["id_columns"], *model_columns]))
    available_columns = [column for column in request_columns if column in source.columns]
    return source.loc[:, available_columns].head(sample_size).copy()


def build_prediction_response_payload(
    pipeline_name: str,
    scored_df: pd.DataFrame,
    *,
    id_columns: list[str] | None = None,
) -> dict[str, Any]:
    """Build a consistent API-style response payload for a scored dataframe."""

    spec = get_predictive_pipeline_spec(pipeline_name)
    selected_id_columns = id_columns or list(spec["id_columns"])
    metrics = load_metrics_payload(pipeline_name)
    task_type = resolve_pipeline_task_type(pipeline_name)
    response_columns = [
        column
        for column in [*selected_id_columns, "prediction", "prediction_score"]
        if column in scored_df.columns
    ]
    response_rows = scored_df.loc[:, response_columns] if response_columns else scored_df

    return {
        "pipeline_name": pipeline_name,
        "display_name": spec["display_name"],
        "task_type": task_type,
        "model_name": metrics.get("best_model_name"),
        "row_count": int(len(scored_df)),
        "metrics": metrics,
        "prediction_contract": build_prediction_contract(task_type),
        "predictions": dataframe_to_records(response_rows),
    }


def build_pipeline_manifest(
    pipeline_name: str,
    *,
    dataset: pd.DataFrame | None = None,
) -> dict[str, Any]:
    """Build a deployment-facing manifest for a predictive pipeline."""

    spec = get_predictive_pipeline_spec(pipeline_name)
    notebook_spec = get_notebook_pipeline_spec(pipeline_name)
    config = load_predictive_pipeline_config(pipeline_name)
    source = dataset if dataset is not None else build_predictive_dataset(pipeline_name, save_output=False)
    request_frame = build_request_frame(
        pipeline_name,
        dataset=source,
        sample_size=min(3, len(source)),
    )
    id_columns = list(spec["id_columns"])
    task_type = resolve_pipeline_task_type(pipeline_name)
    entity_type = infer_entity_type(id_columns)

    return {
        "contract_version": ML_CONTRACT_VERSION,
        "pipeline_name": pipeline_name,
        "slug": spec["slug"],
        "display_name": spec["display_name"],
        "task_type": task_type,
        "entity_type": entity_type,
        "business_question": spec["business_question"],
        "predictive_question": notebook_spec["predictive_question"],
        "explanatory_question": notebook_spec["explanatory_question"],
        "decision_support": notebook_spec["decision_support"],
        "primary_users": list(notebook_spec["primary_users"]),
        "shared_dataset": spec["shared_dataset"],
        "target_column": config["target"],
        "target_summary": notebook_spec["target_summary"],
        "split_column": config["split_col"],
        "passthrough_id_columns": id_columns,
        "request_columns": list(request_frame.columns),
        "model_input_columns": [column for column in request_frame.columns if column not in id_columns],
        "recommended_widgets": list(notebook_spec["recommended_widgets"]),
        "deployment_notes": list(notebook_spec["deployment_notes"]),
        "route_hints": build_route_hints(pipeline_name, entity_type=entity_type),
        "prediction_contract": build_prediction_contract(task_type),
        "metrics": load_metrics_payload(pipeline_name),
    }


def write_json(payload: Any, output_path: Path) -> Path:
    """Write a JSON payload to disk with stable formatting."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=True),
        encoding="utf-8",
    )
    return output_path
