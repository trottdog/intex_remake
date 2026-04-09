"""Shared helpers used by generated ML notebook templates."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd


def resolve_repo_root(start: Path | None = None) -> Path:
    """Resolve the repo root from the current working directory or a provided path."""

    current = (start or Path.cwd()).resolve()
    if current.is_file():
        current = current.parent

    while not (current / "ml").exists() and current != current.parent:
        current = current.parent
    return current


def bootstrap_repo_path(start: Path | None = None) -> Path:
    """Ensure the repo root is available on ``sys.path`` for notebook imports."""

    repo_root = resolve_repo_root(start)
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    return repo_root


bootstrap_repo_path()

from ml.src.config.paths import REPORTS_DIR
from ml.src.data.loaders import load_processed_table
from ml.src.pipelines.registry import build_predictive_dataset, load_predictive_pipeline_config


def load_notebook_context(
    *,
    pipeline_name: str,
    dataset_name: str,
    predictive_impl: str | None = None,
    use_predictive_dataset: bool = True,
) -> dict[str, object]:
    """Load the standard dataset and config objects for a generated notebook."""

    effective_pipeline = predictive_impl or pipeline_name
    config = {}

    if predictive_impl and use_predictive_dataset:
        config = load_predictive_pipeline_config(predictive_impl)
        dataset = build_predictive_dataset(predictive_impl, save_output=False)
    else:
        try:
            dataset = load_processed_table(dataset_name)
        except FileNotFoundError:
            if predictive_impl is None:
                raise
            dataset = build_predictive_dataset(predictive_impl, save_output=True)

    return {
        "pipeline_name": effective_pipeline,
        "dataset_name": dataset_name,
        "config": config,
        "dataset": dataset,
    }


def load_evaluation_bundle(pipeline_name: str) -> dict[str, object]:
    """Load the standard model-comparison artifacts for one pipeline."""

    metrics_path = REPORTS_DIR / "evaluation" / f"{pipeline_name}_metrics.json"
    comparison_path = REPORTS_DIR / "evaluation" / "phase4_holdout_comparison.csv"
    cv_summary_path = REPORTS_DIR / "evaluation" / "phase4_cv_summary.csv"

    metrics = json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}
    holdout_comparison = pd.read_csv(comparison_path) if comparison_path.exists() else pd.DataFrame()
    cv_summary = pd.read_csv(cv_summary_path) if cv_summary_path.exists() else pd.DataFrame()

    if not holdout_comparison.empty and "pipeline_name" in holdout_comparison.columns:
        holdout_comparison = holdout_comparison.loc[
            holdout_comparison["pipeline_name"] == pipeline_name
        ].reset_index(drop=True)
    if not cv_summary.empty and "pipeline_name" in cv_summary.columns:
        cv_summary = cv_summary.loc[cv_summary["pipeline_name"] == pipeline_name].reset_index(
            drop=True
        )

    return {
        "pipeline_name": pipeline_name,
        "metrics": metrics,
        "holdout_comparison": holdout_comparison,
        "cv_summary": cv_summary,
    }


def summarize_frame(df: pd.DataFrame, *, top_n: int = 10) -> pd.DataFrame:
    """Return a compact preview frame for notebook display."""

    if df.empty:
        return df
    return df.head(top_n).copy()


__all__ = [
    "bootstrap_repo_path",
    "load_evaluation_bundle",
    "load_notebook_context",
    "resolve_repo_root",
    "summarize_frame",
]
