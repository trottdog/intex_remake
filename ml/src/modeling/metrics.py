"""Model metrics helpers."""

from __future__ import annotations

import math
from collections.abc import Iterable

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import label_binarize


def evaluate_classifier(
    y_true: Iterable[int | bool],
    y_pred: Iterable[int | bool],
    y_score: Iterable[float] | Iterable[Iterable[float]] | None = None,
) -> dict[str, float]:
    """Calculate classification metrics for binary or multiclass targets."""

    true_series = pd.Series(list(y_true)).astype(int)
    pred_series = pd.Series(list(y_pred)).astype(int)
    class_labels = sorted(true_series.dropna().unique().tolist())
    is_binary = len(class_labels) <= 2

    score_array: np.ndarray | None = None
    if y_score is not None:
        score_array = np.asarray(y_score, dtype=float)
        if score_array.ndim == 0:
            score_array = score_array.reshape(1)

    metrics = {
        "sample_count": float(len(true_series)),
        "positive_count": float(true_series.sum()) if is_binary else float("nan"),
        "positive_rate": float(true_series.mean()) if is_binary else float("nan"),
        "accuracy": float(accuracy_score(true_series, pred_series)),
        "balanced_accuracy": float(balanced_accuracy_score(true_series, pred_series)),
        "precision": float(
            precision_score(
                true_series,
                pred_series,
                average="binary" if is_binary else "weighted",
                zero_division=0,
            )
        ),
        "recall": float(
            recall_score(
                true_series,
                pred_series,
                average="binary" if is_binary else "weighted",
                zero_division=0,
            )
        ),
        "f1": float(
            f1_score(
                true_series,
                pred_series,
                average="binary" if is_binary else "weighted",
                zero_division=0,
            )
        ),
    }

    if score_array is not None and true_series.nunique() > 1:
        if is_binary:
            if score_array.ndim == 2 and score_array.shape[1] >= 2:
                score_array = score_array[:, 1]
            if score_array.ndim == 1:
                metrics["roc_auc"] = float(roc_auc_score(true_series, score_array))
                metrics["average_precision"] = float(
                    average_precision_score(true_series, score_array)
                )
            else:
                metrics["roc_auc"] = float("nan")
                metrics["average_precision"] = float("nan")
        else:
            if score_array.ndim == 2 and score_array.shape[1] == len(class_labels):
                true_binarized = label_binarize(true_series, classes=class_labels)
                metrics["roc_auc"] = float(
                    roc_auc_score(
                        true_binarized,
                        score_array,
                        multi_class="ovr",
                        average="weighted",
                    )
                )
                metrics["average_precision"] = float(
                    average_precision_score(
                        true_binarized,
                        score_array,
                        average="weighted",
                    )
                )
            else:
                metrics["roc_auc"] = float("nan")
                metrics["average_precision"] = float("nan")
    else:
        metrics["roc_auc"] = float("nan")
        metrics["average_precision"] = float("nan")

    return metrics


def evaluate_regressor(
    y_true: Iterable[float],
    y_pred: Iterable[float],
) -> dict[str, float]:
    """Calculate standard regression metrics."""

    true_series = pd.Series(list(y_true), dtype=float)
    pred_series = pd.Series(list(y_pred), dtype=float)
    rmse = math.sqrt(mean_squared_error(true_series, pred_series))

    return {
        "sample_count": float(len(true_series)),
        "mae": float(mean_absolute_error(true_series, pred_series)),
        "rmse": float(rmse),
        "r2": float(r2_score(true_series, pred_series)),
    }


def compare_models(results: list[dict[str, object]], *, sort_by: str) -> pd.DataFrame:
    """Convert model result dictionaries into a ranked dataframe."""

    frame = pd.DataFrame(results)
    if frame.empty:
        return frame

    if sort_by not in frame.columns:
        numeric_columns = [
            column
            for column in frame.columns
            if column != "model_name" and pd.api.types.is_numeric_dtype(frame[column])
        ]
        if numeric_columns:
            sort_by = numeric_columns[0]
        else:
            return frame.reset_index(drop=True)

    return frame.sort_values(sort_by, ascending=False).reset_index(drop=True)


def summarize_model_metrics(
    results: list[dict[str, object]],
    *,
    group_col: str = "model_name",
    sort_by: str | None = None,
) -> pd.DataFrame:
    """Aggregate repeated model metrics into a mean/std summary frame."""

    frame = pd.DataFrame(results)
    if frame.empty:
        return frame

    numeric_columns = [
        column
        for column in frame.columns
        if column != group_col and pd.api.types.is_numeric_dtype(frame[column])
    ]
    summary = (
        frame.groupby(group_col, dropna=False)[numeric_columns]
        .agg(["mean", "std"])
        .reset_index()
    )
    summary.columns = [
        group_col if column == (group_col, "") else "_".join(part for part in column if part)
        for column in summary.columns.to_flat_index()
    ]

    if sort_by is not None and f"{sort_by}_mean" in summary.columns:
        summary = summary.sort_values(f"{sort_by}_mean", ascending=False)

    return summary.reset_index(drop=True)
