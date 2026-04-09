import math

from ml.src.config.paths import MODELS_DIR, REPORTS_DIR
from ml.src.pipelines.best_posting_time.build_dataset import build_dataset as build_best_posting_time_dataset
from ml.src.pipelines.donor_upgrade.build_dataset import build_dataset as build_donor_upgrade_dataset
from ml.src.pipelines.next_donation_amount.build_dataset import (
    build_dataset as build_next_donation_amount_dataset,
)
from ml.src.pipelines.phase_c_donor_outreach import (
    PHASE_C_NOTEBOOK_ONLY_PIPELINES,
    PHASE_C_PREDICTIVE_PIPELINES,
    write_phase_c_outputs,
)
from ml.src.pipelines.registry import get_notebook_pipeline_spec, list_predictive_pipelines, run_predictive_pipeline


def test_phase_c_registry_and_notebook_specs_include_new_pipelines() -> None:
    pipelines = list_predictive_pipelines()

    for pipeline_name in PHASE_C_PREDICTIVE_PIPELINES:
        assert pipeline_name in pipelines

    recurring_spec = get_notebook_pipeline_spec("recurring_donor_conversion")
    assert recurring_spec["predictive_impl"] is None
    assert "data issue" in recurring_spec["target_summary"].lower()


def test_phase_c_dataset_builders_sort_and_cast_targets() -> None:
    donor_upgrade = build_donor_upgrade_dataset(save_output=False)
    next_amount = build_next_donation_amount_dataset(save_output=False)
    best_posting_time = build_best_posting_time_dataset(save_output=False)

    assert donor_upgrade["snapshot_month"].is_monotonic_increasing
    assert next_amount["snapshot_month"].is_monotonic_increasing
    assert best_posting_time["created_at"].is_monotonic_increasing

    assert set(donor_upgrade["label_donor_upgrade_next_180d"].unique()) <= {0, 1}
    assert next_amount["label_next_monetary_amount_180d"].notna().all()
    assert set(best_posting_time["label_donation_referral_positive"].unique()) <= {0, 1}


def test_phase_c_predictive_training_and_outputs(tmp_path) -> None:
    donor_upgrade_metrics = run_predictive_pipeline("donor_upgrade")
    next_amount_metrics = run_predictive_pipeline("next_donation_amount")
    best_posting_time_metrics = run_predictive_pipeline("best_posting_time")

    assert donor_upgrade_metrics["best_model_name"] in {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert best_posting_time_metrics["best_model_name"] in {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert next_amount_metrics["best_model_name"] in {
        "dummy_regressor",
        "ridge_regression",
        "random_forest_regressor",
    }
    assert math.isfinite(float(donor_upgrade_metrics["average_precision"]))
    assert math.isfinite(float(best_posting_time_metrics["average_precision"]))
    assert math.isfinite(float(next_amount_metrics["r2"]))

    assert (MODELS_DIR / "donor_upgrade" / "predictive_model.joblib").exists()
    assert (MODELS_DIR / "next_donation_amount" / "predictive_model.joblib").exists()
    assert (MODELS_DIR / "best_posting_time" / "predictive_model.joblib").exists()
    assert (REPORTS_DIR / "evaluation" / "donor_upgrade_metrics.json").exists()
    assert (REPORTS_DIR / "evaluation" / "next_donation_amount_metrics.json").exists()
    assert (REPORTS_DIR / "evaluation" / "best_posting_time_metrics.json").exists()

    outputs = write_phase_c_outputs()
    assert outputs["summary"].exists()
    assert outputs["report"].exists()

    for notebook_only in PHASE_C_NOTEBOOK_ONLY_PIPELINES:
        spec = get_notebook_pipeline_spec(notebook_only)
        assert spec["notebook_dir"].exists()
