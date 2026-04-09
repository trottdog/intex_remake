import math

from ml.src.config.paths import MODELS_DIR, REPORTS_DIR
from ml.src.pipelines.capacity_pressure.build_dataset import (
    build_dataset as build_capacity_pressure_dataset,
)
from ml.src.pipelines.phase_e_strategic_expansion import (
    PHASE_E_EXISTING_FOUNDATION_PIPELINES,
    PHASE_E_NOTEBOOK_ONLY_PIPELINES,
    PHASE_E_PREDICTIVE_PIPELINES,
    write_phase_e_outputs,
)
from ml.src.pipelines.registry import get_notebook_pipeline_spec, list_predictive_pipelines, run_predictive_pipeline
from ml.src.pipelines.resource_demand.build_dataset import (
    build_dataset as build_resource_demand_dataset,
)


def test_phase_e_registry_and_notebook_specs_include_new_pipelines() -> None:
    pipelines = list_predictive_pipelines()

    for pipeline_name in PHASE_E_PREDICTIVE_PIPELINES:
        assert pipeline_name in pipelines

    assert "safehouse_outcomes" not in pipelines
    assert PHASE_E_EXISTING_FOUNDATION_PIPELINES == ("safehouse_outcomes",)

    forecasting_spec = get_notebook_pipeline_spec("public_impact_forecasting")
    assert forecasting_spec["predictive_impl"] is None
    assert "too small" in forecasting_spec["target_summary"].lower()

    personalization_spec = get_notebook_pipeline_spec("donor_to_impact_personalization")
    assert personalization_spec["predictive_impl"] is None
    assert "feedback" in personalization_spec["target_summary"].lower()


def test_phase_e_dataset_builders_sort_and_cast_targets() -> None:
    capacity_pressure = build_capacity_pressure_dataset(save_output=False)
    resource_demand = build_resource_demand_dataset(save_output=False)

    assert capacity_pressure["month_start"].is_monotonic_increasing
    assert resource_demand["month_start"].is_monotonic_increasing

    assert capacity_pressure["future_window_complete_1m"].all()
    assert resource_demand["future_window_complete_1m"].all()

    assert set(capacity_pressure["label_capacity_pressure_next_month"].unique()) <= {0, 1}
    assert resource_demand["label_next_active_residents"].notna().all()


def test_phase_e_predictive_training_and_outputs() -> None:
    capacity_metrics = run_predictive_pipeline("capacity_pressure")
    resource_metrics = run_predictive_pipeline("resource_demand")

    assert capacity_metrics["best_model_name"] in {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert resource_metrics["best_model_name"] in {
        "dummy_regressor",
        "ridge_regression",
        "random_forest_regressor",
    }
    assert math.isfinite(float(capacity_metrics["average_precision"]))
    assert math.isfinite(float(resource_metrics["r2"]))

    assert (MODELS_DIR / "capacity_pressure" / "predictive_model.joblib").exists()
    assert (MODELS_DIR / "resource_demand" / "predictive_model.joblib").exists()
    assert (REPORTS_DIR / "evaluation" / "capacity_pressure_metrics.json").exists()
    assert (REPORTS_DIR / "evaluation" / "resource_demand_metrics.json").exists()

    outputs = write_phase_e_outputs()
    assert outputs["summary"].exists()
    assert outputs["report"].exists()

    for notebook_only in PHASE_E_NOTEBOOK_ONLY_PIPELINES:
        spec = get_notebook_pipeline_spec(notebook_only)
        assert spec["notebook_dir"].exists()
