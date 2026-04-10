import json
from pathlib import Path

from ml.src.pipelines.home_visitation_outcome.evaluate import evaluate_home_visitation_outcome_model
from ml.src.pipelines.home_visitation_outcome.inference import (
    score_home_visitation_outcome,
    score_latest_snapshot,
)
from ml.src.pipelines.registry import run_predictive_pipeline


def test_home_visitation_outcome_evaluation_writes_validation_payload() -> None:
    run_predictive_pipeline("home_visitation_outcome")

    payload = evaluate_home_visitation_outcome_model(save_output=True)
    output_path = Path("ml/reports/evaluation/home_visitation_outcome_validation.json")

    assert payload["pipeline_name"] == "home_visitation_outcome"
    assert payload["evaluation_rows"] > 0
    assert "average_precision" in payload["metrics"]
    assert "expected_calibration_error" in payload["calibration"]
    assert output_path.exists()


def test_home_visitation_outcome_inference_snapshot_shape() -> None:
    run_predictive_pipeline("home_visitation_outcome")

    scored = score_latest_snapshot(limit=5, include_features=False)

    assert len(scored) <= 5
    assert {"resident_id", "safehouse_id", "snapshot_month", "prediction", "prediction_score"}.issubset(
        set(scored.columns)
    )


def test_home_visitation_outcome_inference_round_trip() -> None:
    run_predictive_pipeline("home_visitation_outcome")

    base = score_latest_snapshot(limit=3, include_features=True)
    rescored = score_home_visitation_outcome(base.drop(columns=["prediction", "prediction_score"], errors="ignore"))

    assert len(rescored) == len(base)
    assert "prediction" in rescored.columns
    assert "prediction_score" in rescored.columns


def test_home_visitation_outcome_notebook_has_executed_outputs() -> None:
    notebook_path = Path("ml/ml-pipelines/home-visitation-outcome/home-visitation-outcome-predictive.ipynb")
    notebook = json.loads(notebook_path.read_text(encoding="utf-8"))

    code_cells = [cell for cell in notebook["cells"] if cell.get("cell_type") == "code"]
    assert code_cells

    # Notebook execution proof should include at least one code cell that ran and produced output.
    assert any(
        cell.get("execution_count") is not None and len(cell.get("outputs", [])) > 0
        for cell in code_cells
    )
