import json

from ml.src.pipelines.notebook_factory import (
    build_explanatory_notebook,
    build_phase_b_report,
    build_predictive_notebook,
    write_phase_b_outputs,
)
from ml.src.pipelines.registry import get_notebook_pipeline_spec


def _cell_text(notebook: dict[str, object]) -> str:
    return "\n".join(
        "".join(cell["source"])
        for cell in notebook["cells"]
        if isinstance(cell, dict) and "source" in cell
    )


def test_phase_b_predictive_notebook_uses_shared_support_and_standard_sections() -> None:
    spec = get_notebook_pipeline_spec("donor_retention")
    notebook = build_predictive_notebook(spec)
    text = _cell_text(notebook)

    assert "## Problem Framing" in text
    assert "## Standard Model Comparison Outputs" in text
    assert "## Deployment Notes" in text
    assert "from ml.src.pipelines.notebook_support import" in text
    assert "load_notebook_context(" in text
    assert "load_evaluation_bundle(" in text


def test_phase_b_explanatory_notebook_uses_standardized_sections() -> None:
    spec = get_notebook_pipeline_spec("safehouse_outcomes")
    notebook = build_explanatory_notebook(spec)
    text = _cell_text(notebook)

    assert "## Standard Analysis Plan" in text
    assert "## Business Interpretation" in text
    assert "## Deployment Notes" in text
    assert "Target or analysis anchor" in text


def test_phase_b_outputs_write_report_and_notebooks(tmp_path) -> None:
    outputs = write_phase_b_outputs(
        notebooks_root=tmp_path / "ml-pipelines",
        docs_root=tmp_path / "docs",
    )

    predictive_path = (
        tmp_path / "ml-pipelines" / "donor-retention" / "donor-retention-predictive.ipynb"
    )
    report_path = tmp_path / "docs" / "phase-b-notebook-standardization.md"

    assert outputs["index"].exists()
    assert predictive_path.exists()
    assert report_path.exists()

    notebook = json.loads(predictive_path.read_text(encoding="utf-8"))
    assert notebook["nbformat"] == 4

    report_text = build_phase_b_report()
    assert "## Standard Predictive Notebook Sections" in report_text
    assert "## Registry Metadata Now Driving Notebook Generation" in report_text
    assert "donor_retention" in report_text
