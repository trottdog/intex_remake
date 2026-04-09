"""Phase D resident expansion orchestration."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.config.paths import REPORTS_DIR
from ml.src.pipelines.notebook_factory import write_phase_b_outputs
from ml.src.pipelines.registry import run_predictive_pipeline
from ml.src.pipelines.resident_expansion_common import build_and_save_resident_monthly_features

PHASE_D_EXISTING_FOUNDATION_PIPELINES: tuple[str, ...] = ("resident_risk",)
PHASE_D_PREDICTIVE_PIPELINES: tuple[str, ...] = (
    "case_prioritization",
    "counseling_progress",
    "education_improvement",
    "home_visitation_outcome",
)
PHASE_D_NOTEBOOK_ONLY_PIPELINES: tuple[str, ...] = ("wellbeing_deterioration",)


def run_phase_d_predictive_pipelines() -> pd.DataFrame:
    """Train the net-new Phase D predictive pipelines and return their summary."""

    rows = [run_predictive_pipeline(name) for name in PHASE_D_PREDICTIVE_PIPELINES]
    return pd.DataFrame(rows).sort_values("pipeline_name").reset_index(drop=True)


def build_phase_d_report(summary: pd.DataFrame) -> str:
    """Build a markdown summary of the Phase D resident expansion work."""

    table = summary.fillna("").astype(str)
    headers = list(table.columns)
    header_row = "| " + " | ".join(headers) + " |"
    separator_row = "| " + " | ".join("---" for _ in headers) + " |"
    body_rows = [
        "| " + " | ".join(row) + " |"
        for row in table.itertuples(index=False, name=None)
    ]

    return "\n".join(
        [
            "# Phase D Resident Expansion",
            "",
            "## Objective",
            "- Build the resident expansion wave on top of the existing resident-risk and reintegration foundation.",
            "",
            "## Existing Foundation Reused",
            "* `resident_risk` already covers the incident-risk slot from the expansion plan.",
            "* `resident_monthly_features.csv` now carries the future-window labels used by the new resident pipelines.",
            "",
            "## Predictive Pipelines Added",
            "* `case_prioritization`",
            "* `counseling_progress`",
            "* `education_improvement`",
            "* `home_visitation_outcome`",
            "",
            "## Notebook-Only Tracks Added",
            "* `wellbeing_deterioration`",
            "",
            "## Notes",
            "- This phase keeps wellbeing deterioration explanation-first because the current future-health sample is still relatively sparse.",
            "- The resident snapshot table now includes reusable completeness flags for 30-, 60-, 90-, and 120-day future windows.",
            "- `home_visitation_outcome` is included as a benchmarked predictive branch, but its current baseline still collapses to the dummy classifier and should stay exploratory until the target or feature set improves.",
            "",
            "## Predictive Summary",
            header_row,
            separator_row,
            *body_rows,
            "",
            "## Commands",
            "* `py -3 ml/scripts/run_phase_d_resident_expansion.py`",
            "* `py -3 ml/scripts/build_phase5_notebooks.py`",
        ]
    ) + "\n"


def write_phase_d_outputs() -> dict[str, Path]:
    """Run Phase D predictive training and write summary outputs."""

    build_and_save_resident_monthly_features()
    summary = run_phase_d_predictive_pipelines()
    write_phase_b_outputs()

    evaluation_dir = REPORTS_DIR / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    summary_path = evaluation_dir / "phase_d_predictive_summary.csv"
    summary.to_csv(summary_path, index=False)

    report_path = REPORTS_DIR.parent / "docs" / "phase-d-resident-expansion.md"
    report_path.write_text(build_phase_d_report(summary), encoding="utf-8")

    return {
        "summary": summary_path,
        "report": report_path,
    }


def main() -> None:
    """Run the Phase D resident expansion workflow."""

    outputs = write_phase_d_outputs()
    print("Wrote Phase D resident outputs:")
    for label, path in outputs.items():
        print(f"- {label}: {path}")


__all__ = [
    "PHASE_D_EXISTING_FOUNDATION_PIPELINES",
    "PHASE_D_NOTEBOOK_ONLY_PIPELINES",
    "PHASE_D_PREDICTIVE_PIPELINES",
    "build_phase_d_report",
    "run_phase_d_predictive_pipelines",
    "write_phase_d_outputs",
]
