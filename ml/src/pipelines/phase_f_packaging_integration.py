"""Phase F packaging and app integration orchestration."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.scripts.export_for_api import export_pipeline
from ml.src.config.paths import ML_ROOT, REPORTS_DIR
from ml.src.inference.serializers import build_pipeline_manifest
from ml.src.pipelines.notebook_factory import write_phase_b_outputs
from ml.src.pipelines.registry import list_predictive_pipelines, run_predictive_pipeline

PHASE_F_APP_SURFACES: tuple[str, ...] = (
    "frontend/src/pages/donor/DonorDashboardPage.tsx",
    "frontend/src/pages/admin/ResidentDetailPage.tsx",
    "frontend/src/pages/admin/SafehouseDetailPage.tsx",
)
PHASE_F_ENTITY_INSIGHT_ROUTES: tuple[str, ...] = (
    "/ml/residents/{residentId}/insights",
    "/ml/supporters/{supporterId}/insights",
    "/ml/safehouses/{safehouseId}/insights",
)


def ensure_pipeline_export(pipeline_name: str, output_dir: Path) -> list[Path]:
    """Export one predictive pipeline, training it first if artifacts are missing."""

    try:
        return export_pipeline(pipeline_name, output_dir)
    except FileNotFoundError:
        run_predictive_pipeline(pipeline_name)
        return export_pipeline(pipeline_name, output_dir)


def build_phase_f_contract_matrix() -> pd.DataFrame:
    """Build a compact contract matrix for all predictive pipelines."""

    rows: list[dict[str, object]] = []
    for pipeline_name in list_predictive_pipelines():
        manifest = build_pipeline_manifest(pipeline_name)
        route_hints = manifest["route_hints"]
        rows.append(
            {
                "pipeline_name": manifest["pipeline_name"],
                "display_name": manifest["display_name"],
                "task_type": manifest["task_type"],
                "entity_type": manifest["entity_type"],
                "contract_version": manifest["contract_version"],
                "prediction_feed_endpoint": route_hints["prediction_feed_endpoint"],
                "entity_insight_endpoint": route_hints["entity_insight_endpoint"],
                "recommended_widgets": "|".join(str(value) for value in manifest["recommended_widgets"]),
                "primary_users": "|".join(str(value) for value in manifest["primary_users"]),
            }
        )

    return pd.DataFrame(rows).sort_values(["entity_type", "pipeline_name"]).reset_index(drop=True)


def build_phase_f_report(contract_matrix: pd.DataFrame) -> str:
    """Build a markdown summary of the Phase F packaging pass."""

    table = contract_matrix.loc[
        :,
        [
            "pipeline_name",
            "task_type",
            "entity_type",
            "prediction_feed_endpoint",
            "entity_insight_endpoint",
        ],
    ].fillna("").astype(str)
    headers = list(table.columns)
    header_row = "| " + " | ".join(headers) + " |"
    separator_row = "| " + " | ".join("---" for _ in headers) + " |"
    body_rows = [
        "| " + " | ".join(row) + " |"
        for row in table.itertuples(index=False, name=None)
    ]

    return "\n".join(
        [
            "# Phase F Packaging And App Integration",
            "",
            "## Objective",
            "- Package every implemented predictive pipeline behind a consistent deployment contract and expose the expanded outputs in app-facing routes and pages.",
            "",
            "## What This Phase Refreshes",
            "* API payload examples and manifests for every predictive pipeline in `ml/app-integration/payload_examples/`.",
            "* A contract matrix covering task type, entity type, and backend route hints.",
            "* The shared notebook outputs so packaging stays aligned with the latest notebook metadata.",
            "",
            "## Integration Notes",
            "- Regression pipelines now score cleanly through the same inference path as classifiers.",
            "- `next_donation_amount` and `resource_demand` keep their numeric forecast in `prediction` and `prediction_score`; published Supabase snapshots keep `prediction_value` null for those pipelines so the current schema stays backward compatible.",
            "- Backend entity insight routes now cover supporters, residents, and safehouses, with facility scope checks applied to resident and safehouse lookups.",
            "- App-facing pages now surface donor upgrade, expected next gift, expanded resident signals, and safehouse planning signals.",
            "",
            "## Entity Insight Routes",
            *[f"* `{route}`" for route in PHASE_F_ENTITY_INSIGHT_ROUTES],
            "",
            "## App Surfaces Updated",
            *[f"* `{path}`" for path in PHASE_F_APP_SURFACES],
            "",
            "## Contract Matrix",
            header_row,
            separator_row,
            *body_rows,
            "",
            "## Commands",
            "* `py -3 ml/scripts/run_phase_f_packaging_integration.py`",
            "* `py -3 ml/scripts/export_for_api.py`",
            "* `py -3 ml/scripts/refresh_supabase_ml.py --dry-run`",
            "* `dotnet build backend/intex/intex.sln`",
        ]
    ) + "\n"


def write_phase_f_outputs() -> dict[str, Path]:
    """Run the Phase F packaging workflow and write summary outputs."""

    write_phase_b_outputs()

    payload_dir = ML_ROOT / "app-integration" / "payload_examples"
    for pipeline_name in list_predictive_pipelines():
        ensure_pipeline_export(pipeline_name, payload_dir)

    contract_matrix = build_phase_f_contract_matrix()
    tables_dir = REPORTS_DIR / "tables"
    tables_dir.mkdir(parents=True, exist_ok=True)
    contract_matrix_path = tables_dir / "phase_f_api_contract_matrix.csv"
    contract_matrix.to_csv(contract_matrix_path, index=False)

    report_path = ML_ROOT / "docs" / "phase-f-packaging-and-app-integration.md"
    report_path.write_text(build_phase_f_report(contract_matrix), encoding="utf-8")

    return {
        "contract_matrix": contract_matrix_path,
        "payload_dir": payload_dir,
        "report": report_path,
    }


def main() -> None:
    """Run the Phase F packaging workflow."""

    outputs = write_phase_f_outputs()
    print("Wrote Phase F packaging outputs:")
    for label, path in outputs.items():
        print(f"- {label}: {path}")


__all__ = [
    "PHASE_F_APP_SURFACES",
    "PHASE_F_ENTITY_INSIGHT_ROUTES",
    "build_phase_f_contract_matrix",
    "build_phase_f_report",
    "ensure_pipeline_export",
    "write_phase_f_outputs",
]
