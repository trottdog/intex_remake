"""Build the case prioritization dataset."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.pipelines.common import load_pipeline_config
from ml.src.pipelines.resident_expansion_common import build_resident_phase_d_dataset

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def build_dataset(*, save_output: bool = True) -> pd.DataFrame:
    """Build the case-prioritization modeling dataset."""

    config = load_pipeline_config(CONFIG_PATH)
    return build_resident_phase_d_dataset(
        dataset_name=str(config["dataset_name"]),
        target_col=str(config["target"]),
        complete_flag="future_window_complete_60d",
        save_output=save_output,
    )


def main() -> None:
    dataset = build_dataset()
    print(f"Built case prioritization dataset with {len(dataset)} rows")


if __name__ == "__main__":
    main()
