import json
from pathlib import Path

import pytest

from ml.src.config.paths import MODELS_DIR, RAW_DATA_DIR, REPORTS_DIR
from ml.src.data.loaders import describe_raw_source, load_raw_tables
from ml.src.pipelines.registry import run_predictive_pipeline

REPRESENTATIVE_RAW_TABLES = (
    "supporters",
    "residents",
    "social_media_posts",
)

REPRESENTATIVE_PIPELINES = (
    "donor_upgrade",
    "resident_risk",
    "reintegration_readiness",
    "social_media_conversion",
)

EXECUTED_NOTEBOOKS = (
    Path("ml/ml-pipelines/case-prioritization/case-prioritization-predictive.ipynb"),
    Path("ml/ml-pipelines/counseling-progress/counseling-progress-predictive.ipynb"),
    Path("ml/ml-pipelines/education-improvement/education-improvement-predictive.ipynb"),
    Path("ml/ml-pipelines/home-visitation-outcome/home-visitation-outcome-predictive.ipynb"),
    Path("ml/ml-pipelines/reintegration-readiness/reintegration-readiness-predictive.ipynb"),
    Path("ml/ml-pipelines/resident-risk/resident-risk-predictive.ipynb"),
)


def test_is455_csv_fallback_can_load_committed_raw_tables() -> None:
    source_path = Path(
        describe_raw_source(required_tables=REPRESENTATIVE_RAW_TABLES, source="csv")
    )
    tables = load_raw_tables(REPRESENTATIVE_RAW_TABLES, source="csv")

    assert source_path.resolve() == RAW_DATA_DIR.resolve()
    assert set(tables) == set(REPRESENTATIVE_RAW_TABLES)
    assert all(len(frame) > 0 for frame in tables.values())


@pytest.mark.parametrize("pipeline_name", REPRESENTATIVE_PIPELINES)
def test_is455_representative_pipeline_has_rerunnable_artifacts(pipeline_name: str) -> None:
    metrics = run_predictive_pipeline(pipeline_name)
    model_dir = MODELS_DIR / pipeline_name
    evaluation_path = REPORTS_DIR / "evaluation" / f"{pipeline_name}_metrics.json"

    assert metrics["best_model_name"]
    assert (model_dir / "predictive_model.joblib").exists()
    assert (model_dir / "feature_list.json").exists()
    assert (model_dir / "metrics.json").exists()
    assert (model_dir / "model_comparison.csv").exists()
    assert evaluation_path.exists()


@pytest.mark.parametrize("notebook_path", EXECUTED_NOTEBOOKS)
def test_is455_selected_submission_notebooks_have_executed_outputs(
    notebook_path: Path,
) -> None:
    notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
    code_cells = [cell for cell in notebook["cells"] if cell.get("cell_type") == "code"]

    assert code_cells
    assert any(
        cell.get("execution_count") is not None and len(cell.get("outputs", [])) > 0
        for cell in code_cells
    )
