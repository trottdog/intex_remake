"""Prediction entry points."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from ml.src.config.paths import MODELS_DIR


def load_model_bundle(
    pipeline_name: str,
    *,
    model_filename: str = "predictive_model.joblib",
    model_dir: Path | None = None,
) -> dict[str, Any]:
    """Load a saved predictive model bundle."""

    source_dir = model_dir or MODELS_DIR / pipeline_name
    model_path = source_dir / model_filename
    if not model_path.exists():
        raise FileNotFoundError(f"Could not find model artifact at {model_path}")
    return joblib.load(model_path)


def transform_features(
    df: pd.DataFrame,
    *,
    model_bundle: dict[str, Any],
) -> pd.DataFrame:
    """Apply the saved preprocessor to a scoring dataframe."""

    excluded_columns = [
        model_bundle["target_col"],
        model_bundle["split_col"],
        *model_bundle["drop_cols"],
    ]
    raw_features = df.drop(columns=excluded_columns, errors="ignore")
    preprocessor = model_bundle["preprocessor"]

    # Align scoring frame columns to the exact fitted training feature schema.
    expected_columns = list(getattr(preprocessor, "feature_names_in_", []))
    if expected_columns:
        for column in expected_columns:
            if column not in raw_features.columns:
                raw_features[column] = pd.NA
        raw_features = raw_features.loc[:, expected_columns]

    # Enforce dtypes expected by the saved column-transformer branches.
    for branch_name, _transformer, columns in getattr(preprocessor, "transformers_", []):
        if branch_name == "remainder" or columns is None:
            continue

        if isinstance(columns, slice):
            selected_columns = list(raw_features.columns[columns])
        elif hasattr(columns, "tolist"):
            selected_columns = list(columns.tolist())
        elif isinstance(columns, (list, tuple)):
            selected_columns = list(columns)
        else:
            selected_columns = [str(columns)]

        existing_columns = [column for column in selected_columns if column in raw_features.columns]
        if not existing_columns:
            continue

        if branch_name == "numeric":
            for column in existing_columns:
                raw_features[column] = pd.to_numeric(raw_features[column], errors="coerce")
        elif branch_name == "categorical":
            raw_features[existing_columns] = raw_features[existing_columns].astype("object")

    transformed = preprocessor.transform(raw_features)
    return pd.DataFrame(
        transformed,
        columns=model_bundle["feature_names"],
        index=df.index,
    )


def resolve_task_type(model_bundle: dict[str, Any]) -> str:
    """Resolve the saved pipeline task type from a model bundle."""

    task_type = str(model_bundle.get("task_type") or "").strip().lower()
    if task_type in {"classification", "regression"}:
        return task_type

    model = model_bundle.get("model")
    if hasattr(model, "predict_proba"):
        return "classification"
    return "regression"


def predict_dataframe(
    df: pd.DataFrame,
    *,
    pipeline_name: str | None = None,
    model_bundle: dict[str, Any] | None = None,
) -> pd.DataFrame:
    """Score a dataframe with a saved predictive model bundle."""

    bundle = model_bundle or load_model_bundle(str(pipeline_name))
    transformed = transform_features(df, model_bundle=bundle)
    model = bundle["model"]
    task_type = resolve_task_type(bundle)

    raw_predictions = pd.Series(model.predict(transformed), index=df.index)
    if task_type == "classification":
        predictions = raw_predictions.astype("int64")
    else:
        predictions = pd.to_numeric(raw_predictions, errors="coerce")
    scored = df.copy()
    scored["prediction"] = predictions

    if task_type == "classification" and hasattr(model, "predict_proba"):
        scores = model.predict_proba(transformed)[:, 1]
        scored["prediction_score"] = scores
    else:
        scored["prediction_score"] = pd.to_numeric(predictions, errors="coerce")

    return scored
