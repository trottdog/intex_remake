"""Build the reintegration readiness dataset."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.config.paths import PROCESSED_DATA_DIR
from ml.src.data.loaders import load_processed_table
from ml.src.features.common_features import save_dataset
from ml.src.pipelines.common import load_pipeline_config

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def build_dataset(*, save_output: bool = True) -> pd.DataFrame:
    """Build the reintegration-readiness modeling dataset."""

    config = load_pipeline_config(CONFIG_PATH)
    dataset = load_processed_table("resident_monthly_features")
    dataset = dataset.loc[~dataset["case_closed_as_of_snapshot"]].copy()
    dataset[config["split_col"]] = pd.to_datetime(dataset[config["split_col"]], errors="coerce")
    dataset = dataset.loc[dataset[config["split_col"]].notna()].copy()
    dataset[config["target"]] = dataset[config["target"]].astype(int)
    dataset = dataset.sort_values(config["split_col"]).reset_index(drop=True)

    if save_output:
        save_dataset(dataset, PROCESSED_DATA_DIR / f"{config['dataset_name']}.csv")

    return dataset


def main() -> None:
    dataset = build_dataset()
    print(f"Built reintegration readiness dataset with {len(dataset)} rows")


if __name__ == "__main__":
    main()
