"""Train the donor retention predictive model."""

from __future__ import annotations

from pathlib import Path

from ml.src.config.paths import MODELS_DIR, REPORTS_DIR
from ml.src.pipelines.common import (
    load_pipeline_config,
    save_training_outputs,
    train_classification_pipeline,
)
from ml.src.pipelines.donor_retention.build_dataset import build_dataset

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def train_predictive_model() -> dict[str, float]:
    """Train the donor-retention predictive model and save artifacts."""

    config = load_pipeline_config(CONFIG_PATH)
    dataset = build_dataset(save_output=True)
    result = train_classification_pipeline(
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


def main() -> None:
    metrics = train_predictive_model()
    print(
        "Trained donor retention predictive model "
        f"({metrics['best_model_name']}) on {metrics['train_rows']} train rows "
        f"and {metrics['test_rows']} test rows"
    )


if __name__ == "__main__":
    main()
