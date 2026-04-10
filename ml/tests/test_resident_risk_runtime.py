from pathlib import Path

from ml.src.pipelines.registry import run_predictive_pipeline
from ml.src.pipelines.resident_risk.evaluate import evaluate_resident_risk_model
from ml.src.pipelines.resident_risk.inference import score_latest_snapshot, score_resident_risk


def test_resident_risk_evaluation_writes_validation_payload() -> None:
    run_predictive_pipeline("resident_risk")

    payload = evaluate_resident_risk_model(save_output=True)
    output_path = Path("ml/reports/evaluation/resident_risk_validation.json")

    assert payload["pipeline_name"] == "resident_risk"
    assert payload["evaluation_rows"] > 0
    assert "average_precision" in payload["metrics"]
    assert "expected_calibration_error" in payload["calibration"]
    assert output_path.exists()


def test_resident_risk_inference_snapshot_shape() -> None:
    run_predictive_pipeline("resident_risk")

    scored = score_latest_snapshot(limit=5, include_features=False)

    assert len(scored) <= 5
    assert {"resident_id", "safehouse_id", "snapshot_month", "prediction", "prediction_score"}.issubset(
        set(scored.columns)
    )


def test_resident_risk_inference_round_trip() -> None:
    run_predictive_pipeline("resident_risk")

    base = score_latest_snapshot(limit=3, include_features=True)
    rescored = score_resident_risk(base.drop(columns=["prediction", "prediction_score"], errors="ignore"))

    assert len(rescored) == len(base)
    assert "prediction" in rescored.columns
    assert "prediction_score" in rescored.columns