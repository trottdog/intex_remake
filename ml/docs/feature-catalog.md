# Feature Catalog

## Purpose

This document summarizes the shared Phase 2 analytic tables. The machine-readable feature dictionary lives in `ml/reports/tables/phase2_feature_catalog.csv`.

Run `py -3 ml/scripts/run_phase2_feature_builds.py` to regenerate the processed datasets and catalog.

## Shared Datasets

### `supporter_features`

One row per supporter.

Key feature groups:

- Supporter profile context: supporter type, relationship type, geography, acquisition channel, status
- Donation lifecycle: first donation, last donation, recency, active span, tenure
- Donation behavior: count, monetary count, non-monetary count, average amount, total value
- Variety features: campaign count, channel diversity, donation type diversity
- Allocation and in-kind behavior: allocated value, safehouse diversity, program diversity, in-kind quantity and category diversity
- Candidate label: `label_lapsed_180d`

### `campaign_features`

One row per campaign per month.

Key feature groups:

- Donation volume: donation count, unique supporter count, total value, average amount
- Mix features: recurring share, channel diversity, donation type diversity
- Allocation context: allocated amount, linked safehouses, program diversity
- Social context: linked post count, platform mix, impressions, reach, engagement, click-throughs, donation referrals
- Calendar features: campaign month, year, quarter

### `post_features`

One row per social media post.

Key feature groups:

- Publishing context: platform, hour, weekday, post type, media type, campaign linkage
- Structured content markers: hashtag count, mention count, CTA, topic, tone, resident story flag
- Performance signals: impressions, reach, likes, comments, shares, saves, clicks, profile visits
- Engineered ratios: click-through rate, engagement per 1k reach, donation value per click, donation referrals per 100 clicks
- Candidate labels: `label_donation_referral_positive`, `label_estimated_donation_value_php`

### `resident_features`

One row per resident.

Key feature groups:

- Case profile: safehouse, case category, referral source, risk levels, reintegration fields
- Derived demographics: age at admission, age at latest observation, computed length of stay
- Vulnerability counts: subcategory flags and family vulnerability flags
- Service history: counseling volume, visit volume, intervention plan counts
- Outcome history: incident counts, latest education progress, latest health scores
- Explanation-oriented outcome fields: current risk and reintegration status remain available, but should be treated carefully during modeling

### `resident_monthly_features`

One row per resident per month.

Key feature groups:

- Snapshot anchors: resident ID, snapshot month, months since admission, age at snapshot
- Recent activity windows: 30-day and 90-day process recordings, incidents, visits, and plans
- Education and health windows: latest known values plus recent rolling averages
- Cumulative context: unresolved incidents, total plans created, plan-category totals
- Candidate labels: `label_incident_next_30d`, `label_reintegration_complete_next_90d`

This is the most important shared table for the resident-related pipelines.

### `safehouse_features`

One row per safehouse.

Key feature groups:

- Capacity and location context
- Resident totals and completion counts
- Donation allocation totals
- Monthly service totals and safehouse incident history

## Modeling Guidance

- Treat columns prefixed with `label_` as labels, not features.
- Treat IDs and date columns as keys or split fields unless a pipeline explicitly engineers them into numeric features.
- Treat current-state resident outcome fields such as `reintegration_status`, `date_closed`, and `current_risk_level` as leakage-risk columns for predictive training.
- Prefer the shared tables as the default pipeline inputs before reaching back into raw event tables.
