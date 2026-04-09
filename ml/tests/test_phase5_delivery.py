import json

from ml.src.inference.batch_score import (
    build_sample_batch_request,
    score_batch_csv,
    score_batch_records,
)
from ml.src.inference.serializers import build_pipeline_manifest, build_request_frame
from ml.src.pipelines.registry import get_predictive_pipeline_spec, run_predictive_pipeline


def test_phase5_request_frame_and_manifest_use_pipeline_metadata() -> None:
    run_predictive_pipeline("donor_retention")

    request_frame = build_request_frame("donor_retention", sample_size=2)
    manifest = build_pipeline_manifest("donor_retention")
    spec = get_predictive_pipeline_spec("donor_retention")

    assert len(request_frame) == 2
    assert "supporter_id" in request_frame.columns
    assert manifest["pipeline_name"] == "donor_retention"
    assert manifest["display_name"] == spec["display_name"]
    assert "supporter_id" in manifest["passthrough_id_columns"]
    assert manifest["metrics"]["best_model_name"]


def test_phase5_batch_scoring_helpers_return_predictions(tmp_path) -> None:
    run_predictive_pipeline("resident_risk")

    request_payload = build_sample_batch_request("resident_risk", sample_size=3)
    response_payload = score_batch_records(
        request_payload,
        pipeline_name="resident_risk",
        id_columns=["resident_id", "safehouse_id"],
    )

    assert response_payload["pipeline_name"] == "resident_risk"
    assert len(response_payload["predictions"]) == 3
    assert "prediction" in response_payload["predictions"][0]

    input_path = tmp_path / "resident_risk_input.csv"
    output_path = tmp_path / "resident_risk_output.csv"
    input_path.write_text(
        json.dumps(request_payload),
        encoding="utf-8",
    )

    import pandas as pd

    pd.DataFrame.from_records(request_payload).to_csv(input_path, index=False)
    scored = score_batch_csv(
        input_path,
        pipeline_name="resident_risk",
        output_path=output_path,
    )

    assert len(scored) == 3
    assert output_path.exists()
