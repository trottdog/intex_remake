"""Shared helpers for Phase E safehouse and leadership pipelines."""

from __future__ import annotations

from collections.abc import Callable

import pandas as pd

from ml.src.config.paths import PROCESSED_DATA_DIR
from ml.src.data.loaders import load_processed_table
from ml.src.features.common_features import save_dataset
from ml.src.features.safehouse_features import (
    build_public_impact_features,
    build_safehouse_monthly_features,
)

SafehouseEligibilityFn = Callable[[pd.DataFrame], pd.Series]


def build_and_save_safehouse_monthly_features() -> None:
    """Refresh the shared safehouse-month snapshot table used by Phase E."""

    dataset = build_safehouse_monthly_features()
    save_dataset(dataset, PROCESSED_DATA_DIR / "safehouse_monthly_features.csv")


def build_and_save_public_impact_features() -> None:
    """Refresh the parsed public-impact feature table used by Phase E notebooks."""

    dataset = build_public_impact_features()
    save_dataset(dataset, PROCESSED_DATA_DIR / "public_impact_features.csv")


def build_safehouse_phase_e_dataset(
    *,
    dataset_name: str,
    target_col: str,
    complete_flag: str,
    eligibility_fn: SafehouseEligibilityFn | None = None,
    save_output: bool = True,
) -> pd.DataFrame:
    """Build a Phase E dataset from the shared safehouse-month table."""

    try:
        dataset = load_processed_table("safehouse_monthly_features")
    except FileNotFoundError:
        build_and_save_safehouse_monthly_features()
        dataset = load_processed_table("safehouse_monthly_features")

    if complete_flag not in dataset.columns or target_col not in dataset.columns:
        build_and_save_safehouse_monthly_features()
        dataset = load_processed_table("safehouse_monthly_features")

    dataset = dataset.loc[dataset[complete_flag].fillna(False)].copy()

    if eligibility_fn is not None:
        dataset = dataset.loc[eligibility_fn(dataset)].copy()

    dataset["month_start"] = pd.to_datetime(dataset["month_start"], errors="coerce")
    dataset = dataset.loc[dataset["month_start"].notna()].copy()
    if pd.api.types.is_bool_dtype(dataset[target_col]):
        dataset[target_col] = dataset[target_col].astype(int)
    dataset = dataset.sort_values("month_start").reset_index(drop=True)

    if save_output:
        save_dataset(dataset, PROCESSED_DATA_DIR / f"{dataset_name}.csv")

    return dataset


__all__ = [
    "build_and_save_public_impact_features",
    "build_and_save_safehouse_monthly_features",
    "build_safehouse_phase_e_dataset",
]
