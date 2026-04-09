"""Expected source schemas and planning metadata for the ML workspace."""

from __future__ import annotations

from typing import Final

TABLE_METADATA: Final[dict[str, dict[str, str]]] = {
    "safehouses": {
        "domain": "reference",
        "grain": "one row per safehouse",
        "table_level": "entity",
        "primary_key": "safehouse_id",
        "description": "Safehouse locations, capacity, and operating status.",
    },
    "partners": {
        "domain": "reference",
        "grain": "one row per partner",
        "table_level": "entity",
        "primary_key": "partner_id",
        "description": "Organizations or people delivering services.",
    },
    "partner_assignments": {
        "domain": "reference",
        "grain": "one row per partner x safehouse x program area",
        "table_level": "bridge",
        "primary_key": "assignment_id",
        "description": "Links partners to safehouses and program areas.",
    },
    "supporters": {
        "domain": "donor_support",
        "grain": "one row per supporter",
        "table_level": "entity",
        "primary_key": "supporter_id",
        "description": "Supporter master data for donors and contributors.",
    },
    "donations": {
        "domain": "donor_support",
        "grain": "one row per donation event",
        "table_level": "event",
        "primary_key": "donation_id",
        "description": "Monetary and non-monetary donation events.",
    },
    "in_kind_donation_items": {
        "domain": "donor_support",
        "grain": "one row per in-kind line item",
        "table_level": "line_item",
        "primary_key": "item_id",
        "description": "Item-level detail for in-kind donations.",
    },
    "donation_allocations": {
        "domain": "donor_support",
        "grain": "one row per donation x safehouse x program area",
        "table_level": "allocation",
        "primary_key": "allocation_id",
        "description": "Donation value allocated to program areas and sites.",
    },
    "residents": {
        "domain": "case_management",
        "grain": "one row per resident",
        "table_level": "entity",
        "primary_key": "resident_id",
        "description": "Resident case inventory and baseline status.",
    },
    "process_recordings": {
        "domain": "case_management",
        "grain": "one row per counseling session",
        "table_level": "event",
        "primary_key": "recording_id",
        "description": "Counseling session notes and observed progress.",
    },
    "home_visitations": {
        "domain": "case_management",
        "grain": "one row per home or field visit",
        "table_level": "event",
        "primary_key": "visitation_id",
        "description": "Home and field visits for case assessment and follow-up.",
    },
    "education_records": {
        "domain": "case_management",
        "grain": "one row per resident per record date",
        "table_level": "periodic",
        "primary_key": "education_record_id",
        "description": "Education attendance and progress snapshots.",
    },
    "health_wellbeing_records": {
        "domain": "case_management",
        "grain": "one row per resident per record date",
        "table_level": "periodic",
        "primary_key": "health_record_id",
        "description": "Health and wellbeing snapshots.",
    },
    "intervention_plans": {
        "domain": "case_management",
        "grain": "one row per intervention plan",
        "table_level": "plan",
        "primary_key": "plan_id",
        "description": "Structured goals, services, and milestones.",
    },
    "incident_reports": {
        "domain": "case_management",
        "grain": "one row per incident",
        "table_level": "event",
        "primary_key": "incident_id",
        "description": "Safety and behavioral incidents with severity and follow-up.",
    },
    "social_media_posts": {
        "domain": "outreach",
        "grain": "one row per social media post",
        "table_level": "event",
        "primary_key": "post_id",
        "description": "Platform content, timing, engagement, and referrals.",
    },
    "safehouse_monthly_metrics": {
        "domain": "operations",
        "grain": "one row per safehouse per month",
        "table_level": "monthly_aggregate",
        "primary_key": "metric_id",
        "description": "Monthly safehouse rollups for residents and services.",
    },
    "public_impact_snapshots": {
        "domain": "public_reporting",
        "grain": "one row per reporting month",
        "table_level": "monthly_aggregate",
        "primary_key": "snapshot_id",
        "description": "Monthly public-facing rollups for donor communication.",
    },
}

EXPECTED_TABLES: Final[tuple[str, ...]] = tuple(TABLE_METADATA.keys())

DATE_COLUMNS: Final[dict[str, list[str]]] = {
    "safehouses": ["open_date"],
    "partners": ["start_date", "end_date"],
    "partner_assignments": ["assignment_start", "assignment_end"],
    "supporters": ["created_at", "first_donation_date"],
    "donations": ["donation_date"],
    "in_kind_donation_items": [],
    "donation_allocations": ["allocation_date"],
    "residents": [
        "date_of_birth",
        "date_of_admission",
        "date_colb_registered",
        "date_colb_obtained",
        "date_case_study_prepared",
        "date_enrolled",
        "date_closed",
        "created_at",
    ],
    "process_recordings": ["session_date"],
    "home_visitations": ["visit_date"],
    "education_records": ["record_date"],
    "health_wellbeing_records": ["record_date"],
    "intervention_plans": [
        "target_date",
        "case_conference_date",
        "created_at",
        "updated_at",
    ],
    "incident_reports": ["incident_date", "resolution_date"],
    "social_media_posts": ["created_at"],
    "safehouse_monthly_metrics": ["month_start", "month_end"],
    "public_impact_snapshots": ["snapshot_date", "published_at"],
}

FOREIGN_KEYS: Final[dict[str, dict[str, str]]] = {
    "partner_assignments": {
        "partner_id": "partners",
        "safehouse_id": "safehouses",
    },
    "donations": {
        "supporter_id": "supporters",
        "referral_post_id": "social_media_posts",
    },
    "in_kind_donation_items": {"donation_id": "donations"},
    "donation_allocations": {
        "donation_id": "donations",
        "safehouse_id": "safehouses",
    },
    "residents": {"safehouse_id": "safehouses"},
    "process_recordings": {"resident_id": "residents"},
    "home_visitations": {"resident_id": "residents"},
    "education_records": {"resident_id": "residents"},
    "health_wellbeing_records": {"resident_id": "residents"},
    "intervention_plans": {"resident_id": "residents"},
    "incident_reports": {
        "resident_id": "residents",
        "safehouse_id": "safehouses",
    },
    "safehouse_monthly_metrics": {"safehouse_id": "safehouses"},
}

PIPELINE_TARGET_CANDIDATES: Final[list[dict[str, str]]] = [
    {
        "pipeline": "donor_churn",
        "label_candidate": "No donation in the next 180 days after a supporter snapshot date",
        "modeling_grain": "supporter snapshot month",
        "source_tables": "supporters, donations",
        "notes": "Binary lapse label derived from future donation inactivity.",
    },
    {
        "pipeline": "reintegration_readiness",
        "label_candidate": "Reintegration status becomes Completed within the next 90 days",
        "modeling_grain": "resident monthly snapshot",
        "source_tables": "residents, process_recordings, home_visitations, education_records, health_wellbeing_records, intervention_plans",
        "notes": "Use only information available on or before the snapshot date.",
    },
    {
        "pipeline": "social_post_to_donation",
        "label_candidate": "Post generates at least one donation referral or positive referred donation value",
        "modeling_grain": "social media post",
        "source_tables": "social_media_posts, donations",
        "notes": "Suitable for both classification and regression framing.",
    },
    {
        "pipeline": "resident_regression_risk",
        "label_candidate": "Incident occurs or risk level worsens in the next 30 to 60 days",
        "modeling_grain": "resident monthly snapshot",
        "source_tables": "residents, incident_reports, process_recordings, health_wellbeing_records, education_records",
        "notes": "Likely the best resident-risk predictive label.",
    },
    {
        "pipeline": "campaign_effectiveness_explanation",
        "label_candidate": "Campaign-level donation lift, donor count, and average gift size",
        "modeling_grain": "campaign period",
        "source_tables": "donations, donation_allocations, social_media_posts",
        "notes": "Better framed as explanation because campaign identifiers are sparse and attribution is partial.",
    },
    {
        "pipeline": "intervention_effectiveness_explanation",
        "label_candidate": "Change in incidents, progress flags, reintegration progress, or education and health outcomes after plan initiation",
        "modeling_grain": "resident intervention window",
        "source_tables": "intervention_plans, process_recordings, incident_reports, education_records, health_wellbeing_records, home_visitations",
        "notes": "Treat as explanation-first because interventions are selected, not randomly assigned.",
    },
]

LEAKAGE_RISK_NOTES: Final[list[dict[str, str]]] = [
    {
        "area": "resident_outcomes",
        "risky_fields": "reintegration_status, reintegration_type, date_closed, current_risk_level",
        "why_it_leaks": "These fields directly encode the outcome or a late-stage summary that may only be known after the prediction timestamp.",
    },
    {
        "area": "incident_prediction",
        "risky_fields": "resolution_date, resolved, response_taken",
        "why_it_leaks": "These fields exist only after an incident has already happened and staff have responded.",
    },
    {
        "area": "social_conversion",
        "risky_fields": "donation_referrals, estimated_donation_value_php, click_throughs when predicting before publish",
        "why_it_leaks": "They are downstream post-performance outcomes rather than pre-post features.",
    },
    {
        "area": "donor_churn",
        "risky_fields": "first_donation_date, campaign_name, allocation rows created after the snapshot horizon",
        "why_it_leaks": "Snapshot features must be cut off in time or they embed future donation history.",
    },
    {
        "area": "case_notes",
        "risky_fields": "session_narrative, follow_up_actions, observations, notes, notes_restricted",
        "why_it_leaks": "Free text can mention future plans, outcomes, or sensitive details unavailable in a safe production scoring context.",
    },
    {
        "area": "monthly_rollups",
        "risky_fields": "safehouse_monthly_metrics incident_count, process_recording_count, avg_education_progress for the same target month",
        "why_it_leaks": "Same-period aggregates can absorb the very outcome the model is supposed to forecast.",
    },
    {
        "area": "public_reporting",
        "risky_fields": "public_impact_snapshots metric_payload_json, headline, summary_text",
        "why_it_leaks": "These are downstream communications artifacts and should never be modeling features.",
    },
]


def primary_key_for(table_name: str) -> str | None:
    """Return the configured primary key for a table."""

    metadata = TABLE_METADATA.get(table_name)
    return None if metadata is None else metadata["primary_key"]
