"""Generate Phase 4 cross-validation and calibration reports."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.config.paths import REPORTS_DIR
from ml.src.modeling.metrics import compare_models
from ml.src.modeling.train import (
    encode_features,
    make_baseline_models,
    run_classification_baselines,
    run_regression_baselines,
    time_split_data,
)
from ml.src.modeling.validation import (
    build_calibration_table,
    cross_validate_models,
    summarize_calibration,
)
from ml.src.pipelines.registry import (
    build_predictive_dataset,
    list_predictive_pipelines,
    load_predictive_pipeline_config,
)


def resolve_task_type(config: dict[str, object]) -> str:
    """Infer pipeline task type for legacy Phase 4 configs."""

    return "regression" if str(config.get("selection_metric")) == "r2" else "classification"


def evaluate_phase4_pipeline(pipeline_name: str) -> dict[str, pd.DataFrame]:
    """Build Phase 4 validation outputs for one predictive pipeline."""

    config = load_predictive_pipeline_config(pipeline_name)
    task_type = resolve_task_type(config)
    dataset = build_predictive_dataset(pipeline_name, save_output=True)
    train_df, test_df = time_split_data(
        dataset,
        date_col=config["split_col"],
        cutoff_date=config.get("cutoff_date"),
    )
    encoded = encode_features(
        train_df,
        test_df,
        drop_columns=[config["target"], config["split_col"], *config["drop_cols"]],
    )

    models = make_baseline_models(task_type=task_type)
    if task_type == "classification":
        y_train = train_df[config["target"]].astype(int)
        y_test = test_df[config["target"]].astype(int)
        baseline_runs = run_classification_baselines(
            encoded.train_features,
            y_train,
            encoded.test_features,
            y_test,
            models=models,
        )
    else:
        y_train = train_df[config["target"]].astype(float)
        y_test = test_df[config["target"]].astype(float)
        baseline_runs = run_regression_baselines(
            encoded.train_features,
            y_train,
            encoded.test_features,
            y_test,
            models=models,
        )

    comparison = compare_models(
        [{"model_name": run.model_name, **run.metrics} for run in baseline_runs],
        sort_by=str(config["selection_metric"]),
    )
    comparison.insert(0, "pipeline_name", pipeline_name)

    cv_result = cross_validate_models(
        encoded.train_features,
        y_train,
        models,
        task_type=task_type,
        sort_by=str(config["selection_metric"]),
    )
    cv_summary = cv_result.summary.copy()
    cv_summary.insert(0, "pipeline_name", pipeline_name)
    cv_summary["n_splits"] = cv_result.n_splits

    cv_folds = cv_result.fold_metrics.copy()
    cv_folds.insert(0, "pipeline_name", pipeline_name)

    best_model_name = str(comparison.iloc[0]["model_name"])
    best_run = next(run for run in baseline_runs if run.model_name == best_model_name)
    can_calibrate = (
        task_type == "classification"
        and isinstance(best_run.scores, pd.Series)
        and y_test.nunique() == 2
        and not best_run.scores.empty
    )
    if can_calibrate:
        calibration_bins = build_calibration_table(y_test, best_run.scores)
        calibration_summary_payload = summarize_calibration(y_test, best_run.scores)
    else:
        calibration_bins = pd.DataFrame(
            columns=[
                "bin",
                "count",
                "min_score",
                "max_score",
                "mean_score",
                "observed_rate",
                "abs_calibration_error",
            ]
        )
        calibration_summary_payload = {
            "sample_count": float(len(y_test)),
            "bin_count": 0.0,
            "expected_calibration_error": float("nan"),
            "max_calibration_error": float("nan"),
            "brier_score": float("nan"),
        }

    calibration_bins.insert(0, "pipeline_name", pipeline_name)
    calibration_bins.insert(1, "model_name", best_model_name)
    calibration_summary = pd.DataFrame(
        [{"pipeline_name": pipeline_name, "model_name": best_model_name, **calibration_summary_payload}]
    )

    return {
        "comparison": comparison,
        "cv_summary": cv_summary,
        "cv_folds": cv_folds,
        "calibration_bins": calibration_bins,
        "calibration_summary": calibration_summary,
    }


def main() -> None:
    evaluation_dir = REPORTS_DIR / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)

    outputs = [evaluate_phase4_pipeline(name) for name in list_predictive_pipelines()]

    comparison = pd.concat(
        [output["comparison"] for output in outputs],
        ignore_index=True,
    )
    cv_summary = pd.concat(
        [output["cv_summary"] for output in outputs],
        ignore_index=True,
    )
    cv_folds = pd.concat(
        [output["cv_folds"] for output in outputs],
        ignore_index=True,
    )
    calibration_bins = pd.concat(
        [output["calibration_bins"] for output in outputs],
        ignore_index=True,
    )
    calibration_summary = pd.concat(
        [output["calibration_summary"] for output in outputs],
        ignore_index=True,
    )

    comparison.to_csv(evaluation_dir / "phase4_holdout_comparison.csv", index=False)
    cv_summary.to_csv(evaluation_dir / "phase4_cv_summary.csv", index=False)
    cv_folds.to_csv(evaluation_dir / "phase4_cv_folds.csv", index=False)
    calibration_bins.to_csv(evaluation_dir / "phase4_calibration_bins.csv", index=False)
    calibration_summary.to_csv(
        evaluation_dir / "phase4_calibration_summary.csv",
        index=False,
    )

    print("Wrote Phase 4 modeling framework outputs to", evaluation_dir)


if __name__ == "__main__":
    main()
