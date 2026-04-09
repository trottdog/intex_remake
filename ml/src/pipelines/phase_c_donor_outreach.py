"""Phase C donor and outreach expansion orchestration."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.config.paths import REPORTS_DIR
from ml.src.pipelines.donor_growth_common import build_and_save_supporter_monthly_features
from ml.src.pipelines.notebook_factory import write_phase_b_outputs
from ml.src.pipelines.registry import run_predictive_pipeline

PHASE_C_PREDICTIVE_PIPELINES: tuple[str, ...] = (
    "donor_upgrade",
    "next_donation_amount",
    "best_posting_time",
)

PHASE_C_NOTEBOOK_ONLY_PIPELINES: tuple[str, ...] = (
    "content_type_effectiveness",
    "donation_channel_effectiveness",
    "recurring_donor_conversion",
)


def run_phase_c_predictive_pipelines() -> pd.DataFrame:
    """Train the fast Phase C predictive pipelines and return their summary."""

    rows = [run_predictive_pipeline(name) for name in PHASE_C_PREDICTIVE_PIPELINES]
    return pd.DataFrame(rows).sort_values("pipeline_name").reset_index(drop=True)


def build_phase_c_report(summary: pd.DataFrame) -> str:
    """Build a short markdown summary of the Phase C donor/outreach work."""

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
            "# Phase C Donor And Outreach Expansion",
            "",
            "## Objective",
            "- Build the fastest next donor and outreach pipelines on top of the shared ML platform.",
            "",
            "## Predictive Pipelines Added",
            "* `donor_upgrade`",
            "* `next_donation_amount`",
            "* `best_posting_time`",
            "",
            "## Notebook-Only Tracks Added",
            "* `content_type_effectiveness`",
            "* `donation_channel_effectiveness`",
            "* `recurring_donor_conversion`",
            "",
            "## Notes",
            "- `supporter_monthly_features.csv` is now the shared donor snapshot table for future-looking donor growth work.",
            "- `recurring_donor_conversion` remains notebook-only because the available recurring-donation history does not contain meaningful future conversion transitions.",
            "",
            "## Predictive Summary",
            header_row,
            separator_row,
            *body_rows,
            "",
            "## Commands",
            "* `py -3 ml/scripts/run_phase_c_donor_outreach.py`",
            "* `py -3 ml/scripts/build_phase5_notebooks.py`",
        ]
    ) + "\n"


def write_phase_c_outputs() -> dict[str, Path]:
    """Run Phase C predictive training and write summary outputs."""

    build_and_save_supporter_monthly_features()
    summary = run_phase_c_predictive_pipelines()
    write_phase_b_outputs()

    evaluation_dir = REPORTS_DIR / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    summary_path = evaluation_dir / "phase_c_predictive_summary.csv"
    summary.to_csv(summary_path, index=False)

    report_path = REPORTS_DIR.parent / "docs" / "phase-c-donor-and-outreach-expansion.md"
    report_path.write_text(build_phase_c_report(summary), encoding="utf-8")

    return {
        "summary": summary_path,
        "report": report_path,
    }


def main() -> None:
    """Run the Phase C donor/outreach workflow."""

    outputs = write_phase_c_outputs()
    print("Wrote Phase C donor/outreach outputs:")
    for label, path in outputs.items():
        print(f"- {label}: {path}")


__all__ = [
    "PHASE_C_NOTEBOOK_ONLY_PIPELINES",
    "PHASE_C_PREDICTIVE_PIPELINES",
    "build_phase_c_report",
    "run_phase_c_predictive_pipelines",
    "write_phase_c_outputs",
]
