import pandas as pd

from ml.scripts.refresh_supabase_ml import build_prediction_rows, current_scoring_frame
from ml.src.data.loaders import load_raw_tables
from ml.src.inference.predict import predict_dataframe
from ml.src.inference.serializers import build_pipeline_manifest
from ml.src.pipelines.phase_f_packaging_integration import write_phase_f_outputs
from ml.src.pipelines.registry import build_predictive_dataset, list_predictive_pipelines, run_predictive_pipeline


def test_phase_f_inference_supports_classification_and_regression() -> None:
    run_predictive_pipeline("donor_retention")
    run_predictive_pipeline("next_donation_amount")

    donor_retention = build_predictive_dataset("donor_retention", save_output=False).head(5)
    next_amount = build_predictive_dataset("next_donation_amount", save_output=False).head(5)

    donor_scored = predict_dataframe(donor_retention, pipeline_name="donor_retention")
    amount_scored = predict_dataframe(next_amount, pipeline_name="next_donation_amount")

    assert donor_scored["prediction"].isin([0, 1]).all()
    assert donor_scored["prediction_score"].between(0, 1).all()

    assert pd.api.types.is_numeric_dtype(amount_scored["prediction"])
    assert pd.api.types.is_numeric_dtype(amount_scored["prediction_score"])
    pd.testing.assert_series_equal(
        amount_scored["prediction"].reset_index(drop=True),
        amount_scored["prediction_score"].reset_index(drop=True),
        check_names=False,
    )


def test_phase_f_prediction_rows_cover_supporter_resident_post_and_safehouse_groups() -> None:
    raw_tables = load_raw_tables()
    representative_pipelines = {
        "donor_upgrade": "supporter",
        "case_prioritization": "resident",
        "best_posting_time": "social_media_post",
        "resource_demand": "safehouse",
    }

    for pipeline_name, expected_entity_type in representative_pipelines.items():
        run_predictive_pipeline(pipeline_name)
        dataset = build_predictive_dataset(pipeline_name, save_output=False)
        scored = predict_dataframe(
            current_scoring_frame(pipeline_name, dataset).head(5),
            pipeline_name=pipeline_name,
        )
        manifest = build_pipeline_manifest(pipeline_name, dataset=dataset)
        rows = build_prediction_rows(
            pipeline_name,
            scored,
            raw_tables,
            prediction_limit=1,
            task_type=str(manifest["task_type"]),
        )

        assert len(rows) == 1
        assert rows[0]["entity_type"] == expected_entity_type
        assert rows[0]["context"]["prediction_task_type"] == manifest["task_type"]

    resource_manifest = build_pipeline_manifest("resource_demand")
    resource_rows = build_prediction_rows(
        "resource_demand",
        predict_dataframe(
            current_scoring_frame(
                "resource_demand",
                build_predictive_dataset("resource_demand", save_output=False),
            ).head(5),
            pipeline_name="resource_demand",
        ),
        raw_tables,
        prediction_limit=1,
        task_type=str(resource_manifest["task_type"]),
    )
    assert resource_rows[0]["prediction_value"] is None
    assert isinstance(resource_rows[0]["prediction_score"], float)


def test_phase_f_outputs_write_contract_matrix_and_payload_examples() -> None:
    outputs = write_phase_f_outputs()

    assert outputs["contract_matrix"].exists()
    assert outputs["report"].exists()

    contract_matrix = pd.read_csv(outputs["contract_matrix"])
    assert len(contract_matrix) == len(list_predictive_pipelines())
    assert set(contract_matrix["task_type"]) == {"classification", "regression"}

    payload_dir = outputs["payload_dir"]
    for pipeline_name in ("next_donation_amount", "resource_demand", "donor_upgrade", "case_prioritization"):
        assert (payload_dir / f"{pipeline_name}_manifest.json").exists()
        assert (payload_dir / f"{pipeline_name}_request.json").exists()
        assert (payload_dir / f"{pipeline_name}_response.json").exists()
