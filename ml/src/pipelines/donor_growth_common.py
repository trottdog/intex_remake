"""Shared helpers for donor-growth expansion pipelines."""

from __future__ import annotations

from ml.src.config.paths import PROCESSED_DATA_DIR
from ml.src.features.common_features import save_dataset
from ml.src.features.donor_features import build_supporter_monthly_features


def build_and_save_supporter_monthly_features() -> None:
    """Refresh the shared supporter-month snapshot table used by Phase C."""

    dataset = build_supporter_monthly_features()
    save_dataset(dataset, PROCESSED_DATA_DIR / "supporter_monthly_features.csv")
