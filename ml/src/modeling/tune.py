"""Hyperparameter tuning helpers."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from sklearn.model_selection import GridSearchCV

from ml.src.modeling.validation import make_cv_splitter

DEFAULT_SCORING = {
    "classification": "average_precision",
    "regression": "neg_root_mean_squared_error",
}


@dataclass
class TuningResult:
    """Container for a grid-search tuning run."""

    best_estimator: object
    best_params: dict[str, object]
    best_score: float
    cv_results: pd.DataFrame


def tune_model_grid(
    estimator: object,
    param_grid: dict[str, list[object]],
    features: pd.DataFrame,
    target: pd.Series | list[int] | list[float],
    *,
    task_type: str,
    scoring: str | None = None,
    n_splits: int = 5,
    n_jobs: int | None = None,
) -> TuningResult:
    """Run a reusable grid search with the default Phase 4 CV strategy."""

    feature_frame = pd.DataFrame(features)
    target_series = pd.Series(target)
    splitter = make_cv_splitter(
        target_series,
        task_type=task_type,
        n_splits=n_splits,
    )
    grid = GridSearchCV(
        estimator=estimator,
        param_grid=param_grid,
        scoring=scoring or DEFAULT_SCORING[task_type],
        cv=splitter,
        n_jobs=n_jobs,
        refit=True,
    )
    grid.fit(feature_frame, target_series)

    return TuningResult(
        best_estimator=grid.best_estimator_,
        best_params=dict(grid.best_params_),
        best_score=float(grid.best_score_),
        cv_results=pd.DataFrame(grid.cv_results_).sort_values("rank_test_score"),
    )
