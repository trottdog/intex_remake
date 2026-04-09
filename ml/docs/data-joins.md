# Data Joins

## Core Keys

- `safehouse_id` is the site key across operations, residents, allocations, incidents, and monthly rollups.
- `supporter_id` is the donor/supporter key that anchors supporter-level analytics.
- `donation_id` is the event key for donation facts, in-kind items, and allocations.
- `resident_id` is the case-management key across recordings, visitations, education, health, plans, and incidents.
- `partner_id` is the partner key used through `partner_assignments`.
- `post_id` is the outreach key and joins to `donations.referral_post_id` when attribution is available.

## Core Join Paths

### Donor and Campaign Analytics

- `supporters.supporter_id -> donations.supporter_id`
- `donations.donation_id -> donation_allocations.donation_id`
- `donation_allocations.safehouse_id -> safehouses.safehouse_id`
- `donations.referral_post_id -> social_media_posts.post_id`
- `donations.campaign_name <-> social_media_posts.campaign_name`

This branch supports donor churn, campaign effectiveness, donation uplift, and social attribution work.

### Resident and Intervention Analytics

- `safehouses.safehouse_id -> residents.safehouse_id`
- `residents.resident_id -> process_recordings.resident_id`
- `residents.resident_id -> home_visitations.resident_id`
- `residents.resident_id -> education_records.resident_id`
- `residents.resident_id -> health_wellbeing_records.resident_id`
- `residents.resident_id -> intervention_plans.resident_id`
- `residents.resident_id -> incident_reports.resident_id`

This branch supports reintegration readiness, resident risk, and intervention effectiveness.

### Partner and Capacity Context

- `partners.partner_id -> partner_assignments.partner_id`
- `partner_assignments.safehouse_id -> safehouses.safehouse_id`
- `safehouses.safehouse_id -> safehouse_monthly_metrics.safehouse_id`

This branch adds site-level context but should usually be aggregated before joining into entity-level modeling tables.

## Join Assumptions

- Treat `supporters`, `residents`, `safehouses`, and `partners` as entity/master tables.
- Treat `donations`, `process_recordings`, `home_visitations`, `incident_reports`, and `social_media_posts` as event tables that should be aggregated before joining to entity snapshots.
- Treat `education_records`, `health_wellbeing_records`, and `safehouse_monthly_metrics` as time-series snapshots; align them to a clear prediction month before joining.
- Treat `public_impact_snapshots` as public-reporting output, not a training-data input.

## Modeling Guardrails

- Always define a snapshot date before joining event tables.
- Never join future rows from the same entity when building labels.
- Aggregate event tables to the same grain as the modeling dataset before merging.
- Keep `notes`, `notes_restricted`, narratives, and post-outcome fields out of the default feature set until leakage and privacy review is complete.
