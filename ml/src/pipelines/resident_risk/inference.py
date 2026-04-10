"""Inference helpers for resident risk."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.inference.predict import predict_dataframe
from ml.src.pipelines.common import load_pipeline_config
from ml.src.pipelines.resident_risk.build_dataset import build_dataset

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def score_resident_risk(
    dataset: pd.DataFrame,
    *,
    include_features: bool = True,
) -> pd.DataFrame:
    """Score resident-risk rows and return prediction fields."""

    scored = predict_dataframe(dataset, pipeline_name="resident_risk")
    if include_features:
        return scored

    config = load_pipeline_config(CONFIG_PATH)
    preferred_columns = [
        "resident_id",
        "safehouse_id",
        str(config["split_col"]),
        "prediction",
        "prediction_score",
    ]
    available_columns = [column for column in preferred_columns if column in scored.columns]
    return scored.loc[:, available_columns].copy()


def score_latest_snapshot(
    *,
    limit: int | None = None,
    include_features: bool = False,
) -> pd.DataFrame:
    """Build and score the latest resident-risk snapshot rows."""

    config = load_pipeline_config(CONFIG_PATH)
    split_col = str(config["split_col"])
    dataset = build_dataset(save_output=False)
    if dataset.empty:
        return dataset.copy()

    latest_value = dataset[split_col].max()
    latest = dataset.loc[dataset[split_col] == latest_value].copy()
    latest = latest.sort_values(["resident_id", "safehouse_id"], kind="stable")

    if limit is not None:
        latest = latest.head(limit).copy()

    return score_resident_risk(latest, include_features=include_features)


def main() -> None:
    scored = score_latest_snapshot(limit=10, include_features=False)
    print(f"Scored {len(scored)} resident rows for the latest snapshot")


if __name__ == "__main__":
    main()

