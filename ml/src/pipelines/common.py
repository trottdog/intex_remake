"""Shared helpers for pipeline dataset building and model training."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
import yaml

from ml.src.modeling.explainability import plot_feature_importance, summarize_coefficients
from ml.src.modeling.metrics import compare_models, evaluate_classifier
from ml.src.modeling.train import (
    encode_features,
    make_baseline_models,
    run_classification_baselines,
    run_regression_baselines,
    time_split_data,
)


@dataclass
class PipelineTrainingResult:
    """Container for pipeline training outputs."""

    best_model_name: str
    best_model: object
    model_bundle: dict[str, Any]
    comparison: pd.DataFrame
    best_metrics: dict[str, float]
    train_rows: int
    test_rows: int
    explainability_frame: pd.DataFrame


def load_pipeline_config(config_path: Path) -> dict[str, Any]:
    """Load a YAML pipeline config file."""

    with config_path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def train_classification_pipeline(
    dataset: pd.DataFrame,
    *,
    target_col: str,
    split_col: str,
    drop_cols: list[str],
    selection_metric: str = "average_precision",
    explanatory_model_name: str | None = None,
    test_size: float = 0.2,
    cutoff_date: str | pd.Timestamp | None = None,
) -> PipelineTrainingResult:
    """Train baseline classifiers and select the best one."""

    train_df, test_df = time_split_data(
        dataset,
        date_col=split_col,
        test_size=test_size,
        cutoff_date=cutoff_date,
    )
    y_train = train_df[target_col].astype(int)
    y_test = test_df[target_col].astype(int)

    if y_train.nunique() < 2 or y_test.nunique() < 2:
        raise ValueError(
            "Time split did not produce both classes in train and test for "
            f"{target_col}. Train positives: {int(y_train.sum())}/{len(y_train)}; "
            f"test positives: {int(y_test.sum())}/{len(y_test)}. "
            "Adjust the pipeline split_col or cutoff_date before training."
        )

    encoded = encode_features(
        train_df,
        test_df,
        drop_columns=[target_col, split_col, *drop_cols],
    )

    models = make_baseline_models(task_type="classification")
    baseline_runs = run_classification_baselines(
        encoded.train_features,
        y_train,
        encoded.test_features,
        y_test,
        models=models,
    )
    comparison = compare_models(
        [{"model_name": run.model_name, **run.metrics} for run in baseline_runs],
        sort_by=selection_metric,
    )
    best_row = comparison.iloc[0].to_dict()
    best_model_name = str(best_row["model_name"])
    fitted_models = {run.model_name: run.model for run in baseline_runs}
    best_model = fitted_models[best_model_name]

    explainability_model_name = explanatory_model_name or (
        "logistic_regression" if "logistic_regression" in fitted_models else best_model_name
    )
    explainability_model = fitted_models[explainability_model_name]
    explainability_frame = summarize_coefficients(
        explainability_model,
        encoded.feature_names,
    )
    if explainability_frame.empty:
        explainability_frame = plot_feature_importance(
            best_model,
            encoded.feature_names,
        )

    model_bundle = {
        "model": best_model,
        "preprocessor": encoded.preprocessor,
        "feature_names": encoded.feature_names,
        "target_col": target_col,
        "split_col": split_col,
        "drop_cols": drop_cols,
        "selection_metric": selection_metric,
        "best_model_name": best_model_name,
        "cutoff_date": None if cutoff_date is None else str(cutoff_date),
        "task_type": "classification",
    }

    return PipelineTrainingResult(
        best_model_name=best_model_name,
        best_model=best_model,
        model_bundle=model_bundle,
        comparison=comparison,
        best_metrics={k: float(v) if isinstance(v, (int, float)) else v for k, v in best_row.items() if k != "model_name"},
        train_rows=len(train_df),
        test_rows=len(test_df),
        explainability_frame=explainability_frame,
    )


def train_regression_pipeline(
    dataset: pd.DataFrame,
    *,
    target_col: str,
    split_col: str,
    drop_cols: list[str],
    selection_metric: str = "r2",
    explanatory_model_name: str | None = None,
    test_size: float = 0.2,
    cutoff_date: str | pd.Timestamp | None = None,
) -> PipelineTrainingResult:
    """Train baseline regressors and select the best one."""

    train_df, test_df = time_split_data(
        dataset,
        date_col=split_col,
        test_size=test_size,
        cutoff_date=cutoff_date,
    )
    y_train = train_df[target_col].astype(float)
    y_test = test_df[target_col].astype(float)

    encoded = encode_features(
        train_df,
        test_df,
        drop_columns=[target_col, split_col, *drop_cols],
    )

    models = make_baseline_models(task_type="regression")
    baseline_runs = run_regression_baselines(
        encoded.train_features,
        y_train,
        encoded.test_features,
        y_test,
        models=models,
    )
    comparison = compare_models(
        [{"model_name": run.model_name, **run.metrics} for run in baseline_runs],
        sort_by=selection_metric,
    )
    best_row = comparison.iloc[0].to_dict()
    best_model_name = str(best_row["model_name"])
    fitted_models = {run.model_name: run.model for run in baseline_runs}
    best_model = fitted_models[best_model_name]

    explainability_model_name = explanatory_model_name or (
        "ridge_regression" if "ridge_regression" in fitted_models else best_model_name
    )
    explainability_model = fitted_models[explainability_model_name]
    explainability_frame = summarize_coefficients(
        explainability_model,
        encoded.feature_names,
    )
    if explainability_frame.empty:
        explainability_frame = plot_feature_importance(
            best_model,
            encoded.feature_names,
        )

    model_bundle = {
        "model": best_model,
        "preprocessor": encoded.preprocessor,
        "feature_names": encoded.feature_names,
        "target_col": target_col,
        "split_col": split_col,
        "drop_cols": drop_cols,
        "selection_metric": selection_metric,
        "best_model_name": best_model_name,
        "cutoff_date": None if cutoff_date is None else str(cutoff_date),
        "task_type": "regression",
    }

    return PipelineTrainingResult(
        best_model_name=best_model_name,
        best_model=best_model,
        model_bundle=model_bundle,
        comparison=comparison,
        best_metrics={
            k: float(v) if isinstance(v, (int, float)) else v
            for k, v in best_row.items()
            if k != "model_name"
        },
        train_rows=len(train_df),
        test_rows=len(test_df),
        explainability_frame=explainability_frame,
    )


def save_training_outputs(
    *,
    result: PipelineTrainingResult,
    model_dir: Path,
    report_path: Path,
) -> None:
    """Persist the standard artifacts for a trained pipeline."""

    model_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(result.model_bundle, model_dir / "predictive_model.joblib")
    with (model_dir / "feature_list.json").open("w", encoding="utf-8") as handle:
        json.dump(result.model_bundle["feature_names"], handle, indent=2)

    metrics_payload = {
        "best_model_name": result.best_model_name,
        "train_rows": result.train_rows,
        "test_rows": result.test_rows,
        "target_col": result.model_bundle["target_col"],
        "split_col": result.model_bundle["split_col"],
        "selection_metric": result.model_bundle["selection_metric"],
        "cutoff_date": result.model_bundle["cutoff_date"],
        "task_type": result.model_bundle["task_type"],
        **result.best_metrics,
    }
    with (model_dir / "metrics.json").open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, indent=2)
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, indent=2)

    result.comparison.to_csv(model_dir / "model_comparison.csv", index=False)
    if not result.explainability_frame.empty:
        result.explainability_frame.to_csv(model_dir / "explainability.csv", index=False)
