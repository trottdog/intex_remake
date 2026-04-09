"""Shared helpers for Phase D resident expansion pipelines."""

from __future__ import annotations

from collections.abc import Callable

import pandas as pd

from ml.src.config.paths import PROCESSED_DATA_DIR
from ml.src.data.loaders import load_processed_table
from ml.src.features.common_features import save_dataset
from ml.src.features.resident_features import build_resident_monthly_features

ResidentEligibilityFn = Callable[[pd.DataFrame], pd.Series]


def build_and_save_resident_monthly_features() -> None:
    """Refresh the shared resident-month snapshot table used by Phase D."""

    dataset = build_resident_monthly_features()
    save_dataset(dataset, PROCESSED_DATA_DIR / "resident_monthly_features.csv")


def build_resident_phase_d_dataset(
    *,
    dataset_name: str,
    target_col: str,
    complete_flag: str,
    eligibility_fn: ResidentEligibilityFn | None = None,
    save_output: bool = True,
) -> pd.DataFrame:
    """Build a Phase D resident dataset from the shared resident-month table."""

    dataset = load_processed_table("resident_monthly_features")
    if complete_flag not in dataset.columns or target_col not in dataset.columns:
        build_and_save_resident_monthly_features()
        dataset = load_processed_table("resident_monthly_features")

    dataset = dataset.loc[~dataset["case_closed_as_of_snapshot"]].copy()
    dataset = dataset.loc[dataset[complete_flag].fillna(False)].copy()

    if eligibility_fn is not None:
        dataset = dataset.loc[eligibility_fn(dataset)].copy()

    dataset["snapshot_month"] = pd.to_datetime(dataset["snapshot_month"], errors="coerce")
    dataset = dataset.loc[dataset["snapshot_month"].notna()].copy()
    dataset[target_col] = dataset[target_col].astype(int)
    dataset = dataset.sort_values("snapshot_month").reset_index(drop=True)

    if save_output:
        save_dataset(dataset, PROCESSED_DATA_DIR / f"{dataset_name}.csv")

    return dataset


__all__ = [
    "build_and_save_resident_monthly_features",
    "build_resident_phase_d_dataset",
]
