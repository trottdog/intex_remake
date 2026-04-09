import math

from ml.src.config.paths import MODELS_DIR, REPORTS_DIR
from ml.src.pipelines.donor_retention.build_dataset import build_dataset as build_donor_dataset
from ml.src.pipelines.registry import list_predictive_pipelines, run_predictive_pipeline
from ml.src.pipelines.reintegration_readiness.build_dataset import (
    build_dataset as build_reintegration_dataset,
)
from ml.src.pipelines.resident_risk.build_dataset import (
    build_dataset as build_resident_risk_dataset,
)
from ml.src.pipelines.social_media_conversion.build_dataset import (
    build_dataset as build_social_dataset,
)


def test_phase3_registry_lists_expected_pipelines() -> None:
    pipelines = list_predictive_pipelines()

    for expected in [
        "donor_retention",
        "reintegration_readiness",
        "resident_risk",
        "social_media_conversion",
    ]:
        assert expected in pipelines


def test_phase3_dataset_builders_sort_and_cast_targets() -> None:
    donor_dataset = build_donor_dataset(save_output=False)
    reintegration_dataset = build_reintegration_dataset(save_output=False)
    resident_risk_dataset = build_resident_risk_dataset(save_output=False)
    social_dataset = build_social_dataset(save_output=False)

    assert donor_dataset["created_at"].is_monotonic_increasing
    assert reintegration_dataset["snapshot_month"].is_monotonic_increasing
    assert resident_risk_dataset["snapshot_month"].is_monotonic_increasing
    assert social_dataset["created_at"].is_monotonic_increasing

    assert set(donor_dataset["label_lapsed_180d"].unique()) <= {0, 1}
    assert set(reintegration_dataset["label_reintegration_complete_next_90d"].unique()) <= {
        0,
        1,
    }
    assert set(resident_risk_dataset["label_incident_next_30d"].unique()) <= {0, 1}
    assert set(social_dataset["label_donation_referral_positive"].unique()) <= {0, 1}


def test_run_predictive_pipeline_creates_phase3_artifacts() -> None:
    donor_metrics = run_predictive_pipeline("donor_retention")
    resident_metrics = run_predictive_pipeline("resident_risk")

    assert donor_metrics["best_model_name"] in {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert resident_metrics["best_model_name"] in {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert math.isfinite(float(donor_metrics["average_precision"]))
    assert math.isfinite(float(resident_metrics["average_precision"]))

    assert (MODELS_DIR / "donor_retention" / "predictive_model.joblib").exists()
    assert (MODELS_DIR / "resident_risk" / "predictive_model.joblib").exists()
    assert (REPORTS_DIR / "evaluation" / "donor_retention_metrics.json").exists()
    assert (REPORTS_DIR / "evaluation" / "resident_risk_metrics.json").exists()
