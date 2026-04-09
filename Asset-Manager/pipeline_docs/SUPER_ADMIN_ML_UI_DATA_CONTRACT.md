# Super Admin ML — UI Data Contract

**Sources of truth:** `SUPER_ADMIN_ML_FEATURE_PLAN.md`, `SUPER_ADMIN_ML_ADDITIVE_SCHEMA_SPEC.md`
**Date:** 2026-04-09
**Scope:** Specification only — no React code, no SQL, no API routes, no schema changes.

This document defines exactly what each Super Admin ML dashboard widget requires from the API and what it must render. A frontend developer and a backend developer should each be able to implement their side independently using only this document and the schema spec.

---

## Table of Contents

- [API Conventions](#api-conventions)
- [Global Filters](#global-filters)
- [Overview Page](#overview-page)
  - [W01 — Action Queue Card](#w01--action-queue-card)
  - [W02 — Funding Gap KPI + Sparkline](#w02--funding-gap-kpi--sparkline)
  - [W03 — Safehouse Health Leaderboard (Mini)](#w03--safehouse-health-leaderboard-mini)
- [Donors Page](#donors-page)
  - [W04 — Donor Churn Table](#w04--donor-churn-table)
  - [W05 — Donor Upgrade Board](#w05--donor-upgrade-board)
  - [W06 — Donation-to-Impact Attribution View](#w06--donation-to-impact-attribution-view)
- [Campaigns & Social Page](#campaigns--social-page)
  - [W07 — Campaign Movement vs. Noise Chart](#w07--campaign-movement-vs-noise-chart)
  - [W08 — Social Post Conversion Planner](#w08--social-post-conversion-planner)
- [Residents & Safehouses Page](#residents--safehouses-page)
  - [W09 — Resident Regression Overview](#w09--resident-regression-overview)
  - [W10 — Reintegration Readiness Overview](#w10--reintegration-readiness-overview)
  - [W11 — Intervention Effectiveness Matrix](#w11--intervention-effectiveness-matrix)
  - [W12 — Safehouse Comparison Cards](#w12--safehouse-comparison-cards)
- [Model Operations Page](#model-operations-page)
  - [W13 — Model Health & Freshness Dashboard](#w13--model-health--freshness-dashboard)
- [Appendix: JSONB Field Schemas](#appendix-jsonb-field-schemas)

---

## API Conventions

All endpoints serving these widgets share the following conventions. Deviations are noted per widget.

### Authentication
- All endpoints require `Authorization: Bearer <jwt>` header.
- JWT encodes `role` (`super_admin` | `admin` | `staff` | `donor`) and `safehouseId` (for admin/staff — the safehouse they are assigned to).
- Requests missing a valid token receive `401 Unauthorized`.
- Requests from a role without access to the endpoint receive `403 Forbidden`.

### HTTP Method
All widget data endpoints use `GET` with query parameters. Action endpoints (outreach, flag, mark handled) use `PATCH`.

### Response Envelope (paginated)
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 347
  }
}
```

### Response Envelope (non-paginated / aggregate)
```json
{
  "data": { ... }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to view this resource."
  }
}
```

Common error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

### Data Types
- **Monetary values (PHP):** Returned as `string` in NUMERIC format (e.g., `"12500.00"`), never as a float. Client parses with `parseFloat()` only for display.
- **Timestamps:** ISO 8601 with timezone, e.g., `"2026-03-15T08:30:00+08:00"`.
- **Scores:** `number` (JavaScript `float64`), range 0–1 unless noted otherwise.
- **Booleans:** `true` / `false` (never `1` / `0`).
- **JSONB fields:** Returned as parsed JSON objects/arrays, not as JSON strings.

### Resident `ml_scores_restricted` Gate

This gate applies differently depending on endpoint type:

**General rule (aggregate / funnel / distribution endpoints):**
Restricted residents (`ml_scores_restricted = true`) are counted in totals but their individual ML score values are never exposed. The `totalRestricted` count must be included in aggregate responses so the UI can display a footnote (e.g., "2 resident(s) not shown — scores restricted").

**Watchlist / row-level endpoints (W09, W10 ranked tables):**
Restricted residents are **excluded entirely** from the response — they do not appear as rows at all. This is an explicit exception to the general rule above, because showing a row with all-null scores in a ranked table would be misleading (a null-score row has no meaningful rank position). The `totalRestricted` count is included at the top-level response `meta` object so the UI can note the exclusion without revealing individual identities.

**Rule for other endpoints returning individual resident rows:**
If a resident row has `ml_scores_restricted = true`, the API **must** return all ML score fields as `null` and include `"mlScoresRestricted": true` on the row object. This applies to any endpoint not explicitly listed as a watchlist/row-level endpoint above.

- This gate is enforced server-side. Client-side gating is not sufficient.
- Example restricted row (general endpoints):
```json
{
  "residentId": 42,
  "internalCode": "SH-B-007",
  "regressionRiskScore": null,
  "regressionRiskBand": null,
  "regressionRiskDrivers": null,
  "mlScoresRestricted": true
}
```

### Pagination Defaults
- Default `page`: `1`
- Default `pageSize`: `20`
- Maximum `pageSize`: `100`

---

## Global Filters

These three filters are available on every page and are passed as query parameters to every widget API endpoint. Widgets that ignore a global filter (e.g., W01 ignores all of them) must still accept and silently discard the parameters without returning an error.

| Parameter | Type | Default | Values |
|---|---|---|---|
| `safehouseId` | `integer \| "all"` | `"all"` | Integer safehouse_id, or the string `"all"` |
| `dateRange` | `string` | `"90d"` | `"30d"` \| `"90d"` \| `"6mo"` \| `"12mo"` \| `"custom"` |
| `dateStart` | `string (ISO date)` | — | Required when `dateRange = "custom"` |
| `dateEnd` | `string (ISO date)` | — | Required when `dateRange = "custom"` |
| `compareMode` | `boolean` | `false` | Enables period-over-period overlay where supported |

**Role enforcement for `safehouseId`:** An admin-role user who passes `safehouseId = "all"` or a safehouse_id other than their own must receive `403 Forbidden`. The API enforces this; the UI pre-sets the filter to their assigned safehouse and hides the global safehouse selector.

---

## Overview Page

Route: `/superadmin` (the landing page after login)

---

### W01 — Action Queue Card

| Field | Value |
|---|---|
| **Widget name** | Action Queue Card |
| **Page location** | Overview — Row 1 (top of page, always visible) |
| **Widget type** | Three summary KPI tiles in a horizontal strip |

**Source tables:**
- `ml_prediction_snapshots` — latest run per pipeline for `pipelineName = 'donor_churn_risk'`: `entity_id` (= supporterId), `band_label` (= churnBand), `prediction_score`
- `ml_prediction_snapshots` — latest run per pipeline for `pipelineName = 'resident_regression_risk'`: `entity_id` (= residentId), `band_label` (= regressionRiskBand)
- `supporters` — joined to churn snapshots by `entity_id` = `supporter_id` for `display_name` (topThree only)
- `safehouse_monthly_metrics` — latest `month_start` per safehouse: `health_band`, `safehouse_id`
- `safehouses` — joined for `name` (safehouseNames list)
- `residents` — `ml_scores_restricted` (to exclude restricted residents from regression count)

**Required API response fields:**
```json
{
  "data": {
    "churnAlert": {
      "atRiskCount": 12,
      "topThree": [
        { "supporterId": 101, "displayName": "Maria Santos", "churnBand": "at-risk" },
        { "supporterId": 88,  "displayName": "Jose Reyes",   "churnBand": "at-risk" },
        { "supporterId": 54,  "displayName": "Ana Cruz",     "churnBand": "at-risk" }
      ]
    },
    "regressionAlert": {
      "criticalOrHighCount": 7
    },
    "safehouseAlert": {
      "atRiskOrCriticalCount": 2,
      "safehouseNames": ["Safehouse C", "Safehouse E"]
    }
  }
}
```

**Computed fields:**
- `atRiskCount` — `COUNT(*)` from `ml_prediction_snapshots` (latest run for `donor_churn_risk`) where `band_label = 'at-risk'`
- `topThree` — top 3 rows from the same snapshot set ordered by `prediction_score DESC`, joined to `supporters` for `display_name`
- `criticalOrHighCount` — `COUNT(*)` from `ml_prediction_snapshots` (latest run for `resident_regression_risk`) where `band_label IN ('critical','high')`, then cross-joined to `residents` to exclude rows where `residents.ml_scores_restricted = true`
- `atRiskOrCriticalCount` — `COUNT(*)` from latest `safehouse_monthly_metrics` per safehouse where `health_band IN ('at-risk','critical')`

**Filters:** None. This widget always reflects the current state and ignores all global filter parameters.

**Default sort:** Not applicable (summary counts only; `topThree` is sorted by `churn_risk_score DESC`).

**Drilldown behavior:**
- Clicking the churn tile navigates to `/superadmin/donors?tab=churn&churnBand=at-risk`
- Clicking the regression tile navigates to `/superadmin/residents?tab=regression&regressionBand=critical,high`
- Clicking the safehouse alert tile navigates to `/superadmin/safehouses?healthBand=at-risk,critical`

**Action buttons:** None on this widget. Navigation only.

**Role visibility:** Super admin only. This widget is not visible to admin-role users (they have their own safehouse-scoped overview).

**Empty state:** If all three counts are zero: "No urgent alerts at this time." Render as a single green confirmation message inside the strip. Do not hide the widget — the absence of alerts is itself useful signal.

---

### W02 — Funding Gap KPI + Sparkline

| Field | Value |
|---|---|
| **Widget name** | Funding Gap KPI + Trend Sparkline |
| **Page location** | Overview — Row 2 |
| **Widget type** | Large KPI card (gap amount + band badge) + 12-month sparkline |

**Source tables:**
- `public_impact_snapshots` — `projected_gap_php_30d`, `funding_gap_band`, `funding_gap_updated_at`, `snapshotDate`
- `donations` — `donationDate`, `amount` (aggregated by month for sparkline)

**Required API response fields:**
```json
{
  "data": {
    "latestSnapshot": {
      "projectedGapPhp30d": "-320000.00",
      "fundingGapBand": "major-gap",
      "fundingGapUpdatedAt": "2026-04-07T06:00:00+08:00",
      "snapshotDate": "2026-04-01"
    },
    "sparkline": [
      { "month": "2025-05", "totalDonationsPhp": "185000.00" },
      { "month": "2025-06", "totalDonationsPhp": "210000.00" },
      ...
    ]
  }
}
```

**Computed fields:**
- `sparkline` — 12 rows, each `{ month: "YYYY-MM", totalDonationsPhp: string }`, derived from `SUM(donations.amount)` grouped by `DATE_TRUNC('month', donation_date)` for the past 12 calendar months.
- Funding target percentage (TBD) — a future "90-day target" config value will be needed from system settings. Until that UI is built, this field is omitted and the KPI card shows only the raw gap amount and band.

**Filters:** Ignores `safehouseId` and `dateRange` — always shows the latest snapshot and the trailing 12 months of donation actuals.

**Default sort:** Not applicable (single aggregate).

**Drilldown behavior:** Clicking anywhere on the card navigates to the Donors page Attribution section (W06) for the current quarter.

**Action buttons:** None on this card (action is on the Donors page).

**Role visibility:** Super admin only.

**Empty state:** If no `public_impact_snapshots` row has `funding_gap_updated_at` populated: show "Funding forecast not yet available. Run the funding gap pipeline to see projections." If sparkline has fewer than 3 months of data: render available months and note "Showing [N] months of data — full history available after [date]."

---

### W03 — Safehouse Health Leaderboard (Mini)

| Field | Value |
|---|---|
| **Widget name** | Safehouse Health Leaderboard (Overview) |
| **Page location** | Overview — Row 5 |
| **Widget type** | Compact ranked table, max 5 rows |

**Source tables:**
- `safehouse_monthly_metrics` — latest `monthStart` per `safehouseId`: `composite_health_score`, `health_band`, `trend_direction`, `peer_rank`
- `safehouses` — `name`, `safehouseCode`

**Required API response fields (per row):**

| Field | Source column | Type |
|---|---|---|
| `safehouseId` | `safehouse_monthly_metrics.safehouse_id` | `integer` |
| `safehouseName` | `safehouses.name` | `string` |
| `compositeHealthScore` | `safehouse_monthly_metrics.composite_health_score` | `number` |
| `healthBand` | `safehouse_monthly_metrics.health_band` | `string` |
| `trendDirection` | `safehouse_monthly_metrics.trend_direction` | `string` |
| `peerRank` | `safehouse_monthly_metrics.peer_rank` | `integer` |

**Computed fields:** None.

**Default sort:** `peer_rank ASC`. Always returns at most 5 rows.

**Filters:** Ignores `dateRange`; uses the most recent `monthStart` available for each safehouse. Respects `safehouseId` filter only if the user is an admin (forces to their own safehouse).

**Drilldown behavior:** Clicking any row navigates to `/superadmin/safehouses?safehouseId={id}` which loads the full W12 Safehouse Comparison Cards page scoped to that safehouse.

**Action buttons:** "View all safehouses" link at bottom of widget — navigates to the full Safehouse Comparison Cards page.

**Role visibility:** Super admin sees all safehouses ranked (top 5 by peer_rank). Admin sees only their own safehouse (1 row, without peer rank).

**Empty state:** "Health scores not yet computed for this period. Run the safehouse health pipeline to populate rankings."

---

## Donors Page

Route: `/superadmin/donors`

---

### W04 — Donor Churn Table

| Field | Value |
|---|---|
| **Widget name** | Donor Churn Risk Table |
| **Page location** | Donors page — "Churn Risk" tab |
| **Widget type** | Paginated sortable table + side drawer on row click |

**Source tables:**
- `supporters` — `supporter_id`, `display_name`, `email`, `status`, `recurring_enabled`, `first_donation_date`, `acquisition_channel`, `region`, `churn_risk_score`, `churn_band`, `churn_top_drivers`, `churn_recommended_action`, `churn_score_updated_at`
- `donations` — latest row per `supporter_id`: `donation_date` AS `lastDonationDate`, `amount` AS `lastDonationAmount`, `channel_source` AS `lastDonationChannel`

**Required API response fields (per row):**

| Field | Source | Type |
|---|---|---|
| `supporterId` | `supporters.supporter_id` | `integer` |
| `displayName` | `supporters.display_name` | `string` |
| `email` | `supporters.email` | `string` |
| `churnRiskScore` | `supporters.churn_risk_score` | `number \| null` |
| `churnBand` | `supporters.churn_band` | `string \| null` |
| `churnTopDrivers` | `supporters.churn_top_drivers` | `array \| null` (see Appendix) |
| `churnRecommendedAction` | `supporters.churn_recommended_action` | `string \| null` |
| `churnScoreUpdatedAt` | `supporters.churn_score_updated_at` | `string (ISO 8601) \| null` |
| `lastDonationDate` | latest `donations.donation_date` | `string (ISO date) \| null` |
| `lastDonationAmount` | latest `donations.amount` | `string (NUMERIC) \| null` |
| `daysSinceLastDonation` | computed | `integer \| null` |
| `acquisitionChannel` | `supporters.acquisition_channel` | `string \| null` |
| `region` | `supporters.region` | `string \| null` |
| `recurringEnabled` | `supporters.recurring_enabled` | `boolean` |

**Computed fields:**
- `daysSinceLastDonation` = `CURRENT_DATE - lastDonationDate` in days. Returns `null` if no donation on record.

**Default sort:** `churn_risk_score DESC NULLS LAST`

**Filters (query params):**

| Param | Type | Options |
|---|---|---|
| `churnBand` | `string[]` | `at-risk`, `watching`, `stable`, `growing` |
| `acquisitionChannel` | `string[]` | Values from `supporters.acquisition_channel` (dynamic enum) |
| `region` | `string[]` | Values from `supporters.region` (dynamic enum) |
| `recurringEnabled` | `boolean` | `true` \| `false` |
| `donationType` | `string[]` | `recurring`, `one-time`, `in-kind` |
| `safehousePreference` | `integer` | Filter by `donations.safehouse_id` (donors who have given to this safehouse) |
| `page` | `integer` | Default `1` |
| `pageSize` | `integer` | Default `20`, max `100` |
| `sortBy` | `string` | `churn_risk_score` \| `last_donation_date` \| `days_since_last_donation` |
| `sortDir` | `string` | `asc` \| `desc` |

**Drilldown behavior:** Clicking any row opens a right-side drawer containing:
- Donor name, email, acquisition channel, region, `recurringEnabled` badge
- Last 5 donations table: `donationDate`, `amount`, `channelSource`, `campaignName`
- Churn risk score gauge (0–1) with `churnBand` color
- Top drivers list: full `churnTopDrivers` array rendered as labeled pills with weight bars
- `churnScoreUpdatedAt` shown as "Score updated: X days ago"
- Staleness badge if `churnScoreUpdatedAt` is older than 14 days
- Action buttons (see below)

**Action buttons:**

| Label | Behavior |
|---|---|
| "Send outreach email" | `POST /api/superadmin/donors/{id}/actions/outreach` — triggers outreach workflow |
| "Flag for call" | `PATCH /api/superadmin/donors/{id}` body: `{ "churnRecommendedAction": "schedule-call" }` |
| "Mark handled" | `PATCH /api/superadmin/donors/{id}` body: `{ "churnRecommendedAction": "none" }` |

**Role visibility:** Super admin sees all donors. Admin sees only donors who have at least one donation linked to their assigned `safehouse_id` (enforced via `donations.safehouse_id` join). Admin cannot see donor email addresses — redact to `"***@***.***"` in the API response for admin role.

**Empty state:** "No donors match the current filters." If no donors have been scored yet: "Donor churn scores are not yet available. Run the donor churn pipeline to populate this table."

---

### W05 — Donor Upgrade Board

| Field | Value |
|---|---|
| **Widget name** | Donor Upgrade Likelihood Board |
| **Page location** | Donors page — "Upgrade Opportunities" tab |
| **Widget type** | Paginated sortable table + side drawer |

**Source tables:**
- `supporters` — `supporter_id`, `display_name`, `email`, `status`, `recurring_enabled`, `upgrade_likelihood_score`, `upgrade_band`, `upgrade_top_drivers`, `upgrade_recommended_ask_band`, `upgrade_score_updated_at`
- `donations` — aggregated per `supporter_id`: avg quarterly amount, lifetime total, trend direction

**Required API response fields (per row):**

| Field | Source | Type |
|---|---|---|
| `supporterId` | `supporters.supporter_id` | `integer` |
| `displayName` | `supporters.display_name` | `string` |
| `upgradeLikelihoodScore` | `supporters.upgrade_likelihood_score` | `number \| null` |
| `upgradeBand` | `supporters.upgrade_band` | `string \| null` |
| `upgradeRecommendedAskBand` | `supporters.upgrade_recommended_ask_band` | `string \| null` |
| `upgradeTopDrivers` | `supporters.upgrade_top_drivers` | `array \| null` (see Appendix) |
| `upgradeScoreUpdatedAt` | `supporters.upgrade_score_updated_at` | `string (ISO 8601) \| null` |
| `avgQuarterlyAmountPhp` | computed from `donations` | `string (NUMERIC)` |
| `lifetimeTotalAmountPhp` | computed from `donations` | `string (NUMERIC)` |
| `donationAmountTrend` | computed | `"increasing" \| "stable" \| "decreasing"` |
| `recurringEnabled` | `supporters.recurring_enabled` | `boolean` |
| `acquisitionChannel` | `supporters.acquisition_channel` | `string \| null` |

**Computed fields:**
- `avgQuarterlyAmountPhp` — average of `SUM(amount)` per calendar quarter for the last 4 quarters.
- `lifetimeTotalAmountPhp` — `SUM(donations.amount)` for all time.
- `donationAmountTrend` — compare last quarter avg to prior quarter avg: > 10% increase = `"increasing"`, < -10% = `"decreasing"`, otherwise `"stable"`.

**Default sort:** `upgrade_likelihood_score DESC NULLS LAST`

**Filters (query params):**

| Param | Type | Options |
|---|---|---|
| `upgradeBand` | `string[]` | `high-potential`, `medium`, `low`, `not-ready` |
| `minUpgradeScore` | `number` | 0.0 – 1.0 (slider) |
| `recurringEnabled` | `boolean` | `true` \| `false` |
| `acquisitionChannel` | `string[]` | Dynamic enum |
| `minAvgQuarterlyAmount` | `number` | PHP amount threshold |
| `page` | `integer` | Default `1` |
| `pageSize` | `integer` | Default `20` |

**Drilldown behavior:** Side drawer shows:
- Full donation history summary (quarterly chart — amounts by quarter)
- `upgradeTopDrivers` rendered as labeled driver cards
- `upgradeRecommendedAskBand` shown as "Suggested ask: ₱2,000–₱3,500"
- Comparable donors who have upgraded: pulled from `ml_prediction_snapshots.contextJson` for `pipelineName = 'donor_upgrade_likelihood'` (see Appendix for contextJson shape)
- Suggested ask script: template message with the `upgradeRecommendedAskBand` filled in

**Action buttons:**

| Label | Behavior |
|---|---|
| "Generate upgrade ask email" | `POST /api/superadmin/donors/{id}/actions/upgrade-ask` |
| "Schedule call" | `PATCH /api/superadmin/donors/{id}` body: `{ "churnRecommendedAction": "schedule-call" }` |
| "Mark not a candidate" | `PATCH /api/superadmin/donors/{id}` body: `{ "upgradeBand": "not-ready" }` |

**Role visibility:** Super admin only. This widget is not visible to admin or staff. Upgrade scoring is an executive-level donor strategy decision.

**Empty state:** "No donors are currently scored for upgrade likelihood. Run the donor upgrade pipeline to populate this board."

---

### W06 — Donation-to-Impact Attribution View

| Field | Value |
|---|---|
| **Widget name** | Donation-to-Impact Attribution |
| **Page location** | Donors page — "Attribution" tab |
| **Widget type** | Sankey diagram + program area KPI cards |

**Source tables:**
- `donations` — `donation_id`, `supporter_id`, `amount`, `donation_date`, `safehouse_id`, `campaign_id`, `attributed_outcome_score`, `attribution_run_id`
- `donation_allocations` — `donation_id`, `program_area`, `amount_allocated`, `safehouse_id`, `allocation_date`
- `supporters` — `supporter_id`, `display_name`
- `safehouse_monthly_metrics` — `safehouse_id`, `month_start`, `avg_health_score`, `avg_education_progress`
- `safehouses` — `safehouse_id`, `name`

**Sub-view A: Sankey Diagram**

Required API endpoint: `GET /api/superadmin/attribution/sankey`

Required response:
```json
{
  "data": {
    "nodes": [
      { "id": "supporter_101", "label": "Maria Santos", "type": "supporter" },
      { "id": "program_education", "label": "Education", "type": "programArea" },
      { "id": "safehouse_3", "label": "Safehouse C", "type": "safehouse" },
      { "id": "outcome_health", "label": "Health Score +8 pts", "type": "outcome" }
    ],
    "links": [
      { "source": "supporter_101", "target": "program_education", "valuePhp": "50000.00" },
      { "source": "program_education", "target": "safehouse_3", "valuePhp": "50000.00" },
      { "source": "safehouse_3", "target": "outcome_health", "valuePhp": "50000.00" }
    ],
    "disclaimer": "Correlation shown — not evidence of direct causation.",
    "windowLabel": "Q1 2026"
  }
}
```

`disclaimer` is a fixed string that must always be included and rendered non-dismissibly.

**Sub-view B: Program KPI Cards**

Required API endpoint: `GET /api/superadmin/attribution/programs`

Required response (per program area):
```json
{
  "data": [
    {
      "programArea": "Education",
      "totalAllocatedPhp": "320000.00",
      "avgAttributedOutcomeScore": 0.74,
      "healthScoreDelta": 5.2,
      "educationProgressDelta": 12.3,
      "safehouseCount": 3
    }
  ]
}
```

**Computed fields:**
- `healthScoreDelta` — difference in `avg_health_score` between the quarter before and the quarter after the allocation, for safehouses that received this program area allocation.
- `educationProgressDelta` — same pattern using `avg_education_progress`.
- `avgAttributedOutcomeScore` — `AVG(donations.attributed_outcome_score)` for donations allocated to this program area where score is not null.

**Filters (query params):**

| Param | Type |
|---|---|
| `programArea` | `string[]` — multi-select |
| `safehouseId` | `integer \| "all"` |
| `dateRange` / `dateStart` / `dateEnd` | Standard global filter |
| `campaignId` | `integer` — optional |
| `donationType` | `string[]` — `recurring`, `one-time`, `in-kind` |

**Drilldown behavior:** Clicking a Sankey flow segment filters the view to show a table of individual donation records for that source→target pair, including `donationDate`, `amount`, `attributedOutcomeScore`, donor name, and safehouse.

**Action buttons:**

| Label | Behavior |
|---|---|
| "Generate donor impact report" | `POST /api/superadmin/attribution/report` — generates a PDF summary |
| "Export for annual report" | `GET /api/superadmin/attribution/export?format=csv` |

**Role visibility:** Super admin only (named donor view). A separate donor-portal view (anonymized, aggregate only) is out of scope for this contract.

**Empty state (Sankey):** "No allocation data available for the selected period."
**Empty state (KPI cards):** "No attribution scores have been computed. Run the attribution pipeline to see program impact."

---

## Campaigns & Social Page

Route: `/superadmin/campaigns`

---

### W07 — Campaign Movement vs. Noise Chart

| Field | Value |
|---|---|
| **Widget name** | Campaign Movement vs. Noise |
| **Page location** | Campaigns & Social page — "Campaign Performance" tab |
| **Widget type** | Scatter plot + leaderboard table (two synced sub-views) |

**Source tables:**
- `campaigns` — `campaign_id`, `title`, `category`, `goal`, `deadline`, `status`
- `donations` — aggregated per `campaign_id`: `SUM(amount)` as total raised, `COUNT(DISTINCT supporter_id)` as unique donors
- `social_media_posts` — aggregated per `campaign_name`: `AVG(engagement_rate)`, `SUM(donation_referrals)`, `SUM(impressions)`
- `ml_prediction_snapshots` — `pipelineName = 'campaign_effectiveness'`, latest run per campaign: `prediction_score` (conversion ratio), `context_json.classification_band`, `context_json.recommended_replicate`, `band_label`

**Note:** Campaign ML columns are sourced from `ml_prediction_snapshots.context_json` rather than from additive columns on `campaigns` because `campaigns` is not in the approved extension table list for this release.

**Required API response fields (per campaign data point):**

| Field | Source | Type |
|---|---|---|
| `campaignId` | `campaigns.campaign_id` | `integer` |
| `title` | `campaigns.title` | `string` |
| `category` | `campaigns.category` | `string \| null` |
| `status` | `campaigns.status` | `string` |
| `goal` | `campaigns.goal` | `string (NUMERIC) \| null` |
| `totalRaisedPhp` | aggregated from `donations` | `string (NUMERIC)` |
| `uniqueDonors` | aggregated from `donations` | `integer` |
| `avgEngagementRate` | aggregated from `social_media_posts` | `number \| null` |
| `totalImpressions` | aggregated from `social_media_posts` | `integer \| null` |
| `conversionRatio` | from `ml_prediction_snapshots.prediction_score` | `number \| null` |
| `classificationBand` | from `context_json.classification_band` | `string \| null` |
| `recommendedReplicate` | from `context_json.recommended_replicate` | `boolean \| null` |
| `deadline` | `campaigns.deadline` | `string (ISO date) \| null` |

**Computed fields:**
- `conversionRatio` — if ML snapshot is unavailable: compute as `totalRaisedPhp / goal` (returns null if `goal` is null or zero).

**Scatter plot axes:**
- X axis: `avgEngagementRate` (0–100%)
- Y axis: `conversionRatio` (0–1+)
- Point color: maps `classificationBand` → color: `"high-movement"` = green, `"moderate"` = yellow, `"noise"` = red, `"pending"` = gray
- Point size: proportional to `totalImpressions`

**Default sort (leaderboard table):** `conversion_ratio DESC NULLS LAST`

**Filters (query params):**

| Param | Type | Options |
|---|---|---|
| `category` | `string[]` | Multi-select; dynamic from `campaigns.category` |
| `status` | `string[]` | `draft`, `active`, `closed` |
| `isBoosted` | `boolean` | Filter to campaigns that have at least one boosted post |
| `platform` | `string[]` | Filter via `social_media_posts.platform` join |
| `dateRange` | Standard | Applied to `campaigns.deadline` |

**Drilldown behavior:** Clicking a scatter point or table row opens a campaign detail panel showing:
- Timeline of social posts for this campaign (postDate, platform, impressions, donationReferrals)
- Donation inflow curve (bar chart: donations by week during campaign)
- Goal vs. actual raised (progress bar)
- Top referral posts (top 3 by `donation_referrals`)
- `classificationBand` badge + `recommendedReplicate` flag

**Action buttons:**

| Label | Behavior |
|---|---|
| "Replicate this campaign" | Navigate to `/superadmin/campaigns/new?templateId={campaignId}` |
| "Mark as avoid" | `PATCH /api/superadmin/campaigns/{id}/ml-flags` body: `{ "recommendedAvoid": true }` — updates `ml_prediction_snapshots.context_json` |

**Role visibility:** Super admin only.

**Empty state:** "No campaign data available for the selected period." If ML scores are missing: "Conversion scores not yet available — campaigns will be scored after the next pipeline run. Showing computed conversion ratios only."

---

### W08 — Social Post Conversion Planner

| Field | Value |
|---|---|
| **Widget name** | Social Post Conversion Planner |
| **Page location** | Campaigns & Social page — "Post Planner" tab |
| **Widget type** | Heatmap + recommendation card + post-level table (three sub-views) |

**Source tables:**
- `social_media_posts` — all columns, particularly `day_of_week`, `post_hour`, `platform`, `post_type`, `media_type`, `content_topic`, `donation_referrals`, `engagement_rate`, `impressions`, `is_boosted`, `conversion_prediction_score`, `predicted_referral_count`, `predicted_donation_value_php`, `conversion_band`, `conversion_top_drivers`, `conversion_comparable_post_ids`, `conversion_score_updated_at`
- `donations` — joined via `referral_post_id` (for actual referral confirmation in drilldown)

**Sub-view A: Conversion Heatmap**

Required API endpoint: `GET /api/superadmin/social/heatmap`

Required response:
```json
{
  "data": {
    "cells": [
      { "dayOfWeek": "Monday", "postHour": 20, "avgDonationReferrals": 2.8, "postCount": 14 },
      { "dayOfWeek": "Tuesday", "postHour": 21, "avgDonationReferrals": 3.4, "postCount": 11 },
      ...
    ],
    "minimumPostsForCell": 3
  }
}
```

Cells with `postCount < minimumPostsForCell` should be rendered as gray/hatched (insufficient data). `minimumPostsForCell` is always `3`.

Widget minimum data requirement: if total posts (respecting filters) < 10, return `{ "data": null, "insufficientData": true }`. The UI renders the empty state instead.

**Sub-view B: Recommendation Card**

Required API endpoint: `GET /api/superadmin/social/recommendation`

Required response (single best-predicted post configuration):
```json
{
  "data": {
    "platform": "Facebook",
    "dayOfWeek": "Tuesday",
    "postHour": 20,
    "mediaType": "reel",
    "contentTopic": "resident-story",
    "conversionPredictionScore": 0.87,
    "predictedReferralCount": "3.40",
    "predictedDonationValuePhp": "12500.00",
    "basis": "Highest-scoring recent post with conversion_band = high-converter"
  }
}
```

Source: top row from `social_media_posts` ordered by `conversion_prediction_score DESC` where `conversion_band = 'high-converter'` (respecting current date-range filter).

**Sub-view C: Post-Level Table**

Required API response fields (per row):

| Field | Source | Type |
|---|---|---|
| `postId` | `social_media_posts.post_id` | `integer` |
| `platform` | `social_media_posts.platform` | `string` |
| `dayOfWeek` | `social_media_posts.day_of_week` | `string` |
| `postHour` | `social_media_posts.post_hour` | `integer` |
| `mediaType` | `social_media_posts.media_type` | `string` |
| `contentTopic` | `social_media_posts.content_topic` | `string \| null` |
| `conversionPredictionScore` | `social_media_posts.conversion_prediction_score` | `number \| null` |
| `conversionBand` | `social_media_posts.conversion_band` | `string \| null` |
| `predictedReferralCount` | `social_media_posts.predicted_referral_count` | `string (NUMERIC) \| null` |
| `predictedDonationValuePhp` | `social_media_posts.predicted_donation_value_php` | `string (NUMERIC) \| null` |
| `actualDonationReferrals` | `social_media_posts.donation_referrals` | `integer \| null` |
| `predictedVsActualDelta` | computed | `number \| null` |
| `conversionComparablePostIds` | `social_media_posts.conversion_comparable_post_ids` | `integer[] \| null` |
| `isBoosted` | `social_media_posts.is_boosted` | `boolean` |
| `createdAt` | `social_media_posts.created_at` | `string (ISO 8601)` |

**Computed fields:**
- `predictedVsActualDelta` = `actualDonationReferrals - predictedReferralCount`. Null if either is null.

**Default sort (post-level table):** `conversion_prediction_score DESC NULLS LAST`

**Filters:**

| Param | Type | Options |
|---|---|---|
| `platform` | `string[]` | `Facebook`, `Instagram`, `TikTok`, `YouTube`, `Twitter` |
| `mediaType` | `string[]` | Dynamic from `social_media_posts.media_type` |
| `postType` | `string[]` | Dynamic from `social_media_posts.post_type` |
| `contentTopic` | `string[]` | Dynamic from `social_media_posts.content_topic` |
| `isBoosted` | `boolean` | |
| `conversionBand` | `string[]` | `high-converter`, `moderate`, `engagement-only`, `low` |
| `dateRange` | Standard | Applied to `social_media_posts.created_at` |

**Drilldown behavior (post-level table row):** Side drawer showing:
- Post metadata (platform, URL link if `post_url` is set, `mediaType`, `contentTopic`, `isBoosted`)
- `conversionTopDrivers` rendered as positive/negative factor list
- Actual vs. predicted referral comparison bar
- Linked donation records (via `donations.referral_post_id = postId`): count and total PHP
- `conversionComparablePostIds`: rendered as "Similar high-performing posts" — fetch titles/dates of listed post IDs

**Action buttons (heatmap):**

| Label | Behavior |
|---|---|
| "Schedule post for peak time" | Opens post scheduling form pre-filled with best `dayOfWeek` + `postHour` |
| "Export posting calendar" | `GET /api/superadmin/social/calendar?format=csv` |

**Role visibility:** Super admin + admin.

**Empty state (heatmap):** "Not enough post data to build a heatmap (minimum 10 posts required for the selected filters)."
**Empty state (recommendation card):** "No high-converting posts found in the selected period."
**Empty state (table):** "No posts match the current filters."

---

## Residents & Safehouses Page

Route: `/superadmin/residents`

**Privacy notice displayed at top of page (always visible, non-dismissible):**
> "All resident data is strictly confidential. ML scores are decision-support tools only. Clinical judgment of the assigned social worker overrides all model outputs."

---

### W09 — Resident Regression Overview

| Field | Value |
|---|---|
| **Widget name** | Resident Regression Risk Overview |
| **Page location** | Residents & Safehouses page — "Regression Risk" tab |
| **Widget type** | Stacked bar chart (org-level) + watchlist table (safehouse-scoped) |

**Source tables:**
- `residents` — `resident_id`, `internal_code`, `safehouse_id`, `case_status`, `current_risk_level`, `case_category`, `regression_risk_score`, `regression_risk_band`, `regression_risk_drivers`, `regression_recommended_action`, `regression_score_updated_at`, `ml_scores_restricted`
- `safehouses` — `safehouse_id`, `name`

**Sub-view A: Stacked Bar Chart**

Required API endpoint: `GET /api/superadmin/residents/regression/distribution`

Required response:
```json
{
  "data": [
    {
      "safehouseId": 1,
      "safehouseName": "Safehouse A",
      "bands": {
        "critical": 1,
        "high": 3,
        "moderate": 5,
        "low": 8,
        "stable": 12
      },
      "totalScored": 29,
      "totalRestricted": 2
    }
  ]
}
```

`totalRestricted` is the count of residents excluded due to `ml_scores_restricted = true`. The UI may render a footnote: "[N] resident(s) not shown (scores restricted)."

**Sub-view B: Watchlist Table**

Shown after user clicks a safehouse bar, or when `safehouseId` global filter is set. Residents where `ml_scores_restricted = true` are **excluded entirely** from this response.

Required API response fields (per row):

| Field | Source | Type |
|---|---|---|
| `residentId` | `residents.resident_id` | `integer` |
| `internalCode` | `residents.internal_code` | `string` — rendered in table; never full name at org level |
| `safehouseName` | `safehouses.name` | `string` |
| `regressionRiskScore` | `residents.regression_risk_score` | `number` |
| `regressionRiskBand` | `residents.regression_risk_band` | `string` |
| `topDriverLabel` | computed from `residents.regression_risk_drivers[0].label` | `string \| null` |
| `regressionRecommendedAction` | `residents.regression_recommended_action` | `string \| null` |
| `regressionScoreUpdatedAt` | `residents.regression_score_updated_at` | `string (ISO 8601) \| null` |
| `currentRiskLevel` | `residents.current_risk_level` | `string \| null` |
| `caseCategory` | `residents.case_category` | `string \| null` |
| `mlScoresRestricted` | `residents.ml_scores_restricted` | `boolean` — always `false` in this response (restricted rows excluded) |

**Computed fields:**
- `topDriverLabel` — first item's `label` from `regression_risk_drivers` JSONB array. Null if array is empty or null.

**Default sort:** `regression_risk_score DESC`

**Filters:**

| Param | Type | Options |
|---|---|---|
| `safehouseId` | `integer \| "all"` | Standard global filter |
| `caseCategory` | `string[]` | Dynamic enum from `residents.case_category` |
| `regressionRiskBand` | `string[]` | `critical`, `high`, `moderate`, `low`, `stable` |
| `minRegressionRiskScore` | `number` | 0.0 – 1.0 |
| `caseStatus` | `string[]` | Dynamic enum from `residents.case_status` |
| `page` | `integer` | Default `1` |
| `pageSize` | `integer` | Default `20` |

**Drilldown behavior:** Clicking a row opens a resident risk detail drawer showing:
- `internalCode` (or full name if admin viewing own safehouse)
- Regression risk score gauge with `regressionRiskBand`
- Full `regressionRiskDrivers` array rendered as labeled cards with values
- Score trend chart: historical `prediction_score` from `ml_prediction_snapshots` for `pipelineName = 'resident_regression_risk'` and `entity_id = residentId`, ordered by `created_at`
- `regressionScoreUpdatedAt` shown as "Score updated X days ago"
- Mandatory disclaimer: "This is a discussion aid — clinical judgment of the assigned social worker overrides this score."
- Action buttons

**Action buttons:**

| Label | Behavior |
|---|---|
| "Flag for urgent case conference" | `PATCH /api/superadmin/residents/{id}` body: `{ "regressionRecommendedAction": "urgent-case-conference" }` |
| "Export risk watchlist" | `GET /api/superadmin/residents/regression/export?format=csv` (restricted rows excluded) |

**Role visibility:**
- Super admin: sees all safehouses aggregated; watchlist shows `internalCode` (never full name at org-aggregate level).
- Admin: sees own safehouse only; watchlist shows resident full name (within their safehouse context, named access is appropriate).

**Empty state:** "No residents are currently flagged for regression risk in the selected filters." If no scores computed: "Regression risk scores are not yet available. Run the resident regression pipeline."

---

### W10 — Reintegration Readiness Overview

| Field | Value |
|---|---|
| **Widget name** | Reintegration Readiness Overview |
| **Page location** | Residents & Safehouses page — "Reintegration" tab |
| **Widget type** | Funnel chart (org-level) + ranked readiness table |

**Source tables:**
- `residents` — `resident_id`, `internal_code`, `safehouse_id`, `reintegration_status`, `reintegration_type`, `reintegration_readiness_score`, `reintegration_readiness_band`, `reintegration_readiness_drivers`, `reintegration_recommended_action`, `reintegration_score_updated_at`, `ml_scores_restricted`, `case_category`, `length_of_stay`
- `intervention_plans` — `plan_category`, `status`, `resident_id` (for "In Planning" funnel stage)
- `safehouses` — `name`

**Sub-view A: Funnel Chart**

Funnel stages and their data sources:

| Stage | Label | Count definition |
|---|---|---|
| Stage 1 | Assessed | All active residents with `reintegration_readiness_score IS NOT NULL` and `ml_scores_restricted = false` |
| Stage 2 | Eligible | Residents where `reintegration_readiness_band IN ('ready', 'near-ready')` |
| Stage 3 | In Planning | Residents with an `intervention_plans` row where `plan_category = 'reintegration'` AND `status IN ('draft', 'in-progress')` |
| Stage 4 | Reintegrated | Residents where `reintegration_status = 'reintegrated'` (within the selected date range, by `date_closed`) |

Required API endpoint: `GET /api/superadmin/residents/reintegration/funnel`

Required response:
```json
{
  "data": {
    "stages": [
      { "stage": "Assessed",      "count": 38, "safehouseBreakdown": [{ "safehouseId": 1, "safehouseName": "A", "count": 14 }] },
      { "stage": "Eligible",      "count": 14, "safehouseBreakdown": [...] },
      { "stage": "In Planning",   "count": 3,  "safehouseBreakdown": [...] },
      { "stage": "Reintegrated",  "count": 9,  "safehouseBreakdown": [...] }
    ]
  }
}
```

**Sub-view B: Ranked Readiness Table**

Residents where `ml_scores_restricted = true` are **excluded entirely**. Required API response fields (per row):

| Field | Source | Type |
|---|---|---|
| `residentId` | `residents.resident_id` | `integer` |
| `internalCode` | `residents.internal_code` | `string` |
| `safehouseName` | `safehouses.name` | `string` |
| `reintegrationReadinessScore` | `residents.reintegration_readiness_score` | `number \| null` |
| `reintegrationReadinessBand` | `residents.reintegration_readiness_band` | `string \| null` |
| `topPositiveIndicator` | computed from `reintegration_readiness_drivers.positive[0].label` | `string \| null` |
| `topBarrier` | computed from `reintegration_readiness_drivers.barriers[0].label` | `string \| null` |
| `reintegrationRecommendedAction` | `residents.reintegration_recommended_action` | `string \| null` |
| `reintegrationScoreUpdatedAt` | `residents.reintegration_score_updated_at` | `string (ISO 8601) \| null` |
| `lengthOfStay` | `residents.length_of_stay` | `string \| null` |
| `reintegrationType` | `residents.reintegration_type` | `string \| null` |
| `caseCategory` | `residents.case_category` | `string \| null` |

**Default sort:** `reintegration_readiness_score DESC NULLS LAST`

**Filters:**

| Param | Type | Notes |
|---|---|---|
| `safehouseId` | Standard global filter | |
| `reintegrationType` | `string[]` | Dynamic enum from `residents.reintegration_type` |
| `reintegrationReadinessBand` | `string[]` | `ready`, `near-ready`, `in-progress`, `not-ready` |
| `regressionRiskBand` | `string[]` | `critical`, `high`, `moderate`, `low`, `stable` — cross-filter residents who are also at regression risk |
| `minReadinessScore` | `number` (0.0–1.0) | Slider minimum |
| `reintegrationStatus` | `string[]` | Dynamic enum from `residents.reintegration_status` |
| `caseCategory` | `string[]` | Dynamic enum from `residents.case_category` |
| `minLengthOfStay` | `string` | ISO duration or integer days — lower bound inclusive |
| `maxLengthOfStay` | `string` | ISO duration or integer days — upper bound inclusive |
| `page` / `pageSize` | Standard | |

**Drilldown behavior:** Side drawer showing:
- Full `reintegrationReadinessDrivers` — both `positive` array and `barriers` array rendered in two columns
- Score history from `ml_prediction_snapshots` (pipelineName = `reintegration_readiness`)
- Linked home visitation summary: last 3 visits, `familyCooperationLevel`, `safetyConcernsNoted`
- Disclaimer (same as W09)

**Action buttons:**

| Label | Behavior |
|---|---|
| "Schedule reintegration case conference" | `PATCH /api/superadmin/residents/{id}` body: `{ "reintegrationRecommendedAction": "schedule-conference" }` |
| "Assign reintegration social worker" | `PATCH /api/superadmin/residents/{id}` body: `{ "reintegrationRecommendedAction": "prepare-plan" }` |
| "Mark readiness reviewed" | `PATCH /api/superadmin/residents/{id}` body: `{ "reintegrationRecommendedAction": "monitor" }` |

**Role visibility:** Same as W09 — super admin sees org-wide with internal codes; admin sees own safehouse with full names.

**Empty state (funnel):** "No residents have been assessed for reintegration readiness."
**Empty state (table):** "No residents match the current filters."

---

### W11 — Intervention Effectiveness Matrix

| Field | Value |
|---|---|
| **Widget name** | Intervention Effectiveness Matrix |
| **Page location** | Residents & Safehouses page — "Interventions" tab |
| **Widget type** | Ranked heatmap table (aggregated) + detail panel (drilldown) |

**Source tables:**
- `intervention_plans` — `plan_id`, `resident_id`, `plan_category`, `services_provided`, `status`, `effectiveness_outcome_score`, `effectiveness_band`, `effectiveness_outcome_drivers`, `effectiveness_score_updated_at`, `updated_at`
- `residents` — `resident_id`, `safehouse_id`
- `safehouses` — `safehouse_id`, `name`

**Scope:** Only rows where `intervention_plans.status = 'completed'` AND `effectiveness_outcome_score IS NOT NULL` are included.

**Sub-view A: Heatmap Table**

Required API endpoint: `GET /api/superadmin/interventions/effectiveness`

Required response (one row per `planCategory`):
```json
{
  "data": [
    {
      "planCategory": "Psychological",
      "planCount": 42,
      "avgEffectivenessScore": 0.78,
      "avgHealthScoreDelta": 11.4,
      "avgEducationProgressDelta": 3.2,
      "avgSessionProgressRate": 0.82,
      "effectivenessBandDistribution": {
        "high-impact": 28,
        "moderate": 12,
        "low-impact": 2,
        "insufficient-data": 0
      }
    }
  ]
}
```

**Computed fields:**
- `avgHealthScoreDelta` — average of `effectiveness_outcome_drivers[dimension='health_score'].delta` across plans in this category.
- `avgEducationProgressDelta` — same for `dimension='education_progress'`.
- `avgSessionProgressRate` — average of `effectiveness_outcome_drivers[dimension='session_progress'].delta` or similar.
- `effectivenessBandDistribution` — count of each `effectiveness_band` value within this `planCategory`.

**Heatmap coloring:** Cell background color is mapped from `avgEffectivenessScore`: 0.0–0.4 = red, 0.4–0.7 = yellow, 0.7–1.0 = green.

**Default sort:** `avgEffectivenessScore DESC`

**Filters:**

| Param | Type |
|---|---|
| `planCategory` | `string[]` — multi-select; dynamic from `intervention_plans.plan_category` |
| `safehouseId` | Standard global filter |
| `dateRange` | Applied to `intervention_plans.updated_at` |
| `effectivenessBand` | `string[]` — `high-impact`, `moderate`, `low-impact`, `insufficient-data` |

**Drilldown behavior:** Clicking a `planCategory` row opens a detail panel:
- List of completed plans in that category: `planId`, `servicesProvided` (truncated), `effectivenessOutcomeScore`, top driver label, resident internal code (or name for admin), safehouse name
- Each plan row is clickable to view full `effectivenessOutcomeDrivers`

**Action buttons:**

| Label | Behavior | Note |
|---|---|---|
| "Mark as standard practice" | Future — no column exists yet. Renders a grayed-out "Coming soon" button. Flag in contract as: needs `is_standard_practice BOOLEAN` column on `intervention_plans` in a future schema task. | Future column |
| "Share with all admins" | `POST /api/superadmin/interventions/{category}/share-summary` — sends summary email to all admin users | |

**Role visibility:** Super admin sees all safehouses aggregated. Admin sees their own safehouse only.

**Empty state:** "No completed intervention plans with outcome scores match the selected filters."

---

### W12 — Safehouse Comparison Cards

| Field | Value |
|---|---|
| **Widget name** | Safehouse Health Comparison |
| **Page location** | Residents & Safehouses page — "Safehouse Health" tab |
| **Widget type** | Leaderboard table + radar chart (compare mode) |

**Source tables:**
- `safehouse_monthly_metrics` — `safehouse_id`, `month_start`, `composite_health_score`, `peer_rank`, `health_band`, `trend_direction`, `health_score_drivers`, `incident_severity_distribution`, `health_score_computed_at`, `health_score_run_id`, `avg_health_score`, `avg_education_progress`, `incident_count`, `process_recording_count`, `home_visitation_count`, `active_residents`
- `safehouses` — `safehouse_id`, `name`, `safehouse_code`, `status`, `region`, `city`

**Sub-view A: Leaderboard Table**

Required API endpoint: `GET /api/superadmin/safehouses/health`

Required response fields (per row, one per safehouse, for the selected month):

| Field | Source | Type |
|---|---|---|
| `safehouseId` | `safehouse_monthly_metrics.safehouse_id` | `integer` |
| `safehouseName` | `safehouses.name` | `string` |
| `safehouseCode` | `safehouses.safehouse_code` | `string \| null` |
| `region` | `safehouses.region` | `string \| null` |
| `compositeHealthScore` | `safehouse_monthly_metrics.composite_health_score` | `number \| null` |
| `peerRank` | `safehouse_monthly_metrics.peer_rank` | `integer \| null` |
| `healthBand` | `safehouse_monthly_metrics.health_band` | `string \| null` |
| `trendDirection` | `safehouse_monthly_metrics.trend_direction` | `string \| null` |
| `topDriverLabel` | computed from `health_score_drivers[0].label` | `string \| null` |
| `incidentSeverityDistribution` | `safehouse_monthly_metrics.incident_severity_distribution` | `object \| null` |
| `healthScoreComputedAt` | `safehouse_monthly_metrics.health_score_computed_at` | `string (ISO 8601) \| null` |
| `activeResidents` | `safehouse_monthly_metrics.active_residents` | `integer \| null` |

**Default sort:** `peer_rank ASC NULLS LAST`

**Filters:**

| Param | Type | Options |
|---|---|---|
| `monthStart` | `string (ISO date)` | Defaults to most recent available month |
| `status` | `string[]` | `active`, `closed` |
| `region` | `string[]` | Dynamic from `safehouses.region` |

**Sub-view B: Radar Chart (Compare Mode)**

Activated when `compareMode = true` and exactly two safehouses are selected. The UI shows a safehouse selector to pick both safehouses.

Required API endpoint: `GET /api/superadmin/safehouses/health/compare?safehouseIdA={a}&safehouseIdB={b}&monthStart={date}`

Required response:
```json
{
  "data": {
    "safehouseA": {
      "safehouseId": 1,
      "safehouseName": "Safehouse A",
      "axes": {
        "avgHealthScore": 82.4,
        "avgEducationProgress": 74.1,
        "incidentCountInverted": 91.0,
        "processRecordingCount": 68,
        "homeVisitationCount": 24
      }
    },
    "safehouseB": {
      "safehouseId": 3,
      "safehouseName": "Safehouse C",
      "axes": {
        "avgHealthScore": 71.2,
        "avgEducationProgress": 68.4,
        "incidentCountInverted": 75.0,
        "processRecordingCount": 52,
        "homeVisitationCount": 18
      }
    }
  }
}
```

`incidentCountInverted` = `100 - (incidentCount / maxIncidentCount * 100)` across the current period — higher is better.

**Drilldown behavior (leaderboard row click):** Opens safehouse detail panel showing:
- 12-month `compositeHealthScore` trend line (12 rows from `safehouse_monthly_metrics`)
- `incidentSeverityDistribution` rendered as a stacked bar
- Full `healthScoreDrivers` list (ranked by `weight DESC`)
- Peer rank history table (rank per month for last 6 months)
- `healthScoreComputedAt` freshness indicator

**Action buttons:**

| Label | Behavior |
|---|---|
| "Flag for leadership review" | `POST /api/superadmin/safehouses/{id}/flags` body: `{ "flagType": "leadership-review" }` |
| "Compare with another safehouse" | Activates compare mode; opens safehouse selector |
| "Export quarterly report" | `GET /api/superadmin/safehouses/{id}/report?format=pdf&month={monthStart}` |

**Role visibility:** Super admin only (cross-safehouse ranking). Admin sees a single-safehouse view of their own metrics — no `peerRank`, no compare mode, no leaderboard. Admin endpoint: `GET /api/admin/safehouses/health` (scoped to their `safehouseId`).

**Empty state:** "No health scores computed for the selected period. Run the safehouse health pipeline first."

---

## Model Operations Page

Route: `/superadmin/ml`

---

### W13 — Model Health & Freshness Dashboard

| Field | Value |
|---|---|
| **Widget name** | Model Health & Freshness Dashboard |
| **Page location** | Model Operations page (dedicated page, all four sub-views) |
| **Widget type** | Pipeline status table + freshness monitor + score distribution histograms + band distribution charts |

**Source tables:**
- `ml_pipeline_runs` — all columns including `scored_entity_count`, `feature_importance_json`
- `ml_prediction_snapshots` — aggregated per pipeline: latest `created_at`, count, score distribution, `band_label` distribution

**Freshness thresholds (days since last successful prediction insert):**

| Pipeline | Alert threshold |
|---|---|
| `donor_churn_risk` | 8 days |
| `resident_regression_risk` | 8 days |
| `safehouse_health_score` | 35 days |
| `reintegration_readiness` | 35 days |
| `donor_upgrade_likelihood` | 35 days |
| `social_post_conversion` | 35 days |
| `donation_attribution` | 35 days |
| `intervention_effectiveness` | 35 days |

**Sub-view A: Pipeline Status Table**

Required API endpoint: `GET /api/superadmin/ml/pipelines`

Required response fields (per row, one per `pipelineName`, latest run only):

| Field | Source | Type |
|---|---|---|
| `runId` | `ml_pipeline_runs.run_id` | `integer` |
| `pipelineName` | `ml_pipeline_runs.pipeline_name` | `string` |
| `displayName` | `ml_pipeline_runs.display_name` | `string \| null` |
| `modelName` | `ml_pipeline_runs.model_name` | `string \| null` |
| `status` | `ml_pipeline_runs.status` | `string` |
| `trainedAt` | `ml_pipeline_runs.trained_at` | `string (ISO 8601)` |
| `scoredEntityCount` | `ml_pipeline_runs.scored_entity_count` | `integer \| null` |
| `dataSource` | `ml_pipeline_runs.data_source` | `string \| null` |
| `metricsF1` | `ml_pipeline_runs.metrics_json.f1` | `number \| null` |
| `metricsPrecision` | `ml_pipeline_runs.metrics_json.precision` | `number \| null` |
| `metricsRecall` | `ml_pipeline_runs.metrics_json.recall` | `number \| null` |
| `metricsRmse` | `ml_pipeline_runs.metrics_json.rmse` | `number \| null` — for regression pipelines |
| `freshnessDaysSinceLastPrediction` | computed | `integer \| null` |
| `freshnessStatus` | computed | `"ok" \| "stale" \| "never-run"` |

**Computed fields:**
- `freshnessDaysSinceLastPrediction` = days between today and `MAX(ml_prediction_snapshots.created_at)` for this `pipeline_name`.
- `freshnessStatus` = `"never-run"` if no snapshots exist; `"stale"` if days exceed threshold for this pipeline; `"ok"` otherwise.

**Default sort:** `trainedAt DESC`

**Sub-view B: Freshness Monitor**

A visual grid of pipeline freshness indicators — one card per pipeline. Each card shows:
- `displayName`
- `freshnessDaysSinceLastPrediction` as "X days ago" or "Never run"
- A color indicator: green (`"ok"`), yellow (within 2× threshold), red (`"stale"` or `"never-run"`)
- `scoredEntityCount` as "N entities scored"

Data source: same as pipeline status table, no additional endpoint required.

**Sub-view C: Score Distribution Histograms**

Required API endpoint: `GET /api/superadmin/ml/score-distribution?pipelineName={name}`

Required response:
```json
{
  "data": {
    "pipelineName": "donor_churn_risk",
    "runId": 14,
    "buckets": [
      { "bucket": 0.0, "count": 12 },
      { "bucket": 0.1, "count": 28 },
      { "bucket": 0.2, "count": 41 },
      ...
      { "bucket": 0.9, "count": 8 }
    ]
  }
}
```

Buckets are `FLOOR(prediction_score * 10) / 10`, covering `[0.0, 0.1, 0.2, ..., 0.9]`. Source: `ml_prediction_snapshots` for the latest run of the given pipeline.

**Sub-view D: Band Label Distribution**

Required API endpoint: `GET /api/superadmin/ml/band-distribution?pipelineName={name}`

Required response:
```json
{
  "data": {
    "pipelineName": "donor_churn_risk",
    "runId": 14,
    "bands": [
      { "bandLabel": "at-risk",  "count": 12 },
      { "bandLabel": "watching", "count": 34 },
      { "bandLabel": "stable",   "count": 89 },
      { "bandLabel": "growing",  "count": 21 }
    ]
  }
}
```

Source: `ml_prediction_snapshots.band_label` for the latest run, grouped by `band_label`.

**Filters:**

| Param | Type |
|---|---|
| `pipelineName` | `string[]` — multi-select (defaults to all pipelines) |
| `status` | `string[]` — `completed`, `failed`, `running` |
| `trainedAtStart` / `trainedAtEnd` | ISO date range |

**Drilldown behavior (pipeline status table row):** Opens a run detail panel showing:
- Full `metricsJson` rendered as a labeled key-value table
- `manifestJson` rendered as a collapsible JSON viewer
- `feature_importance_json` rendered as a horizontal bar chart: feature label on Y axis, importance value on X axis (top 10 features)

**Action buttons:** None. This page is read-only monitoring.

**Role visibility:** Super admin only.

**Empty state (per pipeline row):** "No runs recorded for this pipeline."
**Empty state (score distribution):** "No predictions available for this pipeline."

---

## Appendix: JSONB Field Schemas

Canonical shapes for all JSONB columns referenced in this document. The API must return these exact shapes — do not flatten or rename fields.

---

### `churn_top_drivers` / `upgrade_top_drivers`

Used in: W04 (churn), W05 (upgrade), `supporters` table.

```json
[
  { "driver": "no_donation_90d",       "label": "No donation in 90 days",                  "weight": 0.42 },
  { "driver": "recurring_lapsed",       "label": "Recurring giving lapsed 60 days ago",       "weight": 0.31 },
  { "driver": "campaign_engagement_low","label": "Campaign engagement dropped 80% this year", "weight": 0.19 }
]
```

- `driver` — machine-readable identifier (snake_case)
- `label` — human-readable explanation string (for display)
- `weight` — float 0–1, relative contribution to the score
- Maximum 3 items. Sorted by `weight DESC`.

---

### `regression_risk_drivers`

Used in: W09, `residents` table.

```json
[
  { "driver": "concerns_flagged_3sessions", "label": "Concerns flagged in 3 of last 4 sessions", "value": 3 },
  { "driver": "health_score_decline",       "label": "Health score down 18 pts over 6 weeks",    "value": -18 },
  { "driver": "critical_incident_14d",      "label": "1 critical incident in the past 14 days",   "value": 1 }
]
```

- `value` — the raw feature value (integer or float) that triggered the driver; used for contextual display ("down 18 pts" vs. "flagged 3 times")
- Maximum 3 items.

---

### `reintegration_readiness_drivers`

Used in: W10, `residents` table.

```json
{
  "positive": [
    { "driver": "family_cooperation_high", "label": "Family cooperation: high on last 3 visits" },
    { "driver": "no_incidents_90d",        "label": "No safety concerns in 90 days" },
    { "driver": "education_completed",     "label": "Education: completionStatus = completed" }
  ],
  "barriers": [
    { "driver": "overdue_plan",            "label": "1 overdue intervention plan" },
    { "driver": "health_score_low",        "label": "Health score below 60 (threshold: 70)" }
  ]
}
```

- `positive` — up to 3 items; factors supporting readiness
- `barriers` — up to 3 items; factors delaying readiness

---

### `effectiveness_outcome_drivers`

Used in: W11, `intervention_plans` table.

```json
[
  { "dimension": "health_score",        "label": "Average health score increased 12 pts",  "delta": 12.0 },
  { "dimension": "education_progress",  "label": "Education progress: 22% → 68%",           "delta": 46.0 },
  { "dimension": "session_progress",    "label": "Progress noted in 85% of sessions",        "delta": 0.85 }
]
```

- `delta` — the magnitude of improvement. Positive = improvement. Units depend on `dimension` (score points for health/education, fraction for session rates).

---

### `health_score_drivers`

Used in: W03, W12, `safehouse_monthly_metrics` table.

```json
[
  { "metric": "incident_count",         "label": "Incident count above 3-month average", "impact": "negative", "weight": 0.28 },
  { "metric": "avg_health_score",       "label": "Average health score improved 5 pts",   "impact": "positive", "weight": 0.24 },
  { "metric": "process_recording_count","label": "Process recording sessions below target","impact": "negative", "weight": 0.18 }
]
```

- `impact` — `"positive"` (raised the score) or `"negative"` (lowered the score)
- `weight` — relative contribution to the composite score change
- Maximum 5 items. Sorted by `|weight| DESC`.

---

### `conversion_top_drivers`

Used in: W08, `social_media_posts` table.

```json
[
  { "driver": "has_call_to_action", "direction": "positive", "label": "Has a donate CTA" },
  { "driver": "is_reel",            "direction": "positive", "label": "Video format (Reel)" },
  { "driver": "caption_too_long",   "direction": "negative", "label": "Caption > 500 characters" }
]
```

- `direction` — `"positive"` (raised conversion score) or `"negative"` (lowered it)
- Maximum 5 items (3 positive, 2 negative, or any split summing to ≤ 5).

---

### `conversion_comparable_post_ids`

Used in: W08, `social_media_posts` table.

```json
[42, 118, 203]
```

Plain array of `post_id` integers. Maximum 3 items. The UI fetches minimal post metadata for display: `GET /api/superadmin/social/posts?ids=42,118,203`.

---

### `incident_severity_distribution`

Used in: W12, `safehouse_monthly_metrics` table.

```json
{ "critical": 1, "high": 2, "medium": 4, "low": 3 }
```

All four keys must always be present. Zero counts are `0`, not omitted.

---

### `feature_importance_json`

Used in: W13, `ml_pipeline_runs` table.

```json
[
  { "feature": "days_since_last_donation", "importance": 0.38, "label": "Days since last donation" },
  { "feature": "recurring_lapsed",         "importance": 0.22, "label": "Recurring giving lapsed" },
  { "feature": "campaign_engagement_rate", "importance": 0.17, "label": "Campaign engagement rate" }
]
```

- `importance` — float 0–1; relative feature importance from the model (e.g., Gini importance or SHAP mean absolute value)
- Sorted by `importance DESC`. Maximum 10 items (top 10 features only).

---

### `contextJson` — by `pipelineName`

These are the shapes stored in `ml_prediction_snapshots.context_json`. The API reads these when building drilldown drawers.

**`pipelineName = "donor_churn_risk"`**
```json
{
  "churnRiskScore": 0.83,
  "churnBand": "at-risk",
  "topDrivers": [{ "driver": "...", "label": "...", "weight": 0.42 }],
  "daysSinceLastDonation": 143,
  "countLast90d": 0,
  "avgAmount": "2500.00",
  "recommendedAction": "send-email"
}
```

**`pipelineName = "donor_upgrade_likelihood"`**
```json
{
  "upgradeScore": 0.76,
  "upgradeBand": "high-potential",
  "topDrivers": [{ "driver": "...", "label": "...", "weight": 0.38 }],
  "suggestedAskBand": "₱3,000–₱4,500",
  "comparableDonorIds": [55, 101, 203],
  "recommendedAction": "generate-upgrade-ask"
}
```

**`pipelineName = "campaign_effectiveness"`**
```json
{
  "conversionRatio": 0.68,
  "classificationBand": "moderate",
  "engagementToConversionRatio": 3.2,
  "topReferralPlatform": "Facebook",
  "recommendedReplicate": true
}
```

**`pipelineName = "resident_regression_risk"`**
```json
{
  "riskScore": 0.91,
  "riskBand": "critical",
  "topDrivers": [{ "driver": "...", "label": "...", "value": 3 }],
  "lastSessionConcernFlag": true,
  "healthTrend": "declining",
  "incidentCount90d": 1,
  "recommendedAction": "urgent-case-conference"
}
```
