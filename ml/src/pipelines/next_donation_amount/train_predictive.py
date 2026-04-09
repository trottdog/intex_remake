"""Train the next donation amount predictive model."""

from __future__ import annotations

from pathlib import Path

from ml.src.config.paths import MODELS_DIR, REPORTS_DIR
from ml.src.pipelines.common import (
    load_pipeline_config,
    save_training_outputs,
    train_regression_pipeline,
)
from ml.src.pipelines.next_donation_amount.build_dataset import build_dataset

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def train_predictive_model() -> dict[str, float]:
    """Train the next-donation-amount predictive model and save artifacts."""

    config = load_pipeline_config(CONFIG_PATH)
    dataset = build_dataset(save_output=True)
    result = train_regression_pipeline(
        dataset,
        target_col=config["target"],
        split_col=config["split_col"],
        drop_cols=config["drop_cols"],
        selection_metric=config["selection_metric"],
        cutoff_date=config.get("cutoff_date"),
    )
    save_training_outputs(
        result=result,
        model_dir=MODELS_DIR / config["pipeline_name"],
        report_path=REPORTS_DIR / "evaluation" / f"{config['pipeline_name']}_metrics.json",
    )
    return {
        "best_model_name": result.best_model_name,
        "train_rows": result.train_rows,
        "test_rows": result.test_rows,
        **result.best_metrics,
    }


if __name__ == "__main__":
    print(train_predictive_model())
