"""Build the capacity pressure dataset."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.pipelines.common import load_pipeline_config
from ml.src.pipelines.safehouse_expansion_common import build_safehouse_phase_e_dataset

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def build_dataset(*, save_output: bool = True) -> pd.DataFrame:
    """Build the capacity-pressure modeling dataset."""

    config = load_pipeline_config(CONFIG_PATH)
    return build_safehouse_phase_e_dataset(
        dataset_name=str(config["dataset_name"]),
        target_col=str(config["target"]),
        complete_flag="future_window_complete_1m",
        save_output=save_output,
    )


def main() -> None:
    dataset = build_dataset()
    print(f"Built capacity pressure dataset with {len(dataset)} rows")


if __name__ == "__main__":
    main()
