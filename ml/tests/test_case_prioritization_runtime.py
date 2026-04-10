import json
from pathlib import Path

from ml.src.pipelines.case_prioritization.evaluate import evaluate_case_prioritization_model
from ml.src.pipelines.case_prioritization.inference import (
    score_case_prioritization,
    score_latest_snapshot,
)
from ml.src.pipelines.registry import run_predictive_pipeline


def test_case_prioritization_evaluation_writes_validation_payload() -> None:
    run_predictive_pipeline("case_prioritization")

    payload = evaluate_case_prioritization_model(save_output=True)
    output_path = Path("ml/reports/evaluation/case_prioritization_validation.json")

    assert payload["pipeline_name"] == "case_prioritization"
    assert payload["evaluation_rows"] > 0
    assert "average_precision" in payload["metrics"]
    assert "expected_calibration_error" in payload["calibration"]
    assert output_path.exists()


def test_case_prioritization_inference_snapshot_shape() -> None:
    run_predictive_pipeline("case_prioritization")

    scored = score_latest_snapshot(limit=5, include_features=False)

    assert len(scored) <= 5
    assert {"resident_id", "safehouse_id", "snapshot_month", "prediction", "prediction_score"}.issubset(
        set(scored.columns)
    )


def test_case_prioritization_inference_round_trip() -> None:
    run_predictive_pipeline("case_prioritization")

    base = score_latest_snapshot(limit=3, include_features=True)
    rescored = score_case_prioritization(base.drop(columns=["prediction", "prediction_score"], errors="ignore"))

    assert len(rescored) == len(base)
    assert "prediction" in rescored.columns
    assert "prediction_score" in rescored.columns


def test_case_prioritization_notebook_has_executed_outputs() -> None:
    notebook_path = Path("ml/ml-pipelines/case-prioritization/case-prioritization-predictive.ipynb")
    notebook = json.loads(notebook_path.read_text(encoding="utf-8"))

    code_cells = [cell for cell in notebook["cells"] if cell.get("cell_type") == "code"]
    assert code_cells

    # Notebook execution proof should include at least one code cell that ran and produced output.
    assert any(
        cell.get("execution_count") is not None and len(cell.get("outputs", [])) > 0
        for cell in code_cells
    )
