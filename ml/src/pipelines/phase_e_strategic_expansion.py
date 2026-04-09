"""Phase E strategic and leadership expansion orchestration."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.src.config.paths import REPORTS_DIR
from ml.src.pipelines.notebook_factory import write_phase_b_outputs
from ml.src.pipelines.registry import run_predictive_pipeline
from ml.src.pipelines.safehouse_expansion_common import (
    build_and_save_public_impact_features,
    build_and_save_safehouse_monthly_features,
)

PHASE_E_EXISTING_FOUNDATION_PIPELINES: tuple[str, ...] = ("safehouse_outcomes",)
PHASE_E_PREDICTIVE_PIPELINES: tuple[str, ...] = (
    "capacity_pressure",
    "resource_demand",
)
PHASE_E_NOTEBOOK_ONLY_PIPELINES: tuple[str, ...] = (
    "donation_allocation_impact",
    "public_impact_forecasting",
    "donor_to_impact_personalization",
)


def run_phase_e_predictive_pipelines() -> pd.DataFrame:
    """Train the Phase E predictive pipelines and return their summary."""

    rows = [run_predictive_pipeline(name) for name in PHASE_E_PREDICTIVE_PIPELINES]
    return pd.DataFrame(rows).sort_values("pipeline_name").reset_index(drop=True)


def build_phase_e_report(summary: pd.DataFrame) -> str:
    """Build a markdown summary of the Phase E strategic work."""

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
            "# Phase E Strategic And Leadership Expansion",
            "",
            "## Objective",
            "- Build the safehouse and leadership expansion wave on top of the shared operations and donor foundations.",
            "",
            "## Existing Foundation Reused",
            "* `safehouse_outcomes` already covers the safehouse performance explanation branch from the expansion plan.",
            "* `safehouse_monthly_features.csv` is now the shared time-based safehouse table for forecasting and strategic analysis.",
            "* `public_impact_features.csv` now parses the public reporting series into a reusable notebook dataset.",
            "",
            "## Predictive Pipelines Added",
            "* `capacity_pressure`",
            "* `resource_demand`",
            "",
            "## Notebook-Only Tracks Added",
            "* `donation_allocation_impact`",
            "* `public_impact_forecasting`",
            "* `donor_to_impact_personalization`",
            "",
            "## Notes",
            "- `capacity_pressure` is currently very strong because safehouse occupancy is highly persistent month to month; treat it as an operational early-warning signal, not as proof of broader causal drivers.",
            "- `resource_demand` is also extremely strong because next-month resident load is highly persistent in the current series; interpret it as a near-term planning forecast, not as a rich causal demand model.",
            "- `public_impact_forecasting` remains notebook-only because the parsed public reporting history is still too small and unstable for a strong production forecast.",
            "- `donor_to_impact_personalization` remains notebook-only because the current donor data does not include explicit recommendation-feedback labels.",
            "",
            "## Predictive Summary",
            header_row,
            separator_row,
            *body_rows,
            "",
            "## Commands",
            "* `py -3 ml/scripts/run_phase_e_strategic_expansion.py`",
            "* `py -3 ml/scripts/build_phase5_notebooks.py`",
        ]
    ) + "\n"


def write_phase_e_outputs() -> dict[str, Path]:
    """Run Phase E predictive training and write summary outputs."""

    build_and_save_safehouse_monthly_features()
    build_and_save_public_impact_features()
    summary = run_phase_e_predictive_pipelines()
    write_phase_b_outputs()

    evaluation_dir = REPORTS_DIR / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    summary_path = evaluation_dir / "phase_e_predictive_summary.csv"
    summary.to_csv(summary_path, index=False)

    report_path = REPORTS_DIR.parent / "docs" / "phase-e-strategic-expansion.md"
    report_path.write_text(build_phase_e_report(summary), encoding="utf-8")

    return {
        "summary": summary_path,
        "report": report_path,
    }


def main() -> None:
    """Run the Phase E strategic expansion workflow."""

    outputs = write_phase_e_outputs()
    print("Wrote Phase E strategic outputs:")
    for label, path in outputs.items():
        print(f"- {label}: {path}")


__all__ = [
    "PHASE_E_EXISTING_FOUNDATION_PIPELINES",
    "PHASE_E_NOTEBOOK_ONLY_PIPELINES",
    "PHASE_E_PREDICTIVE_PIPELINES",
    "build_phase_e_report",
    "run_phase_e_predictive_pipelines",
    "write_phase_e_outputs",
]
