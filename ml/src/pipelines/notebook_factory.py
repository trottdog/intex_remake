"""Shared factory for standardized ML notebook production."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ml.src.config.paths import ML_ROOT
from ml.src.pipelines.registry import get_notebook_pipeline_spec, list_notebook_pipelines

KERNEL_METADATA = {
    "kernelspec": {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    },
    "language_info": {
        "name": "python",
        "version": "3.12",
    },
}

STANDARD_PREDICTIVE_SECTIONS: tuple[str, ...] = (
    "Problem Framing",
    "Shared Assets And Notebook Bootstrap",
    "Target And Leakage Checklist",
    "Standard Model Comparison Outputs",
    "Business Interpretation",
    "Deployment Notes",
)

STANDARD_EXPLANATORY_SECTIONS: tuple[str, ...] = (
    "Problem Framing",
    "Shared Assets And Notebook Bootstrap",
    "Standard Analysis Plan",
    "Evidence Review",
    "Business Interpretation",
    "Deployment Notes",
)

STANDARD_EVALUATION_OUTPUTS: tuple[str, ...] = (
    "ml/reports/evaluation/<pipeline>_metrics.json",
    "ml/reports/evaluation/phase4_holdout_comparison.csv",
    "ml/reports/evaluation/phase4_cv_summary.csv",
)


def markdown_cell(text: str) -> dict[str, object]:
    """Build a markdown notebook cell."""

    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in text.strip().splitlines()],
    }


def code_cell(code: str) -> dict[str, object]:
    """Build a code notebook cell with no outputs."""

    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in code.strip().splitlines()],
    }


def _bullets(items: list[str] | tuple[str, ...], *, code: bool = False) -> str:
    if not items:
        return "* None yet"
    if code:
        return "\n".join(f"* `{item}`" for item in items)
    return "\n".join(f"* {item}" for item in items)


def _users_line(users: list[str] | tuple[str, ...]) -> str:
    return ", ".join(users) if users else "to be assigned"


def build_repo_bootstrap_cell() -> dict[str, object]:
    """Build the standard repo-bootstrap cell used by all notebooks."""

    return code_cell(
        """
from pathlib import Path
import sys

REPO_ROOT = Path.cwd().resolve()
while not (REPO_ROOT / "ml").exists() and REPO_ROOT != REPO_ROOT.parent:
    REPO_ROOT = REPO_ROOT.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
"""
    )


def build_predictive_notebook(spec: dict[str, object]) -> dict[str, object]:
    """Build the predictive notebook JSON payload for one pipeline."""

    pipeline_name = str(spec["pipeline_name"])
    dataset_name = str(spec["dataset_name"])
    predictive_impl = spec.get("predictive_impl")
    evaluation_reference = predictive_impl or pipeline_name
    widgets = _bullets(tuple(spec["recommended_widgets"]), code=True)
    deployment_notes = _bullets(tuple(spec["deployment_notes"]))

    cells = [
        markdown_cell(
            f"""
# {spec['display_name']} Predictive

## Problem Framing

**Business question:** {spec['predictive_question']}

**Operational decision supported:** {spec['decision_support']}

**Primary users:** {_users_line(tuple(spec.get('primary_users', [])))}

**Target summary:** {spec['target_summary']}

This standardized predictive notebook uses the shared notebook factory so every pipeline follows the same submission structure and evaluation flow.
"""
        ),
        markdown_cell(
            """
## Shared Assets And Notebook Bootstrap

Shared references:

* `ml/docs/data-joins.md`
* `ml/docs/feature-catalog.md`
* `ml/docs/phase-3-predictive-pipelines.md`
* `ml/docs/phase-4-modeling-framework.md`
* `ml/docs/phase-b-notebook-standardization.md`
"""
        ),
        build_repo_bootstrap_cell(),
        code_cell(
            f"""
from ml.src.pipelines.notebook_support import (
    load_evaluation_bundle,
    load_notebook_context,
    summarize_frame,
)

context = load_notebook_context(
    pipeline_name={pipeline_name!r},
    dataset_name={dataset_name!r},
    predictive_impl={predictive_impl!r},
    use_predictive_dataset=True,
)
pipeline_name = context["pipeline_name"]
dataset_name = context["dataset_name"]
config = context["config"]
dataset = context["dataset"]

summarize_frame(dataset)
"""
        ),
        markdown_cell(
            f"""
## Target And Leakage Checklist

1. Restate the target in business terms: {spec['target_summary']}
2. Confirm the snapshot date or split column before running any new model fits.
3. Remove fields that directly encode the future target or post-outcome information.
4. Record any threshold, calibration, or class-balance choice that changes deployment behavior.
"""
        ),
        markdown_cell(
            """
## Standard Model Comparison Outputs

Every predictive notebook should read the same evaluation bundle before writing conclusions:

* saved metrics JSON
* Phase 4 holdout comparison table
* Phase 4 cross-validation summary
"""
        ),
        code_cell(
            f"""
evaluation = load_evaluation_bundle({evaluation_reference!r})
metrics = evaluation["metrics"]
holdout_comparison = evaluation["holdout_comparison"]
cv_summary = evaluation["cv_summary"]

metrics
"""
        ),
        code_cell(
            """
summarize_frame(holdout_comparison)
"""
        ),
        code_cell(
            """
summarize_frame(cv_summary)
"""
        ),
        markdown_cell(
            f"""
## Business Interpretation

Write the final narrative in plain language:

1. What does a high score mean operationally for this pipeline?
2. Which staff action should happen next because of the score?
3. Which users should trust the ranking signal versus wait for more threshold work?
4. Which fairness, bias, or data-quality caveats need to be called out to {_users_line(tuple(spec.get('primary_users', [])))}?
"""
        ),
        markdown_cell(
            f"""
## Deployment Notes

Recommended shared widgets:

{widgets}

Deployment checklist:

{deployment_notes}

Standard endpoint pattern:

* `POST /ml/predict/{pipeline_name}`
* `POST /ml/score-batch/{pipeline_name}`
"""
        ),
    ]

    return {
        "cells": cells,
        "metadata": KERNEL_METADATA,
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def build_explanatory_notebook(spec: dict[str, object]) -> dict[str, object]:
    """Build the explanatory notebook JSON payload for one pipeline."""

    pipeline_name = str(spec["pipeline_name"])
    dataset_name = str(spec["dataset_name"])
    predictive_impl = spec.get("predictive_impl")
    evaluation_reference = predictive_impl or pipeline_name
    widgets = _bullets(tuple(spec["recommended_widgets"]), code=True)
    deployment_notes = _bullets(tuple(spec["deployment_notes"]))

    cells = [
        markdown_cell(
            f"""
# {spec['display_name']} Explanatory

## Problem Framing

**Business question:** {spec['explanatory_question']}

**Operational decision supported:** {spec['decision_support']}

**Primary users:** {_users_line(tuple(spec.get('primary_users', [])))}

**Target or analysis anchor:** {spec['target_summary']}

This standardized explanatory notebook keeps the narrative focused on decisions and evidence while reusing the same shared platform as the predictive work.
"""
        ),
        markdown_cell(
            """
## Shared Assets And Notebook Bootstrap

Shared references:

* `ml/docs/data-joins.md`
* `ml/docs/feature-catalog.md`
* `ml/docs/phase-2-shared-prep.md`
* `ml/docs/phase-b-notebook-standardization.md`
"""
        ),
        build_repo_bootstrap_cell(),
        code_cell(
            f"""
from ml.src.pipelines.notebook_support import (
    load_evaluation_bundle,
    load_notebook_context,
    summarize_frame,
)

context = load_notebook_context(
    pipeline_name={pipeline_name!r},
    dataset_name={dataset_name!r},
    predictive_impl={predictive_impl!r},
    use_predictive_dataset=False,
)
dataset = context["dataset"]

summarize_frame(dataset)
"""
        ),
        markdown_cell(
            """
## Standard Analysis Plan

1. Review the shared table grain and confirm it matches the business question.
2. Compare segments that matter operationally, not just statistically.
3. Reuse the nearest predictive artifact when it helps explain feature importance or threshold behavior.
4. Close with recommendations the application can actually surface.
"""
        ),
        markdown_cell(
            """
## Evidence Review

Use the nearest predictive artifact only when it genuinely clarifies the analysis. Keep the explanatory notebook focused on evidence the user can act on, not on repeating a model leaderboard.
"""
        ),
        code_cell(
            f"""
evaluation = load_evaluation_bundle({evaluation_reference!r})
metrics = evaluation["metrics"]
holdout_comparison = evaluation["holdout_comparison"]
cv_summary = evaluation["cv_summary"]

metrics
"""
        ),
        code_cell(
            """
summarize_frame(holdout_comparison)
"""
        ),
        markdown_cell(
            f"""
## Business Interpretation

Explain:

1. Which patterns matter most for the decision this notebook supports.
2. Why those patterns matter for {_users_line(tuple(spec.get('primary_users', [])))}.
3. Which actions should change in planning, outreach, or case management.
4. Which limitations mean the analysis should stay explanation-first for now.
"""
        ),
        markdown_cell(
            f"""
## Deployment Notes

Recommended shared widgets:

{widgets}

Deployment checklist:

{deployment_notes}

Preferred delivery pattern:

* use explanation chart cards and insight summaries first
* only add new endpoints if the analysis becomes user-facing and interactive
"""
        ),
    ]

    return {
        "cells": cells,
        "metadata": KERNEL_METADATA,
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def build_pipeline_index() -> dict[str, object]:
    """Build the top-level notebook index."""

    links = []
    for pipeline_name in list_notebook_pipelines():
        spec = get_notebook_pipeline_spec(pipeline_name)
        links.append(
            f"* [{spec['display_name']} predictive]({spec['slug']}/{spec['slug']}-predictive.ipynb)"
        )
        links.append(
            f"* [{spec['display_name']} explanatory]({spec['slug']}/{spec['slug']}-explanatory.ipynb)"
        )

    return {
        "cells": [
            markdown_cell(
                """
# Pipeline Index

## Shared Deliverables

* [Global data profiling](01_global_data_profiling.ipynb)
* `ml/docs/phase-3-predictive-pipelines.md`
* `ml/docs/phase-4-modeling-framework.md`
* `ml/docs/phase-5-delivery-and-integration.md`
* `ml/docs/phase-b-notebook-standardization.md`

## Pipeline Notebooks
"""
                + "\n".join(links)
            )
        ],
        "metadata": KERNEL_METADATA,
        "nbformat": 4,
        "nbformat_minor": 5,
    }


def build_pipeline_readme(spec: dict[str, object]) -> str:
    """Build the standardized README text for one notebook folder."""

    widgets = ", ".join(f"`{widget}`" for widget in spec["recommended_widgets"])
    return (
        f"# {spec['display_name']}\n\n"
        f"This folder contains the standardized predictive and explanatory notebook templates for `{spec['pipeline_name']}`.\n\n"
        f"## Notebook Standard\n\n"
        f"- Decision support: {spec['decision_support']}\n"
        f"- Target summary: {spec['target_summary']}\n"
        f"- Recommended widgets: {widgets}\n"
        f"- Primary users: {_users_line(tuple(spec.get('primary_users', [])))}\n"
    )


def _markdown_table(frame: pd.DataFrame) -> str:
    if frame.empty:
        return "_No rows available._"

    string_frame = frame.fillna("").astype(str)
    headers = list(string_frame.columns)
    header_row = "| " + " | ".join(headers) + " |"
    separator_row = "| " + " | ".join("---" for _ in headers) + " |"
    body_rows = [
        "| " + " | ".join(row) + " |"
        for row in string_frame.itertuples(index=False, name=None)
    ]
    return "\n".join([header_row, separator_row, *body_rows])


def build_phase_b_report() -> str:
    """Build the human-readable Phase B standardization report."""

    specs = [get_notebook_pipeline_spec(name) for name in list_notebook_pipelines()]
    metadata_table = pd.DataFrame(
        [
            {
                "pipeline": spec["pipeline_name"],
                "predictive_impl": spec["predictive_impl"] or "",
                "dataset": spec["dataset_name"],
                "target_summary": spec["target_summary"],
                "recommended_widgets": ", ".join(spec["recommended_widgets"]),
            }
            for spec in specs
        ]
    )

    report_lines = [
        "# Phase B Notebook Standardization",
        "",
        "## Objective",
        "- Turn the existing shared ML platform into a repeatable notebook factory for expansion work.",
        "- Keep predictive and explanatory submissions structurally consistent while letting each pipeline stay distinct in business framing.",
        "",
        "## Shared Modules",
        "* `ml/src/pipelines/notebook_support.py`",
        "* `ml/src/pipelines/notebook_factory.py`",
        "* `ml/scripts/build_phase5_notebooks.py`",
        "* `ml/scripts/run_phase_b_notebook_standardization.py`",
        "",
        "## Standard Predictive Notebook Sections",
        *[f"{index}. {section}" for index, section in enumerate(STANDARD_PREDICTIVE_SECTIONS, start=1)],
        "",
        "## Standard Explanatory Notebook Sections",
        *[f"{index}. {section}" for index, section in enumerate(STANDARD_EXPLANATORY_SECTIONS, start=1)],
        "",
        "## Standard Model Comparison Outputs",
        *[f"* `{path}`" for path in STANDARD_EVALUATION_OUTPUTS],
        "",
        "## Registry Metadata Now Driving Notebook Generation",
        _markdown_table(metadata_table),
        "",
        "## Commands",
        "* `py -3 ml/scripts/run_phase_b_notebook_standardization.py`",
        "* `py -3 ml/scripts/build_phase5_notebooks.py`",
    ]
    return "\n".join(report_lines) + "\n"


def write_notebook(notebook: dict[str, object], output_path: Path) -> None:
    """Write a notebook JSON file to disk."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(notebook, indent=2), encoding="utf-8")


def write_phase_b_outputs(
    *,
    notebooks_root: Path | None = None,
    docs_root: Path | None = None,
) -> dict[str, Path]:
    """Write all standardized notebook outputs for Phase B."""

    notebooks_root = notebooks_root or ML_ROOT / "ml-pipelines"
    docs_root = docs_root or ML_ROOT / "docs"
    docs_root.mkdir(parents=True, exist_ok=True)

    for pipeline_name in list_notebook_pipelines():
        spec = get_notebook_pipeline_spec(pipeline_name)
        slug = str(spec["slug"])
        notebook_dir = notebooks_root / slug
        predictive_path = notebook_dir / f"{slug}-predictive.ipynb"
        explanatory_path = notebook_dir / f"{slug}-explanatory.ipynb"

        write_notebook(build_predictive_notebook(spec), predictive_path)
        write_notebook(build_explanatory_notebook(spec), explanatory_path)

        readme_path = notebook_dir / "README.md"
        readme_path.write_text(build_pipeline_readme(spec), encoding="utf-8")

    index_path = notebooks_root / "00_pipeline_index.ipynb"
    write_notebook(build_pipeline_index(), index_path)

    report_path = docs_root / "phase-b-notebook-standardization.md"
    report_path.write_text(build_phase_b_report(), encoding="utf-8")

    return {
        "notebooks_root": notebooks_root,
        "index": index_path,
        "report": report_path,
    }


def main() -> None:
    """Generate all standardized notebook outputs."""

    outputs = write_phase_b_outputs()
    print("Wrote Phase B notebook standardization outputs:")
    for label, path in outputs.items():
        print(f"- {label}: {path}")


__all__ = [
    "STANDARD_EVALUATION_OUTPUTS",
    "STANDARD_EXPLANATORY_SECTIONS",
    "STANDARD_PREDICTIVE_SECTIONS",
    "build_explanatory_notebook",
    "build_phase_b_report",
    "build_pipeline_index",
    "build_pipeline_readme",
    "build_predictive_notebook",
    "main",
    "write_phase_b_outputs",
]
