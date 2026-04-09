"""Phase A audit helpers for ML pipeline expansion."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from ml.src.config.paths import ML_ROOT, MODELS_DIR, REPORTS_DIR, REPORTS_TABLES_DIR
from ml.src.pipelines.registry import (
    APP_INTEGRATION_ROOT,
    NOTEBOOKS_ROOT,
    NOTEBOOK_PIPELINES,
    PREDICTIVE_PIPELINES,
    get_notebook_pipeline_spec,
    load_predictive_pipeline_config,
)


@dataclass(frozen=True)
class ExpansionCandidate:
    """Metadata for one candidate in the expansion portfolio."""

    expansion_slug: str
    display_name: str
    domain: str
    framing: str
    primary_dataset: str
    secondary_datasets: tuple[str, ...] = ()
    exact_match_pipeline: str | None = None
    adjacent_assets: tuple[str, ...] = ()
    target_readiness: str = "new_label_needed"
    recommended_lane: str = "later"
    recommended_order: int = 99
    notes: str = ""


FEATURE_MODULE_BY_DATASET: dict[str, tuple[str, ...]] = {
    "supporter_features": ("ml/src/features/donor_features.py",),
    "campaign_features": ("ml/src/features/donor_features.py",),
    "post_features": ("ml/src/features/social_features.py",),
    "resident_features": ("ml/src/features/resident_features.py",),
    "resident_monthly_features": ("ml/src/features/resident_features.py",),
    "safehouse_features": ("ml/src/features/safehouse_features.py",),
    "public_impact_snapshots_raw": (),
}

MODELING_HELPERS: tuple[str, ...] = (
    "ml/src/pipelines/common.py",
    "ml/src/modeling/train.py",
    "ml/src/modeling/metrics.py",
    "ml/src/modeling/validation.py",
)

NOTEBOOK_AND_DELIVERY_HELPERS: tuple[str, ...] = (
    "ml/scripts/build_phase5_notebooks.py",
    "ml/scripts/export_for_api.py",
    "ml/src/inference/batch_score.py",
    "ml/src/inference/predict.py",
    "ml/app-integration/integration_notes.md",
)

TARGET_READINESS_POINTS: dict[str, int] = {
    "existing_label": 3,
    "existing_proxy_labels": 2,
    "existing_proxy_outcomes": 1,
    "new_label_needed": 0,
    "raw_table_only": -1,
}

LANE_PRIORITY_POINTS: dict[str, int] = {
    "completed_baseline": 0,
    "finish_partial": 1,
    "build_now": 2,
    "build_after_donor_wave": 1,
    "later_strategic": 0,
}


EXPANSION_PORTFOLIO: tuple[ExpansionCandidate, ...] = (
    ExpansionCandidate(
        expansion_slug="donor_upgrade_likelihood",
        display_name="Donor Upgrade Likelihood",
        domain="donor_growth",
        framing="predictive",
        primary_dataset="supporter_features",
        secondary_datasets=("campaign_features",),
        adjacent_assets=("donor_retention", "donation_uplift"),
        target_readiness="new_label_needed",
        recommended_lane="build_now",
        recommended_order=1,
        notes=(
            "Best donor-branch adjacency once a future amount-growth label is added "
            "to supporter snapshots."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="recurring_donor_conversion",
        display_name="Recurring Donor Conversion",
        domain="donor_growth",
        framing="predictive",
        primary_dataset="supporter_features",
        secondary_datasets=("campaign_features",),
        adjacent_assets=("donor_retention",),
        target_readiness="new_label_needed",
        recommended_lane="build_now",
        recommended_order=2,
        notes=(
            "Extends the donor branch with a first-recurring-within-window label and "
            "keeps the same scoring UX."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="next_donation_amount_prediction",
        display_name="Next Donation Amount Prediction",
        domain="donor_growth",
        framing="predictive_regression",
        primary_dataset="supporter_features",
        secondary_datasets=("campaign_features",),
        adjacent_assets=("donor_retention", "donation_uplift"),
        target_readiness="new_label_needed",
        recommended_lane="build_now",
        recommended_order=6,
        notes=(
            "Reuses the donor branch, but needs a longitudinal regression target "
            "instead of the current classification labels."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="best_posting_time_prediction",
        display_name="Best Posting Time Prediction",
        domain="outreach_optimization",
        framing="predictive",
        primary_dataset="post_features",
        adjacent_assets=("social_media_conversion",),
        target_readiness="existing_label",
        recommended_lane="build_now",
        recommended_order=3,
        notes=(
            "Can reuse donation-linked post outcomes immediately while re-framing the "
            "feature slice around timing variables."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="content_type_effectiveness_explanation",
        display_name="Content Type Effectiveness Explanation",
        domain="outreach_optimization",
        framing="explanatory",
        primary_dataset="post_features",
        adjacent_assets=("social_media_conversion",),
        target_readiness="existing_label",
        recommended_lane="build_now",
        recommended_order=4,
        notes=(
            "Pure explanation notebook off the existing post table, with no new shared "
            "dataset work required."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="donation_channel_effectiveness_explanation",
        display_name="Donation Channel Effectiveness Explanation",
        domain="donor_growth",
        framing="explanatory",
        primary_dataset="campaign_features",
        secondary_datasets=("supporter_features",),
        adjacent_assets=("donor_retention", "donation_uplift"),
        target_readiness="existing_proxy_outcomes",
        recommended_lane="build_now",
        recommended_order=5,
        notes=(
            "Can explain long-term donor value by acquisition and giving channel with "
            "today's aggregates, even before a new supervised label is added."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="incident_risk_prediction",
        display_name="Incident Risk Prediction",
        domain="resident_safety",
        framing="predictive",
        primary_dataset="resident_monthly_features",
        exact_match_pipeline="resident_risk",
        target_readiness="existing_label",
        recommended_lane="completed_baseline",
        recommended_order=0,
        notes=(
            "Already implemented as `resident_risk` using `label_incident_next_30d`."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="case_prioritization_score",
        display_name="Case Prioritization Score",
        domain="resident_safety",
        framing="predictive_ranking",
        primary_dataset="resident_monthly_features",
        adjacent_assets=("resident_risk", "reintegration_readiness"),
        target_readiness="existing_proxy_labels",
        recommended_lane="build_after_donor_wave",
        recommended_order=7,
        notes=(
            "Can combine current risk and reintegration signals into a triage score "
            "before introducing a brand-new resident label."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="counseling_progress_prediction",
        display_name="Counseling Progress Prediction",
        domain="resident_safety",
        framing="predictive",
        primary_dataset="resident_monthly_features",
        secondary_datasets=("resident_features",),
        adjacent_assets=("reintegration_readiness",),
        target_readiness="new_label_needed",
        recommended_lane="build_after_donor_wave",
        recommended_order=11,
        notes=(
            "Needs a defensible future progress label derived from process recordings "
            "or wellbeing deltas."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="education_improvement_prediction",
        display_name="Education Improvement Prediction",
        domain="resident_safety",
        framing="predictive",
        primary_dataset="resident_monthly_features",
        secondary_datasets=("resident_features",),
        adjacent_assets=("reintegration_readiness",),
        target_readiness="new_label_needed",
        recommended_lane="build_after_donor_wave",
        recommended_order=12,
        notes=(
            "Shared resident tables already cover the source signals, but the target "
            "still needs to be defined cleanly."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="wellbeing_deterioration_prediction",
        display_name="Wellbeing Deterioration Prediction",
        domain="resident_safety",
        framing="predictive",
        primary_dataset="resident_monthly_features",
        secondary_datasets=("resident_features",),
        adjacent_assets=("resident_risk",),
        target_readiness="new_label_needed",
        recommended_lane="build_after_donor_wave",
        recommended_order=13,
        notes=(
            "Natural resident-monthly extension, but still needs a future wellbeing "
            "decline label or composite outcome."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="home_visitation_outcome_prediction",
        display_name="Home Visitation Outcome Prediction",
        domain="resident_safety",
        framing="predictive",
        primary_dataset="resident_features",
        secondary_datasets=("resident_monthly_features",),
        adjacent_assets=("reintegration_readiness",),
        target_readiness="new_label_needed",
        recommended_lane="build_after_donor_wave",
        recommended_order=14,
        notes=(
            "Reuses the reintegration branch, but target design will need careful "
            "leakage review around visit timing."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="safehouse_performance_explanation",
        display_name="Safehouse Performance Explanation",
        domain="strategic_planning",
        framing="explanatory",
        primary_dataset="safehouse_features",
        exact_match_pipeline="safehouse_outcomes",
        target_readiness="existing_proxy_outcomes",
        recommended_lane="finish_partial",
        recommended_order=8,
        notes=(
            "A safehouse-level notebook scaffold and analytic table already exist via "
            "`safehouse_outcomes`."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="resource_demand_prediction",
        display_name="Resource Demand Prediction",
        domain="strategic_planning",
        framing="predictive",
        primary_dataset="safehouse_features",
        adjacent_assets=("safehouse_outcomes",),
        target_readiness="new_label_needed",
        recommended_lane="later_strategic",
        recommended_order=9,
        notes=(
            "The safehouse table is ready, but a forward-looking demand label still "
            "needs to be designed."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="capacity_pressure_prediction",
        display_name="Capacity Pressure Prediction",
        domain="strategic_planning",
        framing="predictive",
        primary_dataset="safehouse_features",
        adjacent_assets=("safehouse_outcomes",),
        target_readiness="existing_proxy_outcomes",
        recommended_lane="later_strategic",
        recommended_order=10,
        notes=(
            "Can start from `capacity_utilization_ratio` and occupancy signals already "
            "in `safehouse_features`."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="donation_allocation_impact_explanation",
        display_name="Donation Allocation Impact Explanation",
        domain="strategic_planning",
        framing="explanatory",
        primary_dataset="safehouse_features",
        secondary_datasets=("campaign_features", "supporter_features"),
        adjacent_assets=("donation_uplift", "safehouse_outcomes"),
        target_readiness="existing_proxy_outcomes",
        recommended_lane="later_strategic",
        recommended_order=15,
        notes=(
            "Strong donor-to-outcome story potential, but it spans multiple current "
            "branches and should follow the faster donor/outreach work."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="public_impact_forecasting",
        display_name="Public Impact Forecasting",
        domain="strategic_planning",
        framing="forecasting",
        primary_dataset="public_impact_snapshots_raw",
        adjacent_assets=("safehouse_outcomes",),
        target_readiness="raw_table_only",
        recommended_lane="later_strategic",
        recommended_order=16,
        notes=(
            "The raw table exists, but there is no shared processed public-impact table "
            "yet."
        ),
    ),
    ExpansionCandidate(
        expansion_slug="donor_to_impact_personalization_model",
        display_name="Donor-to-Impact Personalization Model",
        domain="strategic_planning",
        framing="personalization",
        primary_dataset="supporter_features",
        secondary_datasets=("campaign_features", "safehouse_features"),
        adjacent_assets=("donor_retention", "donation_uplift", "safehouse_outcomes"),
        target_readiness="new_label_needed",
        recommended_lane="later_strategic",
        recommended_order=17,
        notes=(
            "High-value long-term idea, but it depends on several branches and a new "
            "personalization target definition."
        ),
    ),
)


def _read_csv_if_exists(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def _join_unique(values: list[str] | tuple[str, ...]) -> str:
    items = [str(value) for value in values if value]
    return "; ".join(dict.fromkeys(items))


def _coerce_bool(value: bool) -> str:
    return "yes" if value else "no"


def _dataset_names(candidate: ExpansionCandidate) -> tuple[str, ...]:
    return (candidate.primary_dataset, *candidate.secondary_datasets)


def load_dataset_summary() -> pd.DataFrame:
    """Return the Phase 2 dataset summary table."""

    path = REPORTS_TABLES_DIR / "phase2_dataset_summary.csv"
    return _read_csv_if_exists(path)


def load_label_inventory() -> pd.DataFrame:
    """Return grouped label columns per dataset from the Phase 2 catalog."""

    feature_catalog = _read_csv_if_exists(REPORTS_TABLES_DIR / "phase2_feature_catalog.csv")
    if feature_catalog.empty:
        return pd.DataFrame(columns=["dataset", "label_columns"])

    labels = feature_catalog.loc[feature_catalog["feature_role"] == "label"].copy()
    if labels.empty:
        return pd.DataFrame(columns=["dataset", "label_columns"])

    inventory = (
        labels.groupby("dataset")["feature_name"]
        .agg(lambda values: _join_unique(sorted(values)))
        .reset_index(name="label_columns")
        .sort_values("dataset")
        .reset_index(drop=True)
    )
    return inventory


def _label_map() -> dict[str, str]:
    inventory = load_label_inventory()
    if inventory.empty:
        return {}
    return dict(zip(inventory["dataset"], inventory["label_columns"], strict=False))


def _phase3_metrics_map() -> dict[str, dict[str, object]]:
    summary = _read_csv_if_exists(REPORTS_DIR / "evaluation" / "phase3_predictive_summary.csv")
    if summary.empty:
        return {}
    return {
        str(row["pipeline_name"]): row.to_dict()
        for _, row in summary.iterrows()
    }


def _dataset_summary_map() -> dict[str, dict[str, object]]:
    summary = load_dataset_summary()
    if summary.empty:
        return {}
    return {
        str(row["dataset"]): row.to_dict()
        for _, row in summary.iterrows()
    }


def build_current_pipeline_inventory() -> pd.DataFrame:
    """Inventory current notebook and predictive pipeline assets."""

    dataset_summary = _dataset_summary_map()
    labels_by_dataset = _label_map()
    phase3_metrics = _phase3_metrics_map()
    rows: list[dict[str, object]] = []

    for pipeline_name in sorted(NOTEBOOK_PIPELINES):
        spec = get_notebook_pipeline_spec(pipeline_name)
        predictive_impl = spec["predictive_impl"]
        config_target = ""
        if predictive_impl:
            config = load_predictive_pipeline_config(str(predictive_impl))
            config_target = str(config["target"])

        model_dir = MODELS_DIR / pipeline_name
        notebooks_ready = (
            Path(spec["predictive_notebook_path"]).exists()
            and Path(spec["explanatory_notebook_path"]).exists()
        )
        payload_examples_ready = all(
            (APP_INTEGRATION_ROOT / "payload_examples" / f"{pipeline_name}_{suffix}.json").exists()
            for suffix in ("manifest", "request", "response")
        )
        predictive_artifacts_ready = all(
            (model_dir / asset_name).exists()
            for asset_name in (
                "predictive_model.joblib",
                "feature_list.json",
                "metrics.json",
                "model_comparison.csv",
                "explainability.csv",
            )
        )

        dataset_name = str(spec["dataset_name"])
        dataset_meta = dataset_summary.get(dataset_name, {})
        metrics = phase3_metrics.get(pipeline_name, {})

        stage = (
            "implemented_predictive"
            if predictive_impl and predictive_artifacts_ready
            else "notebook_scaffold"
        )
        rows.append(
            {
                "pipeline_name": pipeline_name,
                "display_name": spec["display_name"],
                "stage": stage,
                "shared_dataset": dataset_name,
                "dataset_rows": dataset_meta.get("row_count", ""),
                "dataset_columns": dataset_meta.get("column_count", ""),
                "available_label_columns": labels_by_dataset.get(dataset_name, ""),
                "predictive_target": config_target,
                "notebooks_ready": _coerce_bool(notebooks_ready),
                "predictive_implementation": _coerce_bool(bool(predictive_impl)),
                "predictive_artifacts_ready": _coerce_bool(predictive_artifacts_ready),
                "payload_examples_ready": _coerce_bool(payload_examples_ready),
                "best_model_name": metrics.get("best_model_name", ""),
                "roc_auc": metrics.get("roc_auc", ""),
                "average_precision": metrics.get("average_precision", ""),
            }
        )

    inventory = pd.DataFrame(rows)
    if inventory.empty:
        return inventory

    stage_order = {
        "implemented_predictive": 0,
        "notebook_scaffold": 1,
    }
    inventory["_stage_order"] = inventory["stage"].map(stage_order).fillna(99)
    inventory = (
        inventory.sort_values(["_stage_order", "pipeline_name"])
        .drop(columns="_stage_order")
        .reset_index(drop=True)
    )
    return inventory


def build_completed_vs_next_matrix() -> pd.DataFrame:
    """Map expansion-plan ideas to what is already built or adjacent in the repo."""

    labels_by_dataset = _label_map()
    current_inventory = build_current_pipeline_inventory().set_index("pipeline_name")
    rows: list[dict[str, object]] = []

    for candidate in EXPANSION_PORTFOLIO:
        exact_match = candidate.exact_match_pipeline
        all_current_assets = tuple(
            asset
            for asset in (
                *((exact_match,) if exact_match else ()),
                *candidate.adjacent_assets,
            )
            if asset
        )

        status = "next"
        if exact_match and exact_match in current_inventory.index:
            stage = str(current_inventory.loc[exact_match, "stage"])
            status = "implemented" if stage == "implemented_predictive" else "partial"

        dataset_labels = [
            labels_by_dataset.get(dataset_name, "")
            for dataset_name in _dataset_names(candidate)
            if dataset_name in labels_by_dataset
        ]

        rows.append(
            {
                "recommended_order": candidate.recommended_order,
                "expansion_pipeline": candidate.display_name,
                "expansion_slug": candidate.expansion_slug,
                "domain": candidate.domain,
                "framing": candidate.framing,
                "status": status,
                "recommended_lane": candidate.recommended_lane,
                "primary_dataset": candidate.primary_dataset,
                "secondary_datasets": _join_unique(list(candidate.secondary_datasets)),
                "current_repo_assets": _join_unique(list(all_current_assets)),
                "target_readiness": candidate.target_readiness,
                "existing_label_columns": _join_unique(dataset_labels),
                "notes": candidate.notes,
            }
        )

    matrix = pd.DataFrame(rows)
    if matrix.empty:
        return matrix

    status_order = {"implemented": 0, "partial": 1, "next": 2}
    matrix["_status_order"] = matrix["status"].map(status_order).fillna(99)
    matrix = (
        matrix.sort_values(["_status_order", "recommended_order", "expansion_pipeline"])
        .drop(columns="_status_order")
        .reset_index(drop=True)
    )
    return matrix


def build_reuse_map() -> pd.DataFrame:
    """Describe which shared assets can accelerate each expansion candidate."""

    dataset_summary = _dataset_summary_map()
    labels_by_dataset = _label_map()
    current_inventory = build_current_pipeline_inventory().set_index("pipeline_name")
    rows: list[dict[str, object]] = []

    for candidate in EXPANSION_PORTFOLIO:
        dataset_names = _dataset_names(candidate)
        datasets_present = [name for name in dataset_names if name in dataset_summary]
        exact_stage = ""
        if candidate.exact_match_pipeline and candidate.exact_match_pipeline in current_inventory.index:
            exact_stage = str(current_inventory.loc[candidate.exact_match_pipeline, "stage"])

        adjacent_stage_count = sum(asset in current_inventory.index for asset in candidate.adjacent_assets)
        reuse_score = (
            4 * len(datasets_present)
            + 2 * len(candidate.adjacent_assets)
            + TARGET_READINESS_POINTS[candidate.target_readiness]
            + LANE_PRIORITY_POINTS[candidate.recommended_lane]
            + (2 if exact_stage == "notebook_scaffold" else 0)
            + (3 if exact_stage == "implemented_predictive" else 0)
            + (1 if candidate.domain in {"donor_growth", "outreach_optimization"} else 0)
            + adjacent_stage_count
        )

        feature_modules = []
        for dataset_name in dataset_names:
            feature_modules.extend(FEATURE_MODULE_BY_DATASET.get(dataset_name, ()))

        delivery_assets = {
            "risk_badge_widget",
            "ranked_table_widget",
            "explanation_chart_card",
            "insight_summary_card",
            "recommendation_panel",
        }
        for asset_name in candidate.adjacent_assets:
            if asset_name in PREDICTIVE_PIPELINES:
                delivery_assets.update(PREDICTIVE_PIPELINES[asset_name]["recommended_widgets"])
        if candidate.exact_match_pipeline and candidate.exact_match_pipeline in PREDICTIVE_PIPELINES:
            delivery_assets.update(
                PREDICTIVE_PIPELINES[candidate.exact_match_pipeline]["recommended_widgets"]
            )

        label_columns = [
            labels_by_dataset.get(dataset_name, "")
            for dataset_name in dataset_names
            if dataset_name in labels_by_dataset
        ]
        notebook_assets = [
            str(NOTEBOOKS_ROOT / str(NOTEBOOK_PIPELINES[asset]["slug"]))
            for asset in dict.fromkeys(
                [
                    *((candidate.exact_match_pipeline,) if candidate.exact_match_pipeline else ()),
                    *candidate.adjacent_assets,
                ]
            )
            if asset in NOTEBOOK_PIPELINES
        ]

        rows.append(
            {
                "expansion_pipeline": candidate.display_name,
                "expansion_slug": candidate.expansion_slug,
                "primary_dataset": candidate.primary_dataset,
                "existing_shared_datasets": _join_unique(list(datasets_present)),
                "existing_label_columns": _join_unique(label_columns),
                "nearest_current_assets": _join_unique(
                    [
                        *((candidate.exact_match_pipeline,) if candidate.exact_match_pipeline else ()),
                        *candidate.adjacent_assets,
                    ]
                ),
                "feature_builder_modules": _join_unique(feature_modules),
                "modeling_helpers": _join_unique(list(MODELING_HELPERS)),
                "notebook_and_delivery_helpers": _join_unique(
                    [*NOTEBOOK_AND_DELIVERY_HELPERS, *notebook_assets]
                ),
                "delivery_patterns": _join_unique(sorted(delivery_assets)),
                "reuse_score": reuse_score,
                "recommended_lane": candidate.recommended_lane,
                "notes": candidate.notes,
            }
        )

    reuse_map = pd.DataFrame(rows)
    if reuse_map.empty:
        return reuse_map

    reuse_map = reuse_map.sort_values(
        ["reuse_score", "expansion_pipeline"],
        ascending=[False, True],
    ).reset_index(drop=True)
    return reuse_map


def _markdown_table(frame: pd.DataFrame) -> str:
    if frame.empty:
        return "_No rows generated._"

    string_frame = frame.fillna("").astype(str)
    headers = list(string_frame.columns)
    header_row = "| " + " | ".join(headers) + " |"
    separator_row = "| " + " | ".join("---" for _ in headers) + " |"
    body_rows = [
        "| " + " | ".join(row) + " |"
        for row in string_frame.itertuples(index=False, name=None)
    ]
    return "\n".join([header_row, separator_row, *body_rows])


def build_markdown_report(
    current_inventory: pd.DataFrame | None = None,
    matrix: pd.DataFrame | None = None,
    reuse_map: pd.DataFrame | None = None,
) -> str:
    """Render the human-readable Phase A audit summary."""

    current_inventory = (
        build_current_pipeline_inventory() if current_inventory is None else current_inventory
    )
    matrix = build_completed_vs_next_matrix() if matrix is None else matrix
    reuse_map = build_reuse_map() if reuse_map is None else reuse_map
    label_inventory = load_label_inventory()
    dataset_summary = load_dataset_summary()

    completed_count = int((current_inventory["stage"] == "implemented_predictive").sum())
    scaffold_count = int((current_inventory["stage"] == "notebook_scaffold").sum())
    figure_count = len(list((REPORTS_DIR / "figures" / "phase1").glob("*.png")))
    evaluation_report_count = len(list((REPORTS_DIR / "evaluation").glob("*")))
    build_now = matrix.loc[matrix["recommended_lane"] == "build_now"].copy()
    top_reuse = reuse_map.loc[
        reuse_map["recommended_lane"].isin(
            ["finish_partial", "build_now", "build_after_donor_wave"]
        )
    ].head(6)
    partials = matrix.loc[matrix["status"] == "partial"].copy()

    report_lines = [
        "# Phase A Expansion Audit",
        "",
        "## Review Summary",
        (
            f"- The repo is already beyond the baseline assumed in `plan-expansion.md`: "
            f"{completed_count} predictive pipelines are implemented end to end and "
            f"{scaffold_count} more notebook tracks are scaffolded."
        ),
        (
            "- Phase A should therefore audit predictive implementations, model artifacts, "
            "payload manifests, and notebook-only tracks, not just notebook folders."
        ),
        (
            "- The fastest net-new expansion still sits in the donor and outreach branch, "
            "because those areas already have shared tables, labels, notebooks, and app "
            "delivery patterns."
        ),
        "",
        "## Current Pipeline Inventory",
        _markdown_table(
            current_inventory[
                [
                    "display_name",
                    "stage",
                    "shared_dataset",
                    "predictive_target",
                    "notebooks_ready",
                    "predictive_artifacts_ready",
                    "payload_examples_ready",
                ]
            ]
        ),
        "",
        "## Completed Target Labels",
        _markdown_table(label_inventory),
        "",
        "## Shared Analytic Tables",
        _markdown_table(dataset_summary),
        "",
        "## Reusable Helpers And Visuals",
        "- Shared feature builders: `ml/src/features/donor_features.py`, "
        "`ml/src/features/social_features.py`, `ml/src/features/resident_features.py`, "
        "`ml/src/features/safehouse_features.py`.",
        "- Shared modeling and validation helpers: `ml/src/pipelines/common.py`, "
        "`ml/src/modeling/train.py`, `ml/src/modeling/metrics.py`, "
        "`ml/src/modeling/validation.py`.",
        "- Notebook and delivery helpers: `ml/scripts/build_phase5_notebooks.py`, "
        "`ml/scripts/export_for_api.py`, `ml/src/inference/predict.py`, "
        "`ml/src/inference/batch_score.py`.",
        (
            f"- Existing visuals and report artifacts: {figure_count} Phase 1 figures in "
            f"`ml/reports/figures/phase1/` and {evaluation_report_count} evaluation files "
            "under `ml/reports/evaluation/`."
        ),
        "",
        "## Partial Tracks Worth Finishing",
        _markdown_table(
            partials[
                [
                    "expansion_pipeline",
                    "primary_dataset",
                    "current_repo_assets",
                    "notes",
                ]
            ]
        )
        if not partials.empty
        else "_No partial expansion tracks were detected._",
        "",
        "## Best Net-New Expansion Targets",
        _markdown_table(
            build_now[
                [
                    "recommended_order",
                    "expansion_pipeline",
                    "primary_dataset",
                    "current_repo_assets",
                    "target_readiness",
                    "notes",
                ]
            ]
        ),
        "",
        "## Highest Reuse Scores Among Near-Term Candidates",
        _markdown_table(
            top_reuse[
                [
                    "expansion_pipeline",
                    "primary_dataset",
                    "nearest_current_assets",
                    "reuse_score",
                    "recommended_lane",
                ]
            ]
        ),
        "",
        "## Output Files",
        "- `ml/reports/tables/phase_a_completed_vs_next_matrix.csv`",
        "- `ml/reports/tables/phase_a_reuse_map.csv`",
        "- `ml/docs/phase-a-expansion-audit.md`",
    ]
    return "\n".join(report_lines) + "\n"


def write_phase_a_outputs(
    *,
    tables_dir: Path = REPORTS_TABLES_DIR,
    docs_dir: Path = ML_ROOT / "docs",
) -> dict[str, Path]:
    """Write the Phase A matrix, reuse map, and markdown audit report."""

    tables_dir.mkdir(parents=True, exist_ok=True)
    docs_dir.mkdir(parents=True, exist_ok=True)

    current_inventory = build_current_pipeline_inventory()
    matrix = build_completed_vs_next_matrix()
    reuse_map = build_reuse_map()

    matrix_path = tables_dir / "phase_a_completed_vs_next_matrix.csv"
    reuse_map_path = tables_dir / "phase_a_reuse_map.csv"
    report_path = docs_dir / "phase-a-expansion-audit.md"

    matrix.to_csv(matrix_path, index=False)
    reuse_map.to_csv(reuse_map_path, index=False)
    report_path.write_text(
        build_markdown_report(
            current_inventory=current_inventory,
            matrix=matrix,
            reuse_map=reuse_map,
        ),
        encoding="utf-8",
    )

    return {
        "matrix": matrix_path,
        "reuse_map": reuse_map_path,
        "report": report_path,
    }


def main() -> None:
    """Generate the Phase A audit outputs in the repo."""

    outputs = write_phase_a_outputs()
    print("Wrote Phase A expansion audit outputs:")
    for label, path in outputs.items():
        print(f"- {label}: {path}")


__all__ = [
    "build_completed_vs_next_matrix",
    "build_current_pipeline_inventory",
    "build_markdown_report",
    "build_reuse_map",
    "load_dataset_summary",
    "load_label_inventory",
    "main",
    "write_phase_a_outputs",
]
