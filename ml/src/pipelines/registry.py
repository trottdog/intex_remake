"""Registry helpers for runnable ML pipelines."""

from __future__ import annotations

from importlib import import_module
from pathlib import Path

import pandas as pd

from ml.src.config.paths import ML_ROOT

PIPELINES_ROOT = Path(__file__).resolve().parent
NOTEBOOKS_ROOT = ML_ROOT / "ml-pipelines"
APP_INTEGRATION_ROOT = ML_ROOT / "app-integration"

PREDICTIVE_PIPELINES: dict[str, dict[str, object]] = {
    "best_posting_time": {
        "display_name": "Best Posting Time",
        "slug": "best-posting-time",
        "train_module": "ml.src.pipelines.best_posting_time.train_predictive",
        "build_module": "ml.src.pipelines.best_posting_time.build_dataset",
        "id_columns": ["post_id"],
        "shared_dataset": "post_features",
        "business_question": "When should the team post to maximize donation-linked outcomes?",
        "recommended_widgets": [
            "recommendation_panel",
            "insight_summary_card",
            "ranked_table_widget",
        ],
    },
    "capacity_pressure": {
        "display_name": "Capacity Pressure",
        "slug": "capacity-pressure",
        "train_module": "ml.src.pipelines.capacity_pressure.train_predictive",
        "build_module": "ml.src.pipelines.capacity_pressure.build_dataset",
        "id_columns": ["safehouse_id"],
        "shared_dataset": "safehouse_monthly_features",
        "business_question": "Which safehouses are most likely to be near or above practical capacity next month?",
        "recommended_widgets": [
            "risk_badge_widget",
            "insight_summary_card",
            "recommendation_panel",
        ],
    },
    "case_prioritization": {
        "display_name": "Case Prioritization",
        "slug": "case-prioritization",
        "train_module": "ml.src.pipelines.case_prioritization.train_predictive",
        "build_module": "ml.src.pipelines.case_prioritization.build_dataset",
        "id_columns": ["resident_id", "safehouse_id"],
        "shared_dataset": "resident_monthly_features",
        "business_question": "Which residents most urgently need staff follow-up in the next 60 days?",
        "recommended_widgets": [
            "ranked_table_widget",
            "recommendation_panel",
            "insight_summary_card",
        ],
    },
    "counseling_progress": {
        "display_name": "Counseling Progress",
        "slug": "counseling-progress",
        "train_module": "ml.src.pipelines.counseling_progress.train_predictive",
        "build_module": "ml.src.pipelines.counseling_progress.build_dataset",
        "id_columns": ["resident_id", "safehouse_id"],
        "shared_dataset": "resident_monthly_features",
        "business_question": "Which residents in active counseling are most likely to show near-term progress?",
        "recommended_widgets": [
            "insight_summary_card",
            "ranked_table_widget",
            "explanation_chart_card",
        ],
    },
    "donor_upgrade": {
        "display_name": "Donor Upgrade",
        "slug": "donor-upgrade",
        "train_module": "ml.src.pipelines.donor_upgrade.train_predictive",
        "build_module": "ml.src.pipelines.donor_upgrade.build_dataset",
        "id_columns": ["supporter_id"],
        "shared_dataset": "supporter_monthly_features",
        "business_question": "Which current donors are most likely to increase their giving in the next 180 days?",
        "recommended_widgets": [
            "ranked_table_widget",
            "insight_summary_card",
            "recommendation_panel",
        ],
    },
    "donor_retention": {
        "display_name": "Donor Retention",
        "slug": "donor-retention",
        "train_module": "ml.src.pipelines.donor_retention.train_predictive",
        "build_module": "ml.src.pipelines.donor_retention.build_dataset",
        "id_columns": ["supporter_id"],
        "shared_dataset": "supporter_features",
        "business_question": "Which supporters are most at risk of lapsing so outreach can be prioritized?",
        "recommended_widgets": [
            "ranked_table_widget",
            "risk_badge_widget",
            "recommendation_panel",
        ],
    },
    "reintegration_readiness": {
        "display_name": "Reintegration Readiness",
        "slug": "reintegration-readiness",
        "train_module": "ml.src.pipelines.reintegration_readiness.train_predictive",
        "build_module": "ml.src.pipelines.reintegration_readiness.build_dataset",
        "id_columns": ["resident_id", "safehouse_id"],
        "shared_dataset": "resident_monthly_features",
        "business_question": "Which residents look most ready for reintegration planning in the next 90 days?",
        "recommended_widgets": [
            "ranked_table_widget",
            "insight_summary_card",
            "recommendation_panel",
        ],
    },
    "resident_risk": {
        "display_name": "Resident Risk",
        "slug": "resident-risk",
        "train_module": "ml.src.pipelines.resident_risk.train_predictive",
        "build_module": "ml.src.pipelines.resident_risk.build_dataset",
        "id_columns": ["resident_id", "safehouse_id"],
        "shared_dataset": "resident_monthly_features",
        "business_question": "Which residents have elevated short-term incident risk that should trigger earlier intervention?",
        "recommended_widgets": [
            "risk_badge_widget",
            "ranked_table_widget",
            "explanation_chart_card",
        ],
    },
    "education_improvement": {
        "display_name": "Education Improvement",
        "slug": "education-improvement",
        "train_module": "ml.src.pipelines.education_improvement.train_predictive",
        "build_module": "ml.src.pipelines.education_improvement.build_dataset",
        "id_columns": ["resident_id", "safehouse_id"],
        "shared_dataset": "resident_monthly_features",
        "business_question": "Which residents with active education records are most likely to improve academically soon?",
        "recommended_widgets": [
            "insight_summary_card",
            "ranked_table_widget",
            "recommendation_panel",
        ],
    },
    "home_visitation_outcome": {
        "display_name": "Home Visitation Outcome",
        "slug": "home-visitation-outcome",
        "train_module": "ml.src.pipelines.home_visitation_outcome.train_predictive",
        "build_module": "ml.src.pipelines.home_visitation_outcome.build_dataset",
        "id_columns": ["resident_id", "safehouse_id"],
        "shared_dataset": "resident_monthly_features",
        "business_question": "Which residents in the visitation workflow are most likely to show supportive near-term home-visit outcomes?",
        "recommended_widgets": [
            "insight_summary_card",
            "recommendation_panel",
            "ranked_table_widget",
        ],
    },
    "next_donation_amount": {
        "display_name": "Next Donation Amount",
        "slug": "next-donation-amount",
        "train_module": "ml.src.pipelines.next_donation_amount.train_predictive",
        "build_module": "ml.src.pipelines.next_donation_amount.build_dataset",
        "id_columns": ["supporter_id"],
        "shared_dataset": "supporter_monthly_features",
        "business_question": "How much is a donor likely to give next within the next 180 days?",
        "recommended_widgets": [
            "insight_summary_card",
            "ranked_table_widget",
            "recommendation_panel",
        ],
    },
    "resource_demand": {
        "display_name": "Resource Demand",
        "slug": "resource-demand",
        "train_module": "ml.src.pipelines.resource_demand.train_predictive",
        "build_module": "ml.src.pipelines.resource_demand.build_dataset",
        "id_columns": ["safehouse_id"],
        "shared_dataset": "safehouse_monthly_features",
        "business_question": "How many active residents are likely to need support at each safehouse next month?",
        "recommended_widgets": [
            "forecast_widget",
            "insight_summary_card",
            "ranked_table_widget",
        ],
    },
    "social_media_conversion": {
        "display_name": "Social Media Conversion",
        "slug": "social-media-conversion",
        "train_module": "ml.src.pipelines.social_media_conversion.train_predictive",
        "build_module": "ml.src.pipelines.social_media_conversion.build_dataset",
        "id_columns": ["post_id"],
        "shared_dataset": "post_features",
        "business_question": "Which posts are most likely to convert into donation referrals or attributed donation value?",
        "recommended_widgets": [
            "ranked_table_widget",
            "explanation_chart_card",
            "insight_summary_card",
        ],
    },
}

NOTEBOOK_PIPELINES: dict[str, dict[str, object]] = {
    "best_posting_time": {
        "display_name": "Best Posting Time",
        "slug": "best-posting-time",
        "predictive_impl": "best_posting_time",
        "dataset_name": "post_features",
        "predictive_question": "When should the organization post to maximize donation-linked results?",
        "explanatory_question": "Which timing windows and scheduling patterns align with stronger donation-linked post performance?",
        "decision_support": "Choose posting windows and scheduling patterns that improve donation-linked post performance.",
        "primary_users": ["outreach managers", "social media staff"],
        "target_summary": "Current predictive label: `label_donation_referral_positive`, using timing-focused post features.",
        "deployment_notes": [
            "Use a recommendation panel that highlights the strongest posting windows by platform.",
            "Show ranked time slots alongside a short evidence summary rather than a raw probability alone.",
        ],
    },
    "capacity_pressure": {
        "display_name": "Capacity Pressure",
        "slug": "capacity-pressure",
        "predictive_impl": "capacity_pressure",
        "dataset_name": "safehouse_monthly_features",
        "predictive_question": "Which safehouses are most likely to be under capacity strain next month?",
        "explanatory_question": "Which occupancy and service patterns most explain near-term capacity pressure?",
        "decision_support": "Help operations leadership intervene early when a site is likely to approach or exceed practical capacity.",
        "primary_users": ["operations leadership", "program leadership"],
        "target_summary": "Current predictive label: `label_capacity_pressure_next_month`, using safehouse-month occupancy and service patterns to flag next-month near-capacity risk.",
        "deployment_notes": [
            "Use risk badges on safehouse dashboards and a recommendation panel for sites that may need relief.",
            "Pair the risk flag with the latest occupancy context so leaders can see whether the pressure signal is persistent or worsening.",
        ],
    },
    "case_prioritization": {
        "display_name": "Case Prioritization",
        "slug": "case-prioritization",
        "predictive_impl": "case_prioritization",
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents most urgently need staff follow-up in the next 60 days?",
        "explanatory_question": "Which case-management patterns most explain rising near-term follow-up urgency?",
        "decision_support": "Help staff triage limited time toward residents with the strongest short-term follow-up signal.",
        "primary_users": ["case managers", "safehouse leadership"],
        "target_summary": "Current predictive label: `label_case_prioritization_next_60d`, combining future incidents with coordinated counseling and visitation follow-up signals.",
        "deployment_notes": [
            "Use ranked caseload tables during shift handoff and case conference preparation.",
            "Pair the score with a short recommendation panel describing the strongest urgency drivers.",
        ],
    },
    "counseling_progress": {
        "display_name": "Counseling Progress",
        "slug": "counseling-progress",
        "predictive_impl": "counseling_progress",
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents in active counseling are most likely to show near-term progress?",
        "explanatory_question": "Which counseling patterns most explain stronger short-term progress trajectories?",
        "decision_support": "Help social workers spot which support patterns are most associated with near-term counseling progress.",
        "primary_users": ["social workers", "case managers"],
        "target_summary": "Current predictive label: `label_counseling_progress_next_90d`, based on future sessions with strong progress notes, positive end states, and low concern rates.",
        "deployment_notes": [
            "Use a progress card on resident profiles and a ranked view during counseling planning.",
            "Keep the explanation summary close to the score so staff can see which recent patterns matter most.",
        ],
    },
    "content_type_effectiveness": {
        "display_name": "Content Type Effectiveness",
        "slug": "content-type-effectiveness",
        "predictive_impl": None,
        "dataset_name": "post_features",
        "predictive_question": "Which content patterns are most likely to generate meaningful donation-linked outcomes?",
        "explanatory_question": "Which content types create fundraising value instead of vanity engagement?",
        "decision_support": "Shape future content calendars around donation-linked value, not just engagement volume.",
        "primary_users": ["outreach managers", "fundraising leadership"],
        "target_summary": "Explanation-first pipeline using donation-linked post outcomes already present in `post_features`.",
        "recommended_widgets": [
            "explanation_chart_card",
            "insight_summary_card",
            "recommendation_panel",
        ],
        "deployment_notes": [
            "Use explanation cards to compare content topics, media types, and CTA patterns.",
            "Keep this pipeline narrative-first until the team wants an interactive planning surface.",
        ],
    },
    "donation_channel_effectiveness": {
        "display_name": "Donation Channel Effectiveness",
        "slug": "donation-channel-effectiveness",
        "predictive_impl": None,
        "dataset_name": "campaign_features",
        "predictive_question": "Which channels create the most valuable long-term donor outcomes?",
        "explanatory_question": "Which acquisition and donation channels appear to create the strongest long-term donor value?",
        "decision_support": "Help fundraising leadership invest in the channels that create better donor value over time.",
        "primary_users": ["fundraising leadership", "campaign managers"],
        "target_summary": "Explanation-first pipeline using campaign and supporter aggregates rather than a new supervised label.",
        "recommended_widgets": [
            "explanation_chart_card",
            "insight_summary_card",
            "recommendation_panel",
        ],
        "deployment_notes": [
            "Present a channel comparison chart and short recommendation panel in campaign review flows.",
            "Frame the result as channel guidance, not as an individual donor prediction.",
        ],
    },
    "donation_allocation_impact": {
        "display_name": "Donation Allocation Impact",
        "slug": "donation-allocation-impact",
        "predictive_impl": None,
        "dataset_name": "safehouse_monthly_features",
        "predictive_question": "Which allocation patterns appear most associated with stronger safehouse outcomes over time?",
        "explanatory_question": "Which program-area allocations seem to align with better education, health, or stability outcomes?",
        "decision_support": "Help leadership connect allocated donor funds to the strongest operational outcome patterns.",
        "primary_users": ["fundraising leadership", "program leadership"],
        "target_summary": "Explanation-first track using safehouse-month allocations and outcomes rather than a causal or supervised label.",
        "recommended_widgets": [
            "explanation_chart_card",
            "insight_summary_card",
            "recommendation_panel",
        ],
        "deployment_notes": [
            "Use comparative charts that connect program-area funding patterns to later safehouse outcomes.",
            "Keep this notebook explicitly non-causal and frame it as evidence to guide donor storytelling and internal planning.",
        ],
    },
    "donor_upgrade": {
        "display_name": "Donor Upgrade",
        "slug": "donor-upgrade",
        "predictive_impl": "donor_upgrade",
        "dataset_name": "supporter_monthly_features",
        "predictive_question": "Which current donors are most likely to increase their giving in the next 180 days?",
        "explanatory_question": "Which donor history patterns most explain likely giving upgrades?",
        "decision_support": "Prioritize fundraiser outreach toward donors with the strongest upgrade signal.",
        "primary_users": ["fundraisers", "development leadership"],
        "target_summary": "Current predictive label: `label_donor_upgrade_next_180d` from supporter-month snapshots.",
        "deployment_notes": [
            "Use ranked donor lists in fundraiser planning views and donor profile cards.",
            "Pair the upgrade score with a recommendation panel describing why the donor is a strong ask candidate.",
        ],
    },
    "donor_to_impact_personalization": {
        "display_name": "Donor-To-Impact Personalization",
        "slug": "donor-to-impact-personalization",
        "predictive_impl": None,
        "dataset_name": "supporter_features",
        "predictive_question": "What safehouses, program areas, or impact stories should be highlighted for each donor?",
        "explanatory_question": "Which donor history patterns can guide more personalized impact storytelling and outreach?",
        "decision_support": "Document the personalization concept and the data needed to move from donor segments to individualized impact recommendations.",
        "primary_users": ["fundraisers", "donor engagement leads"],
        "target_summary": "Notebook-only track: the current data supports donor affinity exploration, but it does not yet include explicit feedback labels for personalized impact recommendations.",
        "recommended_widgets": [
            "recommendation_panel",
            "insight_summary_card",
            "ranked_table_widget",
        ],
        "deployment_notes": [
            "Use the notebook to define donor affinity segments and the additional feedback loops needed for a future recommendation model.",
            "Keep any app output heuristic and transparent until the team captures recommendation outcomes or interaction feedback.",
        ],
    },
    "education_improvement": {
        "display_name": "Education Improvement",
        "slug": "education-improvement",
        "predictive_impl": "education_improvement",
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents with active education records are most likely to improve soon?",
        "explanatory_question": "Which educational and case-management patterns most explain near-term academic improvement?",
        "decision_support": "Help staff reinforce the education plans and support patterns linked to improvement.",
        "primary_users": ["case managers", "education coordinators"],
        "target_summary": "Current predictive label: `label_education_improvement_next_120d`, based on future attendance gains, progress gains, or a shift to completed status.",
        "deployment_notes": [
            "Show the score in education planning views and student support summaries.",
            "Pair improvement scores with a short explanation so staff can distinguish traction from stall risk.",
        ],
    },
    "home_visitation_outcome": {
        "display_name": "Home Visitation Outcome",
        "slug": "home-visitation-outcome",
        "predictive_impl": "home_visitation_outcome",
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents in the visitation workflow are most likely to show supportive near-term home-visit outcomes?",
        "explanatory_question": "Which visitation patterns and family signals most explain supportive home-visit results?",
        "decision_support": "Support reintegration planning with an early signal about which home environments look more supportive.",
        "primary_users": ["case managers", "reintegration staff"],
        "target_summary": "Current predictive label: `label_supportive_home_visit_next_120d`, using future visitation outcomes with favorable, low-concern, cooperative-home signals.",
        "deployment_notes": [
            "Use a reintegration support card and a ranked table in case conference workflows.",
            "Keep the output framed as planning support rather than a standalone placement decision.",
        ],
    },
    "donor_retention": {
        "display_name": "Donor Retention",
        "slug": "donor-retention",
        "predictive_impl": "donor_retention",
        "dataset_name": "supporter_features",
        "predictive_question": "Who is at risk of donor lapse?",
        "explanatory_question": "Which supporter patterns are most associated with donor lapse and retention?",
        "decision_support": "Prioritize weekly donor-retention outreach and stewardship follow-up.",
        "primary_users": ["fundraisers", "donor engagement leads"],
        "target_summary": "Current predictive label: `label_lapsed_180d` from supporter snapshots.",
        "deployment_notes": [
            "Surface the score on donor profiles and fundraiser queue views.",
            "Pair the ranked list with a recommendation panel for retention action planning.",
        ],
    },
    "reintegration_readiness": {
        "display_name": "Reintegration Readiness",
        "slug": "reintegration-readiness",
        "predictive_impl": "reintegration_readiness",
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents are most ready for reintegration planning in the next 90 days?",
        "explanatory_question": "Which case-management factors align with successful reintegration readiness?",
        "decision_support": "Focus reintegration planning on residents with the strongest near-term readiness signal.",
        "primary_users": ["case managers", "safehouse leadership"],
        "target_summary": "Current predictive label: `label_reintegration_complete_next_90d` from resident-monthly snapshots.",
        "deployment_notes": [
            "Use ranked lists during case conference prep and discharge planning.",
            "Pair readiness scores with explanation cards so staff can justify next steps.",
        ],
    },
    "resident_risk": {
        "display_name": "Resident Risk",
        "slug": "resident-risk",
        "predictive_impl": "resident_risk",
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents are most likely to experience a near-term incident?",
        "explanatory_question": "Which care and safety signals most explain elevated resident risk?",
        "decision_support": "Trigger earlier staff intervention for residents with elevated short-term safety risk.",
        "primary_users": ["case managers", "operations staff"],
        "target_summary": "Current predictive label: `label_incident_next_30d` from resident-monthly snapshots.",
        "deployment_notes": [
            "Expose risk badges in resident detail views and triage dashboards.",
            "Use the same explanation card in watchlists and alert workflows.",
        ],
    },
    "social_media_conversion": {
        "display_name": "Social Media Conversion",
        "slug": "social-media-conversion",
        "predictive_impl": "social_media_conversion",
        "dataset_name": "post_features",
        "predictive_question": "Which posts are most likely to drive donation referrals?",
        "explanatory_question": "Which content and engagement patterns explain donation conversion differences across posts?",
        "decision_support": "Prioritize outreach content and posting strategies that are most likely to convert.",
        "primary_users": ["outreach managers", "fundraising leadership"],
        "target_summary": "Current predictive label: `label_donation_referral_positive` from post-level social data.",
        "deployment_notes": [
            "Show top-converting post candidates in outreach planning views.",
            "Use explanation cards to separate donation-linked impact from vanity engagement metrics.",
        ],
    },
    "donation_uplift": {
        "display_name": "Donation Uplift",
        "slug": "donation-uplift",
        "predictive_impl": None,
        "dataset_name": "campaign_features",
        "predictive_question": "Which campaign or outreach treatments most increase donation lift?",
        "explanatory_question": "Which campaign design choices best explain donation uplift?",
        "decision_support": "Guide campaign design choices toward treatments that lift donations instead of just activity.",
        "primary_users": ["campaign managers", "fundraising leadership"],
        "target_summary": "Candidate target: campaign-period lift in donation value, donor count, or average gift.",
        "recommended_widgets": [
            "explanation_chart_card",
            "insight_summary_card",
            "recommendation_panel",
        ],
        "deployment_notes": [
            "Use explanation charts in campaign planning and post-campaign review pages.",
            "Publish a short recommendation panel rather than an individual donor score.",
        ],
    },
    "next_donation_amount": {
        "display_name": "Next Donation Amount",
        "slug": "next-donation-amount",
        "predictive_impl": "next_donation_amount",
        "dataset_name": "supporter_monthly_features",
        "predictive_question": "How much is a donor likely to give next within the next 180 days?",
        "explanatory_question": "Which donor patterns most explain expected next-gift size?",
        "decision_support": "Support donor prioritization and planning with an expected next-gift value estimate.",
        "primary_users": ["fundraisers", "development leadership"],
        "target_summary": "Current regression target: `label_next_monetary_amount_180d` from supporter-month snapshots with a future monetary donation.",
        "deployment_notes": [
            "Show an expected-gift card on donor detail pages and fundraiser planning tables.",
            "Pair the amount estimate with an explanation summary so staff understand the main drivers.",
        ],
    },
    "public_impact_forecasting": {
        "display_name": "Public Impact Forecasting",
        "slug": "public-impact-forecasting",
        "predictive_impl": None,
        "dataset_name": "public_impact_features",
        "predictive_question": "What public-facing impact metrics are likely next period?",
        "explanatory_question": "How are public impact metrics trending, and what would a credible forecast need from the current data?",
        "decision_support": "Give leadership a trend-and-forecast notebook while the current public-impact history remains too small for a strong production model.",
        "primary_users": ["executive leadership", "communications staff"],
        "target_summary": "Notebook-only track: `public_impact_features` now parses the reporting series, but the historical sample is still too small and unstable for a strong production forecast.",
        "recommended_widgets": [
            "forecast_widget",
            "insight_summary_card",
            "explanation_chart_card",
        ],
        "deployment_notes": [
            "Use the notebook to show trend lines, simple benchmark forecasts, and the caveats behind them.",
            "Keep this exploratory until the team accumulates enough monthly history for a more defensible forecasting model.",
        ],
    },
    "resource_demand": {
        "display_name": "Resource Demand",
        "slug": "resource-demand",
        "predictive_impl": "resource_demand",
        "dataset_name": "safehouse_monthly_features",
        "predictive_question": "How many active residents are likely to need support at each safehouse next month?",
        "explanatory_question": "Which safehouse patterns most explain rising or falling near-term demand?",
        "decision_support": "Support staffing and fundraising planning with a forecast of near-term resident demand by site.",
        "primary_users": ["operations leadership", "fundraising leadership"],
        "target_summary": "Current regression target: `label_next_active_residents`, forecasting next-month resident load from safehouse-month patterns.",
        "deployment_notes": [
            "Use a forecast widget and ranked planning table in monthly operations reviews.",
            "Pair the forecast with recent occupancy context so leaders can see whether the demand signal reflects a sustained load or a temporary shift.",
        ],
    },
    "recurring_donor_conversion": {
        "display_name": "Recurring Donor Conversion",
        "slug": "recurring-donor-conversion",
        "predictive_impl": None,
        "dataset_name": "supporter_monthly_features",
        "predictive_question": "Which one-time donors are most likely to become recurring donors?",
        "explanatory_question": "What donor patterns would matter most if the team later captures a strong recurring-conversion target?",
        "decision_support": "Document the recurring-conversion concept and current data gap without forcing a weak predictive model.",
        "primary_users": ["fundraisers", "development leadership"],
        "target_summary": "Current data issue: recurring donations begin on first donation for the few recurring supporters, so a future conversion label is effectively absent in the available data.",
        "recommended_widgets": [
            "insight_summary_card",
            "recommendation_panel",
        ],
        "deployment_notes": [
            "Keep this as a notebook-only research track until the source data captures real recurring-conversion transitions.",
            "Use the notebook to document the target gap and propose what additional event history would unlock the model.",
        ],
    },
    "safehouse_outcomes": {
        "display_name": "Safehouse Outcomes",
        "slug": "safehouse-outcomes",
        "predictive_impl": None,
        "dataset_name": "safehouse_features",
        "predictive_question": "Which safehouse conditions are most predictive of stronger resident outcomes?",
        "explanatory_question": "Which safehouse-level factors best explain differences in outcomes across locations?",
        "decision_support": "Highlight safehouse-level operating patterns that leadership should reinforce or investigate.",
        "primary_users": ["program leadership", "operations leadership"],
        "target_summary": "Candidate target: safehouse-level resident outcome or operating-performance composite.",
        "recommended_widgets": [
            "explanation_chart_card",
            "insight_summary_card",
            "ranked_table_widget",
        ],
        "deployment_notes": [
            "Use comparative charts in leadership review dashboards.",
            "Surface a short insight card for locations that warrant follow-up.",
        ],
    },
    "wellbeing_deterioration": {
        "display_name": "Wellbeing Deterioration",
        "slug": "wellbeing-deterioration",
        "predictive_impl": None,
        "dataset_name": "resident_monthly_features",
        "predictive_question": "Which residents show early signs of declining wellbeing?",
        "explanatory_question": "Which care patterns and recent signals align with worsening wellbeing across resident snapshots?",
        "decision_support": "Document the wellbeing-deterioration concept while the current future-health target remains too sparse for a strong production model.",
        "primary_users": ["case managers", "health and wellbeing staff"],
        "target_summary": "Notebook-only track: `label_wellbeing_deterioration_next_90d` exists in the shared table, but the eligible future-health sample is still sparse enough that this phase keeps the work explanatory-first.",
        "recommended_widgets": [
            "risk_badge_widget",
            "insight_summary_card",
            "recommendation_panel",
        ],
        "deployment_notes": [
            "Use the notebook to document early warning patterns and the current sample-size limitation.",
            "Treat this as a research track until the program captures denser forward health follow-up data.",
        ],
    },
}


def list_predictive_pipelines() -> list[str]:
    """Return all registered predictive pipelines."""

    return sorted(PREDICTIVE_PIPELINES)


def run_predictive_pipeline(pipeline_name: str) -> dict[str, object]:
    """Run one registered predictive pipeline and return its metrics."""

    try:
        module_path = str(PREDICTIVE_PIPELINES[pipeline_name]["train_module"])
    except KeyError as exc:
        valid = ", ".join(list_predictive_pipelines())
        raise ValueError(f"Unknown pipeline '{pipeline_name}'. Valid options: {valid}") from exc

    module = import_module(module_path)
    metrics = module.train_predictive_model()
    return {"pipeline_name": pipeline_name, **metrics}


def run_predictive_pipelines(
    pipeline_names: list[str] | None = None,
) -> pd.DataFrame:
    """Run a set of registered predictive pipelines and return a summary frame."""

    selected = pipeline_names or list_predictive_pipelines()
    rows = [run_predictive_pipeline(name) for name in selected]
    return pd.DataFrame(rows).sort_values("pipeline_name").reset_index(drop=True)


def build_predictive_dataset(
    pipeline_name: str,
    *,
    save_output: bool = True,
) -> pd.DataFrame:
    """Build the saved modeling dataset for a registered predictive pipeline."""

    try:
        module_path = str(PREDICTIVE_PIPELINES[pipeline_name]["build_module"])
    except KeyError as exc:
        valid = ", ".join(list_predictive_pipelines())
        raise ValueError(f"Unknown pipeline '{pipeline_name}'. Valid options: {valid}") from exc

    module = import_module(module_path)
    return module.build_dataset(save_output=save_output)


def load_predictive_pipeline_config(pipeline_name: str) -> dict[str, object]:
    """Load the config for a registered predictive pipeline."""

    config_path = PIPELINES_ROOT / pipeline_name / "config.yaml"
    if not config_path.exists():
        raise FileNotFoundError(f"Could not find config for pipeline '{pipeline_name}'")

    from ml.src.pipelines.common import load_pipeline_config

    return load_pipeline_config(config_path)


def get_predictive_pipeline_spec(pipeline_name: str) -> dict[str, object]:
    """Return the metadata spec for a predictive pipeline."""

    try:
        spec = PREDICTIVE_PIPELINES[pipeline_name]
    except KeyError as exc:
        valid = ", ".join(list_predictive_pipelines())
        raise ValueError(f"Unknown pipeline '{pipeline_name}'. Valid options: {valid}") from exc

    return {
        **spec,
        "pipeline_name": pipeline_name,
        "notebook_dir": NOTEBOOKS_ROOT / str(spec["slug"]),
        "predictive_notebook_path": NOTEBOOKS_ROOT
        / str(spec["slug"])
        / f"{spec['slug']}-predictive.ipynb",
        "explanatory_notebook_path": NOTEBOOKS_ROOT
        / str(spec["slug"])
        / f"{spec['slug']}-explanatory.ipynb",
    }


def list_notebook_pipelines() -> list[str]:
    """Return all pipeline notebook slugs covered in Phase 5."""

    return sorted(NOTEBOOK_PIPELINES)


def get_notebook_pipeline_spec(pipeline_name: str) -> dict[str, object]:
    """Return the metadata spec for a pipeline notebook set."""

    try:
        spec = NOTEBOOK_PIPELINES[pipeline_name]
    except KeyError as exc:
        valid = ", ".join(list_notebook_pipelines())
        raise ValueError(f"Unknown notebook pipeline '{pipeline_name}'. Valid options: {valid}") from exc

    predictive_impl = spec.get("predictive_impl")
    predictive_spec = (
        PREDICTIVE_PIPELINES[str(predictive_impl)]
        if predictive_impl is not None and str(predictive_impl) in PREDICTIVE_PIPELINES
        else None
    )

    target_summary = spec.get("target_summary")
    if target_summary is None:
        if predictive_impl is not None:
            config = load_predictive_pipeline_config(str(predictive_impl))
            target_summary = f"Current predictive label: `{config['target']}`."
        else:
            target_summary = "Define the target label before training the first model."

    recommended_widgets = spec.get("recommended_widgets")
    if recommended_widgets is None:
        if predictive_spec is not None:
            recommended_widgets = predictive_spec["recommended_widgets"]
        else:
            recommended_widgets = [
                "ranked_table_widget",
                "insight_summary_card",
                "recommendation_panel",
            ]

    deployment_notes = spec.get("deployment_notes") or [
        "Use shared ML endpoints so notebooks and app surfaces stay aligned.",
        "Favor ranked tables, badges, and insight cards over custom UI one-offs.",
    ]

    return {
        **spec,
        "pipeline_name": pipeline_name,
        "target_summary": target_summary,
        "recommended_widgets": list(recommended_widgets),
        "deployment_notes": list(deployment_notes),
        "notebook_dir": NOTEBOOKS_ROOT / str(spec["slug"]),
        "predictive_notebook_path": NOTEBOOKS_ROOT
        / str(spec["slug"])
        / f"{spec['slug']}-predictive.ipynb",
        "explanatory_notebook_path": NOTEBOOKS_ROOT
        / str(spec["slug"])
        / f"{spec['slug']}-explanatory.ipynb",
    }
