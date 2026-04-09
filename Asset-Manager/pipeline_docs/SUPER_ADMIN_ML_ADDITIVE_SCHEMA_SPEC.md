# Super Admin ML — Additive Schema Specification

**Source of truth:** `SUPER_ADMIN_ML_FEATURE_PLAN.md`
**Date:** 2026-04-09
**Scope:** Additive columns only — no existing columns renamed, removed, or altered; no new tables; no SQL produced.

---

## Methodology Notes

- All proposed column names follow the existing project convention: **snake\_case** in PostgreSQL (e.g. `churn_risk_score`, `composite_health_score`), with matching **camelCase** TypeScript keys in Drizzle (`churnRiskScore`, `compositeHealthScore`).
- Scores are denormalized onto entity/aggregate tables for **fast UI queries** (sort, filter, rank) without joining to `ml_prediction_snapshots` on every render. The `ml_prediction_snapshots` table remains the authoritative historical record; entity-table columns hold the **current** (most recent run) snapshot only.
- Every JSONB field stores a structured JSON array or object. Schemas for each JSONB field are documented in the "Why" section below each table.
- Columns are grouped by table and sorted by feature group within each table.
- `donation_allocations` and `campaigns` are addressed explicitly at the end.

---

## Tables With New Additive Columns

---

## 1. `supporters`

**ML features served:** Donor Churn Risk (1.1), Donor Upgrade Likelihood (1.2)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `churn_risk_score` | `DOUBLE PRECISION` | Donor Churn Risk (1.1) | score | super admin + admin | entity-level |
| `churn_band` | `TEXT` | Donor Churn Risk (1.1) | band/label | super admin + admin | entity-level |
| `churn_top_drivers` | `JSONB` | Donor Churn Risk (1.1) | top-driver explanation | super admin + admin | entity-level |
| `churn_recommended_action` | `TEXT` | Donor Churn Risk (1.1) | recommended action | super admin + admin | entity-level |
| `churn_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Donor Churn Risk (1.1) | model freshness field | super admin + admin | entity-level |
| `upgrade_likelihood_score` | `DOUBLE PRECISION` | Donor Upgrade Likelihood (1.2) | score | super admin only | entity-level |
| `upgrade_band` | `TEXT` | Donor Upgrade Likelihood (1.2) | band/label | super admin only | entity-level |
| `upgrade_top_drivers` | `JSONB` | Donor Upgrade Likelihood (1.2) | top-driver explanation | super admin only | entity-level |
| `upgrade_recommended_ask_band` | `TEXT` | Donor Upgrade Likelihood (1.2) | recommended action | super admin only | entity-level |
| `upgrade_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Donor Upgrade Likelihood (1.2) | model freshness field | super admin only | entity-level |

**Column count:** 10

### Why These Columns Are Needed

**`churn_risk_score` / `churn_band`**
The Donor At-Risk List widget (Dashboard Section 2.2) displays all supporters sorted by churn score descending, with a colored band badge ("at-risk", "watching", "stable", "growing"). Without denormalized values on `supporters`, this list requires a join to `ml_prediction_snapshots` with a subquery to select the latest run per supporter — expensive at scale. Having `churn_band` directly on `supporters` enables a simple `WHERE churn_band = 'at-risk' ORDER BY churn_risk_score DESC` query.

**`churn_top_drivers`**
Powers the "Why this score?" side drawer that opens when a staff member clicks a donor row. Stores a JSON array of up to 3 driver objects: `[{ "driver": "no_donation_90d", "label": "No donation in 90 days", "weight": 0.42 }, ...]`. Without this column, the drawer would require a round-trip to `ml_prediction_snapshots.contextJson` — acceptable but slower and requires additional API logic.

**`churn_recommended_action`**
Powers the Action Queue widget (Dashboard Section 2.1). Stored as a code string: `"send-email"` | `"schedule-call"` | `"send-impact-report"` | `"none"`. The UI maps codes to human-readable labels and action buttons (e.g., "Send impact report"). Having this as a direct column enables server-side filtering: "show only donors where churn_recommended_action != 'none'".

**`churn_score_updated_at`**
Displayed as "Score last updated: 3 days ago" below each donor card. Also used to flag stale scores (e.g., if `churn_score_updated_at < NOW() - INTERVAL '14 days'`, show a "Score may be outdated" warning badge). The pipeline refresh cadence is weekly, so this timestamp lets the UI warn when a run was skipped.

**`upgrade_likelihood_score` / `upgrade_band`**
Powers the Upgrade Opportunity List widget — a prioritized list of donors most likely to respond positively to an upgrade ask. The band values are: `"high-potential"` | `"medium"` | `"low"` | `"not-ready"`. Restricted to super admin only because the ask-sizing information is sensitive; admins do not need to see upgrade potential during day-to-day donor communication.

**`upgrade_top_drivers`**
Powers the "Upgrade signals" card in the donor detail drawer. Stores positive upgrade signals: `[{ "driver": "giving_streak_6mo", "label": "6-month consecutive giving streak", "weight": 0.38 }, ...]`. Kept separate from `churn_top_drivers` because the two feature sets are distinct — a donor can be stable (low churn) yet a poor upgrade candidate.

**`upgrade_recommended_ask_band`**
The suggested ask range for this supporter, expressed as a readable band: `"₱1,000–₱2,000"` | `"₱2,000–₱5,000"` | `"₱5,000–₱10,000"` | `"₱10,000+"`. Used directly in the upgrade action drawer as a pre-filled suggested ask. Stored as a text band rather than a raw number to avoid false precision.

**`upgrade_score_updated_at`**
Same purpose as `churn_score_updated_at` — staleness badge and "Score last updated" display for the upgrade feature.

**Portal note:** Churn columns (`churn_*`) are visible to both super admin and admin roles, since admins actively manage donor relationships. Upgrade columns (`upgrade_*`) are super admin only — ask-sizing decisions are made at the executive level.

---

## 2. `donations`

**ML features served:** Donation-to-Impact Attribution (1.5)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `attributed_outcome_score` | `DOUBLE PRECISION` | Donation-to-Impact Attribution (1.5) | attribution field | super admin only | entity-level |
| `attribution_run_id` | `BIGINT` | Donation-to-Impact Attribution (1.5) | attribution field | internal model monitoring | entity-level |

**Column count:** 2

### Why These Columns Are Needed

**`attributed_outcome_score`**
The Attribution Explorer widget (Dashboard Section 2.5) displays each donation with a "program outcome score" — the measured improvement in the program area this donation funded, in the quarter following the donation date. The score is a 0–100 index derived from the attribution pipeline. Stored directly on `donations` so the donor detail page can show "Your ₱5,000 donation to education programs in Q1 2025 contributed to an 18-point average education progress improvement" without a join. Values are populated only for donations in completed quarters; `NULL` indicates the attribution window has not yet closed.

**`attribution_run_id`**
A foreign key to `ml_pipeline_runs.run_id`. Required for the Model Operations page to trace which pipeline version computed the cached score on each row — critical for detecting drift when a new model version produces materially different scores on the same donation. Also used to bulk-reset scores when a pipeline run is marked invalid. Restricted to internal model monitoring use; never surfaced in donor-facing UI.

**Portal note:** `attributed_outcome_score` is super admin only for now (correlational attribution carries caveats that require interpretation). A future task could selectively expose it in donor portal impact reports with appropriate disclaimers.

---

## 3. `donation_allocations`

**No new columns.**

**Reason:** The attribution pipeline attributes outcomes at the **donation level**, not the allocation level. A single donation may be split across multiple program areas, but the outcome window (program results in the quarter following donation date) is associated with the donation's total value and its primary program allocation — not decomposable per allocation row without arbitrary proration. Storing `attributed_outcome_score` on `donations` is the correct grain. Adding attribution columns to `donation_allocations` would create ambiguity about which allocation row holds the authoritative score.

---

## 4. `social_media_posts`

**ML features served:** Social Post Conversion Prediction (1.4)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `conversion_prediction_score` | `DOUBLE PRECISION` | Social Post Conversion Prediction (1.4) | score | super admin + admin | entity-level |
| `predicted_referral_count` | `NUMERIC` | Social Post Conversion Prediction (1.4) | cached summary | super admin + admin | entity-level |
| `predicted_donation_value_php` | `NUMERIC` | Social Post Conversion Prediction (1.4) | cached summary | super admin + admin | entity-level |
| `conversion_band` | `TEXT` | Social Post Conversion Prediction (1.4) | band/label | super admin + admin | entity-level |
| `conversion_top_drivers` | `JSONB` | Social Post Conversion Prediction (1.4) | top-driver explanation | super admin + admin | entity-level |
| `conversion_comparable_post_ids` | `JSONB` | Social Post Conversion Prediction (1.4) | top-driver explanation | super admin + admin | entity-level |
| `conversion_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Social Post Conversion Prediction (1.4) | model freshness field | super admin + admin | entity-level |

**Column count:** 7

### Why These Columns Are Needed

**`conversion_prediction_score` / `conversion_band`**
The Social Content Performance widget (Dashboard Section 2.4) ranks all recent posts by predicted conversion score. Band values: `"high-converter"` | `"moderate"` | `"engagement-only"` | `"low"`. The band is needed separately from the score so the UI can apply color coding without additional thresholding logic on the client side.

**`predicted_referral_count` / `predicted_donation_value_php`**
These two cached prediction outputs appear in the post detail hover card: "Expected to generate ~4 referrals worth ₱12,400". They are stored as separate columns (not inside a JSONB) because they are used in `ORDER BY` and range filters ("show posts expected to generate > ₱5,000"). NUMERIC type used to match the existing convention for PHP monetary values in the schema (see `donations.amount`, `donations.estimated_value`).

**`conversion_top_drivers`**
The "What makes this post effective?" explainer card. Stores positive and negative feature contributions: `[{ "driver": "has_call_to_action", "direction": "positive", "label": "Has a donate CTA" }, { "driver": "caption_length", "direction": "negative", "label": "Caption too long (>500 chars)" }, ...]`. Up to 5 entries (3 positive, 2 negative).

**`conversion_comparable_post_ids`**
The "Similar high-performing posts" list in the post detail drawer. Stores an array of `post_id` integers: `[42, 118, 203]`. The UI uses these IDs to fetch and display comparable posts for reference when planning similar content. Stored on the scored post rather than in a separate table to keep the lookup simple.

**`conversion_score_updated_at`**
Staleness indicator. Posts older than 90 days are typically re-scored after new data accumulates. The timestamp allows the UI to show "Scored 2 weeks ago" and flag posts where the score is more than 30 days old as potentially stale.

**Portal note:** All columns visible to super admin and admin. These are content performance tools used by social media managers (admin role). Not exposed to donors.

---

## 5. `residents`

**ML features served:** Resident Regression Risk (1.6), Reintegration Readiness (1.7)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `regression_risk_score` | `DOUBLE PRECISION` | Resident Regression Risk (1.6) | score | super admin + admin | entity-level |
| `regression_risk_band` | `TEXT` | Resident Regression Risk (1.6) | band/label | super admin + admin | entity-level |
| `regression_risk_drivers` | `JSONB` | Resident Regression Risk (1.6) | top-driver explanation | super admin + admin | entity-level |
| `regression_recommended_action` | `TEXT` | Resident Regression Risk (1.6) | recommended action | super admin + admin | entity-level |
| `regression_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Resident Regression Risk (1.6) | model freshness field | super admin + admin | entity-level |
| `reintegration_readiness_score` | `DOUBLE PRECISION` | Reintegration Readiness (1.7) | score | super admin + admin | entity-level |
| `reintegration_readiness_band` | `TEXT` | Reintegration Readiness (1.7) | band/label | super admin + admin | entity-level |
| `reintegration_readiness_drivers` | `JSONB` | Reintegration Readiness (1.7) | top-driver explanation | super admin + admin | entity-level |
| `reintegration_recommended_action` | `TEXT` | Reintegration Readiness (1.7) | recommended action | super admin + admin | entity-level |
| `reintegration_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Reintegration Readiness (1.7) | model freshness field | super admin + admin | entity-level |
| `ml_scores_restricted` | `BOOLEAN` | Both (1.6 and 1.7) | visibility/display field | super admin + admin | entity-level |

**Column count:** 11

### Why These Columns Are Needed

**`regression_risk_score` / `regression_risk_band`**
The Case Priority Queue widget (Dashboard Section 2.3) ranks active residents by regression risk score. Band values: `"critical"` | `"high"` | `"moderate"` | `"low"` | `"stable"`. The score enables numeric sorting; the band enables fast color-coded filtering by severity without re-computing thresholds client-side.

**`regression_risk_drivers`**
The "Risk Signals" card in the resident detail view. Stores the top 3 contributing signals as a structured array: `[{ "driver": "concerns_flagged_3sessions", "label": "Concerns flagged in 3 of last 4 sessions", "value": 3 }, { "driver": "health_score_decline", "label": "Health score down 18 pts over 6 weeks", "value": -18 }, ...]`. Used by social workers to understand which observations are driving the alert. Every display of this field must be accompanied by a "This is a discussion aid — clinical judgment overrides this score" disclaimer enforced in the UI.

**`regression_recommended_action`**
The action button in the Case Priority Queue. Stored as a code: `"urgent-case-conference"` | `"increase-session-frequency"` | `"monitor"` | `"none"`. The UI maps this to a primary call-to-action button on the resident card.

**`regression_score_updated_at`**
Weekly refresh. Used to show "Score last updated X days ago" and to flag residents who have been admitted recently (fewer than 4 process recordings) where the score confidence is lower — the UI can display a low-confidence badge if `regression_score_updated_at` is within the first 4 weeks after `date_of_admission`.

**`reintegration_readiness_score` / `reintegration_readiness_band`**
The Reintegration Pipeline widget — a board view of residents by readiness band. Band values: `"ready"` | `"near-ready"` | `"in-progress"` | `"not-ready"`. The board uses `reintegration_readiness_band` as the column grouping key. The score is shown as a progress bar within each card.

**`reintegration_readiness_drivers`**
Stores two arrays: positive indicators and barriers. Structure: `{ "positive": [{ "driver": "family_cooperation_high", "label": "Family cooperation: high on last 3 visits" }, ...], "barriers": [{ "driver": "overdue_plan", "label": "1 overdue intervention plan" }, ...] }`. Displayed in the readiness detail drawer to guide case conference preparation.

**`reintegration_recommended_action`**
The suggested next step for reintegration planning. Code values: `"schedule-conference"` | `"prepare-plan"` | `"monitor"` | `"none"`. Used in the reintegration pipeline board action buttons.

**`reintegration_score_updated_at`**
Monthly refresh. Displayed as "Readiness assessed: 18 days ago" in the resident card footer.

**`ml_scores_restricted`**
A boolean suppression flag. When `TRUE`, both the regression risk score and the reintegration readiness score are withheld from all API responses for this resident. Used for: (a) residents in emergency or crisis `caseStatus` where a new score has not yet been computed; (b) residents for whom a social worker has explicitly flagged the scores as not reliable. **This flag must be enforced server-side** — the API route must check `ml_scores_restricted = TRUE` before including any score columns in the response. Default: `FALSE`. This is the only column in the spec where server-side enforcement is mandatory and cannot be delegated to UI logic.

**Portal note:** All 11 columns are super admin + admin only. Resident ML scores are the most sensitive data in the system — they involve minors and trauma survivors. They are never exposed to donors, public visitors, or unregistered users under any circumstances.

---

## 6. `intervention_plans`

**ML features served:** Intervention Effectiveness (1.8)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `effectiveness_outcome_score` | `DOUBLE PRECISION` | Intervention Effectiveness (1.8) | score | super admin + admin | entity-level |
| `effectiveness_band` | `TEXT` | Intervention Effectiveness (1.8) | band/label | super admin + admin | entity-level |
| `effectiveness_outcome_drivers` | `JSONB` | Intervention Effectiveness (1.8) | top-driver explanation | super admin + admin | entity-level |
| `effectiveness_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Intervention Effectiveness (1.8) | model freshness field | super admin + admin | entity-level |

**Column count:** 4

### Why These Columns Are Needed

**`effectiveness_outcome_score` / `effectiveness_band`**
The Intervention Effectiveness widget shows completed intervention plans ranked by outcome score — a retrospective index measuring how much measurable improvement followed the plan's completion. Score range: 0–100. Band values: `"high-impact"` | `"moderate"` | `"low-impact"` | `"insufficient-data"`. The `"insufficient-data"` band is used when a plan closed with fewer than 2 follow-up assessments, making a score unreliable.

**Important scoping note:** These columns should only be populated for `intervention_plans` rows where `status = 'completed'`. For in-progress or draft plans, the fields remain `NULL`. The pipeline must enforce this; the API must not return score values for non-completed plans.

**`effectiveness_outcome_drivers`**
Shows which outcome dimensions improved most following the intervention. Structure: `[{ "dimension": "health_score", "label": "Average health score increased 12 pts", "delta": 12 }, { "dimension": "education_progress", "label": "Education progress: 22% → 68%", "delta": 46 }, ...]`. Used by the super admin to identify which plan types and service combinations are most effective — feeds into the Intervention Best Practices analysis view.

**`effectiveness_score_updated_at`**
Retrospective scores are computed monthly. Timestamp used for staleness display and to detect plans where outcomes were scored under an older model version (cross-referenced via `ml_pipeline_runs`). Note: this table does not carry a `run_id` FK — the FK relationship is tracked via `ml_prediction_snapshots` for intervention plans, keeping `intervention_plans` lean.

**Portal note:** Super admin + admin. These are case management performance tools; they inform supervision and training decisions. Not shown to donors.

---

## 7. `safehouse_monthly_metrics`

**ML features served:** Safehouse Health Score (1.9)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `composite_health_score` | `DOUBLE PRECISION` | Safehouse Health Score (1.9) | score | super admin + admin | aggregate-level |
| `peer_rank` | `INTEGER` | Safehouse Health Score (1.9) | cached summary | super admin + admin | aggregate-level |
| `health_band` | `TEXT` | Safehouse Health Score (1.9) | band/label | super admin + admin | aggregate-level |
| `trend_direction` | `TEXT` | Safehouse Health Score (1.9) | band/label | super admin + admin | aggregate-level |
| `health_score_drivers` | `JSONB` | Safehouse Health Score (1.9) | top-driver explanation | super admin + admin | aggregate-level |
| `incident_severity_distribution` | `JSONB` | Safehouse Health Score (1.9) | cached summary | super admin + admin | aggregate-level |
| `health_score_computed_at` | `TIMESTAMP WITH TIME ZONE` | Safehouse Health Score (1.9) | model freshness field | super admin + admin | aggregate-level |
| `health_score_run_id` | `BIGINT` | Safehouse Health Score (1.9) | model freshness field | internal model monitoring | aggregate-level |

**Column count:** 8

### Why These Columns Are Needed

**`composite_health_score`**
The Safehouse Health Scorecard widget (Dashboard Section 2.2) displays a 0–100 composite index per safehouse per month, computed as a weighted combination of `avg_health_score`, `avg_education_progress`, `incident_count` (inverted), `process_recording_count`, and `home_visitation_count`. The composite score gives the super admin a single sortable number for cross-safehouse comparison without computing it in application logic on every page load.

**`peer_rank`**
The rank of this safehouse relative to all other safehouses for this specific month (1 = best). Stored as a cached integer so the Safehouse Comparison view can display "Ranked 2nd of 5 safehouses this month" without a window function query on every render.

**`health_band`**
Color-coded status badge: `"excellent"` | `"good"` | `"fair"` | `"at-risk"` | `"critical"`. Used by the Action Queue to surface safehouses needing immediate attention (`health_band IN ('at-risk', 'critical')`).

**`trend_direction`**
Compared against the prior month's `composite_health_score`. Values: `"improving"` | `"stable"` | `"declining"`. Displayed as a trend arrow next to the score. Stored rather than computed at query time to avoid a self-join on `safehouse_monthly_metrics`.

**`health_score_drivers`**
The "What is driving this score?" breakdown. Structure: `[{ "metric": "incident_count", "label": "Incident count above 3-month average", "impact": "negative", "weight": 0.28 }, ...]`. Up to 5 driver entries. Used in the safehouse detail drawer.

**`incident_severity_distribution`**
A cached count breakdown of incidents by severity for the month: `{ "critical": 1, "high": 2, "medium": 4, "low": 3 }`. Avoids a join to `incident_reports` when rendering the severity breakdown bar chart in the safehouse monthly card. This is a **cached summary** column — it does not replace the source data in `incident_reports`.

**`health_score_computed_at`**
Monthly refresh. Shown as "Health score computed: 12 days ago" in the safehouse card footer.

**`health_score_run_id`**
FK to `ml_pipeline_runs.run_id`. Needed on the Model Operations page to link each month's health scores to the pipeline run that produced them, enabling version comparison when the scoring weights are updated.

**Portal note:** Super admin + admin for all read access. `health_score_run_id` is exposed only in the Model Operations page (super admin only). The underlying aggregate data on this table is already visible to admin; the new columns extend what they can see.

---

## 8. `public_impact_snapshots`

**ML features served:** Funding Gap Forecast (1.10)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `projected_gap_php_30d` | `NUMERIC` | Funding Gap Forecast (1.10) | cached summary | super admin only | aggregate-level |
| `funding_gap_band` | `TEXT` | Funding Gap Forecast (1.10) | band/label | super admin only | aggregate-level |
| `funding_gap_updated_at` | `TIMESTAMP WITH TIME ZONE` | Funding Gap Forecast (1.10) | model freshness field | super admin only | aggregate-level |

**Column count:** 3

### Why These Columns Are Needed

**`projected_gap_php_30d`**
The Funding Gap Forecast widget (Dashboard Section 2.6) shows the projected difference between expected incoming donations and projected operational costs for the next 30 days, in PHP. A positive value means a surplus; a negative value means a shortfall. NUMERIC type (matching the existing convention for PHP monetary values in `donations.amount`) rather than DOUBLE PRECISION to avoid floating-point rounding in currency display.

**Rationale for placement on `public_impact_snapshots`:** This is the only table in the allowed extension list that carries aggregate, dated forward-looking organizational metrics. The `snapshotDate` column already provides the "as-of" context. The funding gap forecast is computed at the whole-organization level for a specific snapshot date — it fits the grain of this table naturally. All three columns are super admin only; `public_impact_snapshots` already contains `isPublished` / `publishedAt` columns whose values control what appears publicly, so the new super admin columns can coexist without risk of accidental exposure.

**`funding_gap_band`**
The severity classification: `"surplus"` | `"balanced"` | `"minor-gap"` | `"major-gap"` | `"critical"`. Used by the Action Queue to surface "Critical funding gap in next 30 days" alerts when `funding_gap_band = 'critical'`. Stored separately from `projected_gap_php_30d` so the alert threshold can be applied without parsing a numeric value.

**`funding_gap_updated_at`**
Monthly refresh, aligned with the snapshot creation. Displayed as "Forecast updated: 5 days ago" in the Funding Gap widget header.

**Portal note:** Super admin only. Financial forecasts require executive-level context to interpret and are not surfaced to admins, staff, donors, or the public via this field.

---

## 9. `ml_prediction_snapshots`

**ML features served:** All 10 features (this is the generic prediction store)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `band_label` | `TEXT` | All features | visibility/display field | internal model monitoring | entity-level |
| `action_code` | `TEXT` | All features | visibility/display field | internal model monitoring | entity-level |

**Column count:** 2

### Why These Columns Are Needed

**`band_label`**
The existing `contextJson` column is the authoritative store for all prediction context including the band. However, parsing JSONB to extract the band value on every row in a list render (e.g., the Model Operations page showing 500 predictions from the latest run) is unnecessarily expensive. `band_label` is a **denormalized surfacing column** — it duplicates the band value from `contextJson` as a plain text field to enable fast `WHERE band_label = 'at-risk'` filtering and grouped counts (`GROUP BY band_label`). It is not the authoritative source; the authoritative value remains in `contextJson`.

**`action_code`**
Same rationale — denormalizes the `recommended_action` field from `contextJson` for fast server-side filtering. The Model Operations page can then show "312 donors with action_code = send-email" without parsing JSONB. Also used by batch action endpoints: "send re-engagement email to all supporters where pipelineName = 'donor_churn_risk' AND action_code = 'send-email' AND runId = (latest)".

**Portal note:** Both columns are used by internal model monitoring (Model Operations page, super admin only). They may also be read by API routes that join `ml_prediction_snapshots` for UI rendering, but they are not surfaced directly as user-visible fields — they are infrastructure for efficient querying.

---

## 10. `ml_pipeline_runs`

**ML features served:** All 10 features (model operations monitoring)

### New Columns

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `scored_entity_count` | `INTEGER` | All features | cached summary | internal model monitoring | aggregate-level |
| `feature_importance_json` | `JSONB` | All features | model freshness field | internal model monitoring | aggregate-level |

**Column count:** 2

### Why These Columns Are Needed

**`scored_entity_count`**
The Model Operations page (Dashboard Section 2.7) shows a run summary card for each pipeline: "Donor Churn Risk — Run #14 — 847 supporters scored — 3 days ago". Without this column, the count requires a `SELECT COUNT(*) FROM ml_prediction_snapshots WHERE run_id = ?` query for every run row displayed. Storing it on `ml_pipeline_runs` at write time (during pipeline execution) makes the runs list query trivially fast.

**`feature_importance_json`**
The "Top Predictive Signals" card on the Model Operations page — shows the model's global feature importances so super admins can understand what the model is using to make predictions. Structure: `[{ "feature": "days_since_last_donation", "importance": 0.38, "label": "Days since last donation" }, ...]`. This is a model-level (not entity-level) artifact — it describes the model, not an individual prediction. It belongs on `ml_pipeline_runs` because it is produced once per training run and applies to all predictions from that run. The existing `metricsJson` column stores performance metrics (precision, recall, F1); `feature_importance_json` stores the complementary interpretability data.

**Portal note:** Both columns are internal model monitoring only — super admin, Model Operations page. Never exposed to admin, staff, donors, or public.

---

## 11. `campaigns` — Out of Scope for This Spec

`campaigns` is **not in the allowed extension table list** provided in the task definition. Campaign Effectiveness (ML feature 1.3) requires additive columns on this table. Those columns are deferred and listed below for the follow-up schema task.

### Deferred Campaign Columns (follow-up task only)

| Column Name | PostgreSQL Type | ML Feature | Field Type | Portal | Level |
|---|---|---|---|---|---|
| `effectiveness_score` | `DOUBLE PRECISION` | Campaign Effectiveness (1.3) | score | super admin + admin | entity-level |
| `effectiveness_band` | `TEXT` | Campaign Effectiveness (1.3) | band/label | super admin + admin | entity-level |
| `effectiveness_top_drivers` | `JSONB` | Campaign Effectiveness (1.3) | top-driver explanation | super admin + admin | entity-level |
| `recommended_replicate` | `BOOLEAN` | Campaign Effectiveness (1.3) | recommended action | super admin only | entity-level |
| `recommended_avoid` | `BOOLEAN` | Campaign Effectiveness (1.3) | recommended action | super admin only | entity-level |
| `effectiveness_score_updated_at` | `TIMESTAMP WITH TIME ZONE` | Campaign Effectiveness (1.3) | model freshness field | super admin + admin | entity-level |

These 6 columns should be proposed in a separate schema extension task that explicitly adds `campaigns` to the allowed extension list.

---

## Summary

### Total Proposed Columns by Table

| Table | New Column Count | ML Features Covered |
|---|---|---|
| `supporters` | 10 | 1.1, 1.2 |
| `donations` | 2 | 1.5 |
| `donation_allocations` | 0 | — |
| `social_media_posts` | 7 | 1.4 |
| `residents` | 11 | 1.6, 1.7 |
| `intervention_plans` | 4 | 1.8 |
| `safehouse_monthly_metrics` | 8 | 1.9 |
| `public_impact_snapshots` | 3 | 1.10 |
| `ml_prediction_snapshots` | 2 | All |
| `ml_pipeline_runs` | 2 | All |
| **Total (in scope)** | **49** | |
| `campaigns` (deferred) | 6 | 1.3 |

---

### Minimum Viable Additive Columns

These columns are required to deliver the **Phase 1 dashboard** (Donor Churn Risk, Safehouse Health Score, Funding Gap Forecast) and the Model Operations infrastructure. 20 columns across 5 tables.

**`supporters` (5 columns — Donor Churn Risk only):**
- `churn_risk_score`
- `churn_band`
- `churn_top_drivers`
- `churn_recommended_action`
- `churn_score_updated_at`

**`safehouse_monthly_metrics` (8 columns — Safehouse Health Score):**
- `composite_health_score`
- `peer_rank`
- `health_band`
- `trend_direction`
- `health_score_drivers`
- `incident_severity_distribution`
- `health_score_computed_at`
- `health_score_run_id`

**`public_impact_snapshots` (3 columns — Funding Gap Forecast):**
- `projected_gap_php_30d`
- `funding_gap_band`
- `funding_gap_updated_at`

**`ml_pipeline_runs` (2 columns — Model Operations page):**
- `scored_entity_count`
- `feature_importance_json`

**`ml_prediction_snapshots` (2 columns — fast querying infrastructure):**
- `band_label`
- `action_code`

---

### Recommended Full Additive Columns

All 49 columns specified in this document, covering all 9 ML features in scope (1.1 through 1.10 minus 1.3). Implementation order follows the phased plan in `SUPER_ADMIN_ML_FEATURE_PLAN.md`:

- **Phase 1:** `supporters` (churn only), `safehouse_monthly_metrics`, `public_impact_snapshots`, `ml_pipeline_runs`, `ml_prediction_snapshots` — 20 columns
- **Phase 2:** `supporters` (upgrade columns), `social_media_posts`, `residents` — 43 columns across Phase 1 + 2 (20 Phase 1 + 5 upgrade + 7 social posts + 11 residents)
- **Phase 3:** `donations`, `intervention_plans` — full 49 columns

---

### Columns Deferred for Later

| Column(s) | Table | Reason |
|---|---|---|
| `effectiveness_score`, `effectiveness_band`, `effectiveness_top_drivers`, `recommended_replicate`, `recommended_avoid`, `effectiveness_score_updated_at` | `campaigns` | Table not in allowed extension list for this task — requires follow-up schema task |
| `upgrade_likelihood_score`, `upgrade_band`, `upgrade_top_drivers`, `upgrade_recommended_ask_band`, `upgrade_score_updated_at` | `supporters` | Phase 2 — build on top of Phase 1 churn infrastructure before adding upgrade scoring |
| Any server-side UI preference columns | Future table | Out of scope per task definition — would require a new table or a future schema pass |
