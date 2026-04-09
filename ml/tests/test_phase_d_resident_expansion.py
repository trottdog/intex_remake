import math

from ml.src.config.paths import MODELS_DIR, REPORTS_DIR
from ml.src.pipelines.case_prioritization.build_dataset import (
    build_dataset as build_case_prioritization_dataset,
)
from ml.src.pipelines.counseling_progress.build_dataset import (
    build_dataset as build_counseling_progress_dataset,
)
from ml.src.pipelines.education_improvement.build_dataset import (
    build_dataset as build_education_improvement_dataset,
)
from ml.src.pipelines.home_visitation_outcome.build_dataset import (
    build_dataset as build_home_visitation_outcome_dataset,
)
from ml.src.pipelines.phase_d_resident_expansion import (
    PHASE_D_EXISTING_FOUNDATION_PIPELINES,
    PHASE_D_NOTEBOOK_ONLY_PIPELINES,
    PHASE_D_PREDICTIVE_PIPELINES,
    write_phase_d_outputs,
)
from ml.src.pipelines.registry import get_notebook_pipeline_spec, list_predictive_pipelines, run_predictive_pipeline


def test_phase_d_registry_and_notebook_specs_include_new_pipelines() -> None:
    pipelines = list_predictive_pipelines()

    for pipeline_name in PHASE_D_EXISTING_FOUNDATION_PIPELINES + PHASE_D_PREDICTIVE_PIPELINES:
        assert pipeline_name in pipelines

    wellbeing_spec = get_notebook_pipeline_spec("wellbeing_deterioration")
    assert wellbeing_spec["predictive_impl"] is None
    assert "sparse" in wellbeing_spec["target_summary"].lower()


def test_phase_d_dataset_builders_sort_and_filter_targets() -> None:
    case_prioritization = build_case_prioritization_dataset(save_output=False)
    counseling_progress = build_counseling_progress_dataset(save_output=False)
    education_improvement = build_education_improvement_dataset(save_output=False)
    home_visitation_outcome = build_home_visitation_outcome_dataset(save_output=False)

    assert case_prioritization["snapshot_month"].is_monotonic_increasing
    assert counseling_progress["snapshot_month"].is_monotonic_increasing
    assert education_improvement["snapshot_month"].is_monotonic_increasing
    assert home_visitation_outcome["snapshot_month"].is_monotonic_increasing

    assert case_prioritization["future_window_complete_60d"].all()
    assert counseling_progress["future_window_complete_90d"].all()
    assert education_improvement["future_window_complete_120d"].all()
    assert home_visitation_outcome["future_window_complete_120d"].all()

    assert int(counseling_progress["process_recent_90d_count"].min()) >= 2
    assert bool(
        ((education_improvement["latest_attendance_rate"] > 0) | (education_improvement["avg_attendance_rate_90d"] > 0)).all()
    )
    assert int(home_visitation_outcome["home_visit_recent_90d_count"].min()) >= 1

    assert set(case_prioritization["label_case_prioritization_next_60d"].unique()) <= {0, 1}
    assert set(counseling_progress["label_counseling_progress_next_90d"].unique()) <= {0, 1}
    assert set(education_improvement["label_education_improvement_next_120d"].unique()) <= {
        0,
        1,
    }
    assert set(home_visitation_outcome["label_supportive_home_visit_next_120d"].unique()) <= {
        0,
        1,
    }


def test_phase_d_predictive_training_and_outputs() -> None:
    metrics_by_pipeline = {
        pipeline_name: run_predictive_pipeline(pipeline_name)
        for pipeline_name in PHASE_D_PREDICTIVE_PIPELINES
    }

    for metrics in metrics_by_pipeline.values():
        assert metrics["best_model_name"] in {
            "dummy_classifier",
            "logistic_regression",
            "random_forest_classifier",
        }
        assert math.isfinite(float(metrics["average_precision"]))

    for pipeline_name in PHASE_D_PREDICTIVE_PIPELINES:
        assert (MODELS_DIR / pipeline_name / "predictive_model.joblib").exists()
        assert (REPORTS_DIR / "evaluation" / f"{pipeline_name}_metrics.json").exists()

    outputs = write_phase_d_outputs()
    assert outputs["summary"].exists()
    assert outputs["report"].exists()

    for notebook_only in PHASE_D_NOTEBOOK_ONLY_PIPELINES:
        spec = get_notebook_pipeline_spec(notebook_only)
        assert spec["notebook_dir"].exists()
