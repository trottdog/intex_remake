"""Build the next donation amount dataset."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.config.paths import PROCESSED_DATA_DIR
from ml.src.features.common_features import save_dataset
from ml.src.features.donor_features import build_supporter_monthly_features
from ml.src.pipelines.common import load_pipeline_config

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def build_dataset(*, save_output: bool = True) -> pd.DataFrame:
    """Build the next-donation-amount modeling dataset."""

    config = load_pipeline_config(CONFIG_PATH)
    monthly = build_supporter_monthly_features()
    if save_output:
        save_dataset(monthly, PROCESSED_DATA_DIR / "supporter_monthly_features.csv")

    dataset = monthly.loc[
        monthly["observation_window_complete_180d"] & monthly["label_has_next_monetary_donation_180d"]
    ].copy()
    dataset[config["split_col"]] = pd.to_datetime(dataset[config["split_col"]], errors="coerce")
    dataset = dataset.loc[dataset[config["split_col"]].notna()].copy()
    dataset = dataset.loc[dataset[config["target"]].notna()].copy()
    dataset[config["target"]] = dataset[config["target"]].astype(float)
    dataset = dataset.sort_values(config["split_col"]).reset_index(drop=True)

    if save_output:
        save_dataset(dataset, PROCESSED_DATA_DIR / f"{config['dataset_name']}.csv")

    return dataset


def main() -> None:
    dataset = build_dataset()
    print(f"Built next donation amount dataset with {len(dataset)} rows")


if __name__ == "__main__":
    main()
