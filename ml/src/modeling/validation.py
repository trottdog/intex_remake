"""Model validation helpers."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from sklearn.base import clone
from sklearn.metrics import brier_score_loss
from sklearn.model_selection import KFold, StratifiedKFold

from ml.src.config.settings import DEFAULT_RANDOM_STATE
from ml.src.modeling.metrics import (
    evaluate_classifier,
    evaluate_regressor,
    summarize_model_metrics,
)


@dataclass
class CrossValidationResult:
    """Container for fold-level and summarized CV metrics."""

    fold_metrics: pd.DataFrame
    summary: pd.DataFrame
    n_splits: int


def resolve_cv_n_splits(
    target: pd.Series | list[int] | list[float],
    *,
    task_type: str,
    requested_splits: int = 5,
) -> int:
    """Resolve a safe number of CV folds for the given target."""

    target_series = pd.Series(target).dropna()
    if target_series.empty:
        raise ValueError("Target must contain at least one non-null value for CV.")

    if task_type == "classification":
        class_counts = target_series.astype(int).value_counts()
        if len(class_counts) < 2:
            raise ValueError("Classification CV requires at least two target classes.")
        max_splits = int(class_counts.min())
    elif task_type == "regression":
        max_splits = len(target_series)
    else:
        raise ValueError("task_type must be 'classification' or 'regression'")

    resolved = min(requested_splits, max_splits)
    if resolved < 2:
        raise ValueError("Cross-validation requires at least two folds.")
    return resolved


def make_cv_splitter(
    target: pd.Series | list[int] | list[float],
    *,
    task_type: str,
    n_splits: int = 5,
    random_state: int = DEFAULT_RANDOM_STATE,
):
    """Build a default CV splitter for classification or regression tasks."""

    resolved_splits = resolve_cv_n_splits(
        target,
        task_type=task_type,
        requested_splits=n_splits,
    )

    if task_type == "classification":
        return StratifiedKFold(
            n_splits=resolved_splits,
            shuffle=True,
            random_state=random_state,
        )

    return KFold(
        n_splits=resolved_splits,
        shuffle=True,
        random_state=random_state,
    )


def cross_validate_models(
    features: pd.DataFrame,
    target: pd.Series | list[int] | list[float],
    models: dict[str, object],
    *,
    task_type: str,
    n_splits: int = 5,
    random_state: int = DEFAULT_RANDOM_STATE,
    sort_by: str | None = None,
) -> CrossValidationResult:
    """Run repeated train/validation scoring across a model dictionary."""

    feature_frame = pd.DataFrame(features).reset_index(drop=True)
    target_series = pd.Series(target).reset_index(drop=True)
    splitter = make_cv_splitter(
        target_series,
        task_type=task_type,
        n_splits=n_splits,
        random_state=random_state,
    )

    fold_rows: list[dict[str, object]] = []

    for model_name, model in models.items():
        split_iterator = splitter.split(feature_frame, target_series)
        for fold_index, (train_index, test_index) in enumerate(split_iterator, start=1):
            estimator = clone(model)
            X_train = feature_frame.iloc[train_index]
            X_test = feature_frame.iloc[test_index]
            y_train = target_series.iloc[train_index]
            y_test = target_series.iloc[test_index]

            estimator.fit(X_train, y_train)
            predictions = estimator.predict(X_test)

            if task_type == "classification":
                if hasattr(estimator, "predict_proba"):
                    probabilities = estimator.predict_proba(X_test)
                    if probabilities.ndim == 2 and probabilities.shape[1] == 2:
                        scores = probabilities[:, 1]
                    else:
                        scores = probabilities
                elif hasattr(estimator, "decision_function"):
                    scores = estimator.decision_function(X_test)
                else:
                    scores = predictions
                metrics = evaluate_classifier(y_test, predictions, scores)
            else:
                metrics = evaluate_regressor(y_test, predictions)

            fold_rows.append(
                {
                    "model_name": model_name,
                    "fold": fold_index,
                    **metrics,
                }
            )

    fold_frame = pd.DataFrame(fold_rows)
    return CrossValidationResult(
        fold_metrics=fold_frame,
        summary=summarize_model_metrics(
            fold_rows,
            group_col="model_name",
            sort_by=sort_by,
        ),
        n_splits=splitter.n_splits,
    )


def build_calibration_table(
    y_true: pd.Series | list[int] | list[bool],
    y_score: pd.Series | list[float],
    *,
    n_bins: int = 10,
    strategy: str = "quantile",
) -> pd.DataFrame:
    """Build a probability calibration table from scores."""

    truth = pd.Series(y_true, dtype=int).reset_index(drop=True)
    scores = pd.Series(y_score, dtype=float).reset_index(drop=True)
    data = pd.DataFrame({"y_true": truth, "y_score": scores}).dropna()

    if data.empty:
        return pd.DataFrame(
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

    bin_count = min(n_bins, max(1, int(data["y_score"].nunique())))
    if strategy == "quantile" and bin_count > 1:
        data["bin"] = pd.qcut(
            data["y_score"],
            q=bin_count,
            labels=False,
            duplicates="drop",
        )
    else:
        data["bin"] = pd.cut(
            data["y_score"],
            bins=bin_count,
            labels=False,
            include_lowest=True,
            duplicates="drop",
        )

    table = (
        data.groupby("bin", dropna=False)
        .agg(
            count=("y_true", "size"),
            min_score=("y_score", "min"),
            max_score=("y_score", "max"),
            mean_score=("y_score", "mean"),
            observed_rate=("y_true", "mean"),
        )
        .reset_index()
        .sort_values("bin")
        .reset_index(drop=True)
    )
    table["abs_calibration_error"] = (
        table["mean_score"] - table["observed_rate"]
    ).abs()
    return table


def expected_calibration_error(calibration_table: pd.DataFrame) -> float:
    """Calculate expected calibration error from a calibration table."""

    if calibration_table.empty:
        return float("nan")

    weights = calibration_table["count"] / calibration_table["count"].sum()
    return float((weights * calibration_table["abs_calibration_error"]).sum())


def summarize_calibration(
    y_true: pd.Series | list[int] | list[bool],
    y_score: pd.Series | list[float],
    *,
    n_bins: int = 10,
    strategy: str = "quantile",
) -> dict[str, float]:
    """Return compact scalar calibration diagnostics for a score vector."""

    truth = pd.Series(y_true, dtype=int)
    scores = pd.Series(y_score, dtype=float)
    calibration_table = build_calibration_table(
        truth,
        scores,
        n_bins=n_bins,
        strategy=strategy,
    )

    return {
        "sample_count": float(len(truth)),
        "positive_rate": float(truth.mean()),
        "mean_score": float(scores.mean()),
        "brier_score": float(brier_score_loss(truth, scores)),
        "expected_calibration_error": expected_calibration_error(calibration_table),
        "bin_count": float(len(calibration_table)),
    }
