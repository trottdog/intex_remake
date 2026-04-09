"""Join logic across source tables."""

from __future__ import annotations

import pandas as pd

from ml.src.data.schemas import FOREIGN_KEYS, TABLE_METADATA, primary_key_for

CORE_JOIN_PATHS = {
    "donor_branch": [
        "supporters.supporter_id -> donations.supporter_id",
        "donations.donation_id -> donation_allocations.donation_id",
        "donation_allocations.safehouse_id -> safehouses.safehouse_id",
        "donations.referral_post_id -> social_media_posts.post_id",
    ],
    "resident_branch": [
        "safehouses.safehouse_id -> residents.safehouse_id",
        "residents.resident_id -> process_recordings.resident_id",
        "residents.resident_id -> home_visitations.resident_id",
        "residents.resident_id -> education_records.resident_id",
        "residents.resident_id -> health_wellbeing_records.resident_id",
        "residents.resident_id -> intervention_plans.resident_id",
        "residents.resident_id -> incident_reports.resident_id",
    ],
    "partner_branch": [
        "partners.partner_id -> partner_assignments.partner_id",
        "partner_assignments.safehouse_id -> safehouses.safehouse_id",
    ],
    "reporting_branch": [
        "safehouses.safehouse_id -> safehouse_monthly_metrics.safehouse_id",
        "public_impact_snapshots is a derived public rollup and should not be joined back to row-level training data.",
    ],
}


def relationship_map_frame() -> pd.DataFrame:
    """Return a machine-readable relationship map."""

    rows: list[dict[str, str]] = []

    for source_table, foreign_keys in FOREIGN_KEYS.items():
        for source_column, target_table in foreign_keys.items():
            rows.append(
                {
                    "source_table": source_table,
                    "source_domain": TABLE_METADATA[source_table]["domain"],
                    "source_key": source_column,
                    "target_table": target_table,
                    "target_domain": TABLE_METADATA[target_table]["domain"],
                    "target_key": primary_key_for(target_table) or "",
                    "relationship": "many_to_one",
                }
            )

    return pd.DataFrame(rows).sort_values(
        ["source_table", "source_key"]
    ).reset_index(drop=True)
