"""Evaluate the counseling progress predictive model on the holdout window."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from ml.src.config.paths import REPORTS_DIR
from ml.src.inference.predict import load_model_bundle, predict_dataframe
from ml.src.modeling.metrics import evaluate_classifier
from ml.src.modeling.validation import summarize_calibration
from ml.src.pipelines.common import load_pipeline_config
from ml.src.pipelines.counseling_progress.build_dataset import build_dataset

CONFIG_PATH = Path(__file__).with_name("config.yaml")


def _json_safe(value: Any) -> Any:
	"""Convert pandas and numpy values into JSON-safe primitives."""

	if pd.isna(value):
		return None
	if isinstance(value, pd.Timestamp):
		return value.isoformat()
	if hasattr(value, "item"):
		return value.item()
	return value


def evaluate_counseling_progress_model(
	*,
	dataset: pd.DataFrame | None = None,
	save_output: bool = True,
) -> dict[str, Any]:
	"""Evaluate counseling progress predictions and persist validation evidence."""

	config = load_pipeline_config(CONFIG_PATH)
	pipeline_name = str(config["pipeline_name"])
	target_col = str(config["target"])
	split_col = str(config["split_col"])

	source = dataset if dataset is not None else build_dataset(save_output=False)
	model_bundle = load_model_bundle(pipeline_name)
	scored = predict_dataframe(source, model_bundle=model_bundle)

	y_true = source[target_col].astype(int)
	y_pred = scored["prediction"].astype(int)
	y_score = scored["prediction_score"].astype(float)

	holdout_metrics = evaluate_classifier(y_true, y_pred, y_score)
	calibration_metrics = summarize_calibration(y_true, y_score)

	payload: dict[str, Any] = {
		"pipeline_name": pipeline_name,
		"target_col": target_col,
		"split_col": split_col,
		"evaluation_rows": int(len(source)),
		"metrics": {key: _json_safe(value) for key, value in holdout_metrics.items()},
		"calibration": {key: _json_safe(value) for key, value in calibration_metrics.items()},
	}

	if save_output:
		output_path = REPORTS_DIR / "evaluation" / f"{pipeline_name}_validation.json"
		output_path.parent.mkdir(parents=True, exist_ok=True)
		output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")

	return payload


def main() -> None:
	payload = evaluate_counseling_progress_model()
	metrics = payload["metrics"]
	print(
		"Counseling progress evaluation complete "
		f"(rows={payload['evaluation_rows']}, "
		f"average_precision={metrics.get('average_precision')}, "
		f"roc_auc={metrics.get('roc_auc')})"
	)


if __name__ == "__main__":
	main()

