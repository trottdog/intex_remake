# Super Admin ML Dashboard — Backend Endpoints Reference

**Date:** 2026-04-09  
**Source route file:** `artifacts/api-server/src/routes/superadminMl.ts`  
**Schema files updated:** 9 Drizzle schema files in `lib/db/src/schema/`

All endpoints are mounted under the Express router and served at `/api` prefix (via the Replit proxy). All require a valid `Authorization: Bearer <jwt>` header. Role violations return `403 Forbidden` with envelope `{ "error": { "code": "FORBIDDEN", "message": "..." } }`.

---

## Conventions

| Convention | Detail |
|---|---|
| **Monetary values** | Returned as `string` in NUMERIC format, e.g. `"12500.00"`. Never float. |
| **Timestamps** | ISO 8601 with timezone, e.g. `"2026-03-15T08:30:00.000Z"` |
| **Scores** | JavaScript `number` (float64), range 0–1 unless noted |
| **JSONB fields** | Returned as parsed JSON objects/arrays, not strings |
| **Paginated envelope** | `{ "data": [...], "meta": { page, pageSize, total }, "pagination": { total, page, limit, totalPages } }` |
| **Aggregate envelope** | `{ "data": { ... } }` |
| **Error envelope** | `{ "error": { "code": "INTERNAL_ERROR" \| "FORBIDDEN" \| "NOT_FOUND" \| "VALIDATION_ERROR", "message": "..." } }` |

---

## Global Filter Parameters

These are accepted (and silently ignored where not applicable) on all endpoints:

| Param | Type | Default | Notes |
|---|---|---|---|
| `safehouseId` | `integer \| "all"` | `"all"` | Admin-role users are restricted to their own safehouse |
| `dateRange` | `string` | `"90d"` | `"30d"`, `"90d"`, `"6mo"`, `"12mo"`, `"custom"` |
| `dateStart` | `ISO date` | — | Required when `dateRange = "custom"` |
| `dateEnd` | `ISO date` | — | Required when `dateRange = "custom"` |
| `compareMode` | `boolean` | `false` | Used only by W12 compare endpoint |

---

## Overview Page Endpoints

### W01 — Action Queue Summary

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/overview/action-queue` |
| **Role** | `super_admin` |
| **Filters** | None — always current state |
| **Source columns** | `ml_prediction_snapshots.band_label`, `ml_prediction_snapshots.prediction_score`, `supporters.display_name`, `residents.ml_scores_restricted`, `safehouse_monthly_metrics.health_band` |

**Response shape:**
```json
{
  "data": {
    "churnAlert": {
      "atRiskCount": 2,
      "topThree": [
        { "supporterId": 1, "displayName": "Carlos Reyes", "churnBand": "at-risk" }
      ]
    },
    "regressionAlert": { "criticalOrHighCount": 1 },
    "safehouseAlert": { "atRiskOrCriticalCount": 0, "safehouseNames": [] }
  }
}
```

**Empty state:** All three counts are zero — UI renders "No urgent alerts at this time."  
**Privacy:** Restricted residents (`ml_scores_restricted = true`) excluded from regression count.

---

### W02 — Funding Gap KPI + Sparkline

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/overview/funding-gap` |
| **Role** | `super_admin` |
| **Filters** | Ignores all global filters |
| **Source columns** | `public_impact_snapshots.projected_gap_php_30d`, `public_impact_snapshots.funding_gap_band`, `public_impact_snapshots.funding_gap_updated_at`, `public_impact_snapshots.snapshot_date`, `donations.donation_date`, `donations.amount` |

**Response shape:**
```json
{
  "data": {
    "latestSnapshot": {
      "projectedGapPhp30d": "-320000.00",
      "fundingGapBand": "major-gap",
      "fundingGapUpdatedAt": "2026-04-07T06:00:00.000Z",
      "snapshotDate": "2026-04-01"
    },
    "sparkline": [
      { "month": "2025-05", "totalDonationsPhp": "185000.00" }
    ]
  }
}
```

**Empty state:** `latestSnapshot = null` when no snapshot has `funding_gap_updated_at`. Sparkline may be partial.

---

### W03 — Safehouse Health Leaderboard (Mini)

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/overview/safehouse-health-mini` |
| **Role** | `super_admin` \| `admin` |
| **Filters** | Respects admin safehouse restriction |
| **Source columns** | `safehouse_monthly_metrics.composite_health_score`, `safehouse_monthly_metrics.health_band`, `safehouse_monthly_metrics.trend_direction`, `safehouse_monthly_metrics.peer_rank`, `safehouses.name` |

**Response shape:**
```json
{
  "data": [
    {
      "safehouseId": 1,
      "safehouseName": "Safehouse A",
      "compositeHealthScore": 0.84,
      "healthBand": "healthy",
      "trendDirection": "improving",
      "peerRank": 1
    }
  ]
}
```

**Default sort:** `peer_rank ASC`. Max 5 rows.  
**Empty state:** Empty array when no `composite_health_score` exists.

---

## Donors Page Endpoints

### W04 — Donor Churn Table

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/donors/churn` |
| **Role** | `super_admin` \| `admin` |
| **Pagination** | `page`, `pageSize` (default 20, max 100) |
| **Source columns** | `supporters.churn_risk_score`, `supporters.churn_band`, `supporters.churn_top_drivers`, `supporters.churn_recommended_action`, `supporters.churn_score_updated_at`, `donations.donation_date`, `donations.amount` |

**Query params:**

| Param | Type | Description |
|---|---|---|
| `churnBand` | `string` (comma-sep) | `at-risk`, `watching`, `stable`, `growing` |
| `acquisitionChannel` | `string` (comma-sep) | Dynamic enum from `supporters.acquisition_channel` |
| `region` | `string` (comma-sep) | Dynamic enum from `supporters.region` |
| `recurringEnabled` | `boolean` | `true` \| `false` |
| `safehousePreference` | `integer` | Donors who gave to this safehouse |
| `sortBy` | `string` | `churn_risk_score` (default), `last_donation_date`, `days_since_last_donation` |
| `sortDir` | `string` | `asc` \| `desc` |

**Response shape (per row):**
```json
{
  "supporterId": 1,
  "displayName": "Carlos Reyes",
  "email": "carlos@example.com",
  "churnRiskScore": 0.82,
  "churnBand": "at-risk",
  "churnTopDrivers": [{ "driver": "no_donation_90d", "label": "No donation in 90 days", "weight": 0.42 }],
  "churnRecommendedAction": "send-email",
  "churnScoreUpdatedAt": "2026-04-07T00:00:00.000Z",
  "lastDonationDate": "2025-12-01",
  "lastDonationAmount": "2500.00",
  "daysSinceLastDonation": 129,
  "acquisitionChannel": "event",
  "region": "NCR",
  "recurringEnabled": false
}
```

**Privacy:** Admin role receives `email = "***@***.***"`. Admin also filtered to donors who gave to their assigned safehouse.  
**Empty state:** Empty `data` array.

---

### W04 Drilldown — Recent Donations for a Supporter

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/donors/:id/donations-recent` |
| **Role** | `super_admin` \| `admin` |
| **Source columns** | `donations.donation_date`, `donations.amount`, `donations.channel_source`, `donations.campaign_name` |

Returns the last 5 donations for a given `supporterId`.

---

### W05 — Donor Upgrade Board

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/donors/upgrade` |
| **Role** | `super_admin` only |
| **Pagination** | `page`, `pageSize` (default 20) |
| **Source columns** | `supporters.upgrade_likelihood_score`, `supporters.upgrade_band`, `supporters.upgrade_top_drivers`, `supporters.upgrade_recommended_ask_band`, `supporters.upgrade_score_updated_at`, `donations.amount` |

**Query params:**

| Param | Type | Description |
|---|---|---|
| `upgradeBand` | `string` (comma-sep) | `high-potential`, `medium`, `low`, `not-ready` |
| `minUpgradeScore` | `number` | 0.0–1.0 |
| `recurringEnabled` | `boolean` | |
| `acquisitionChannel` | `string` (comma-sep) | |
| `minAvgQuarterlyAmount` | `number` | PHP threshold |

**Response shape (per row):**
```json
{
  "supporterId": 2,
  "displayName": "Ana Santos",
  "upgradeLikelihoodScore": 0.76,
  "upgradeBand": "high-potential",
  "upgradeRecommendedAskBand": "₱3,000–₱4,500",
  "upgradeTopDrivers": [...],
  "upgradeScoreUpdatedAt": "2026-04-07T00:00:00.000Z",
  "avgQuarterlyAmountPhp": "3250.00",
  "lifetimeTotalAmountPhp": "47500.00",
  "donationAmountTrend": "increasing",
  "recurringEnabled": true,
  "acquisitionChannel": "online"
}
```

**Default sort:** `upgrade_likelihood_score DESC NULLS LAST`

---

### W06 — Donation-to-Impact Attribution

#### Sankey Diagram

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/attribution/sankey` |
| **Role** | `super_admin` |
| **Filters** | `dateRange` / `dateStart` / `dateEnd` |
| **Source columns** | `donations.attributed_outcome_score`, `donations.attribution_run_id`, `donation_allocations.program_area`, `donation_allocations.amount_allocated`, `donation_allocations.safehouse_id`, `supporters.display_name`, `safehouses.name` |

**Response:** Nodes + links for Sankey diagram with `disclaimer` (non-dismissible) and `windowLabel`.

#### Program KPI Cards

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/attribution/programs` |
| **Role** | `super_admin` |
| **Query params** | `programArea`, `safehouseId`, `dateRange`, `campaignId`, `donationType` |
| **Source columns** | `donation_allocations.program_area`, `donation_allocations.amount_allocated`, `donations.attributed_outcome_score` |

**Response (per program area):**
```json
{
  "programArea": "Education",
  "totalAllocatedPhp": "320000.00",
  "avgAttributedOutcomeScore": 0.74,
  "safehouseCount": 3,
  "healthScoreDelta": null,
  "educationProgressDelta": null
}
```

#### Attribution Export

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/attribution/export` |
| **Role** | `super_admin` |
| **Filters** | `dateRange` / `dateStart` / `dateEnd` |

Returns flat donation records with attribution data for CSV export (up to 5,000 rows).

---

## Campaigns & Social Page Endpoints

### W07 — Campaign Movement vs. Noise

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/campaigns/effectiveness` |
| **Role** | `super_admin` |
| **Filters** | `category`, `status`, `isBoosted`, `platform`, `dateRange` |
| **Source columns** | `ml_prediction_snapshots.prediction_score` (pipeline `campaign_effectiveness`), `ml_prediction_snapshots.band_label`, `ml_prediction_snapshots.context_json` (`.classification_band`, `.recommended_replicate`), `donations.amount`, `social_media_posts.engagement_rate`, `social_media_posts.impressions` |

**Note:** Campaign ML columns sourced from `ml_prediction_snapshots.context_json` (campaigns table not in approved ML extension list).

**Response (per campaign):**
```json
{
  "campaignId": 1,
  "title": "Bridges to Safety",
  "category": "fundraising",
  "status": "active",
  "goal": "500000.00",
  "totalRaisedPhp": "322000.00",
  "uniqueDonors": 14,
  "avgEngagementRate": 0.048,
  "totalImpressions": 82000,
  "conversionRatio": 0.68,
  "classificationBand": "moderate",
  "recommendedReplicate": true,
  "deadline": "2026-06-30"
}
```

**Fallback:** `conversionRatio = totalRaisedPhp / goal` when ML score unavailable.  
**Empty state:** Empty array when no campaigns match filters.

---

### W08 — Social Post Conversion Planner

#### Heatmap

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/social/heatmap` |
| **Role** | `super_admin` \| `admin` |
| **Filters** | `platform`, `dateRange` |
| **Source columns** | `social_media_posts.day_of_week`, `social_media_posts.post_hour`, `social_media_posts.donation_referrals` |

**Response:** `{ "data": { "cells": [...], "minimumPostsForCell": 3 } }`  
**Minimum data:** If total posts < 10: `{ "data": null, "insufficientData": true }`

#### Recommendation Card

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/social/recommendation` |
| **Role** | `super_admin` \| `admin` |
| **Filters** | `dateRange` |
| **Source columns** | `social_media_posts.conversion_prediction_score`, `social_media_posts.conversion_band`, `social_media_posts.predicted_referral_count`, `social_media_posts.predicted_donation_value_php`, `social_media_posts.media_type`, `social_media_posts.content_topic` |

Returns the single highest-scoring post with `conversion_band = 'high-converter'`.  
**Empty state:** `{ "data": null }` when no high-converter posts found.

#### Post-Level Table

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/social/posts` |
| **Role** | `super_admin` \| `admin` |
| **Pagination** | `page`, `pageSize` (default 20, max 100) |
| **Filters** | `platform`, `mediaType`, `postType`, `contentTopic`, `isBoosted`, `conversionBand`, `dateRange`, `ids` (comma-sep post IDs for comparable posts lookup) |
| **Source columns** | `social_media_posts.conversion_prediction_score`, `social_media_posts.conversion_band`, `social_media_posts.predicted_referral_count`, `social_media_posts.predicted_donation_value_php`, `social_media_posts.conversion_top_drivers`, `social_media_posts.conversion_comparable_post_ids`, `social_media_posts.conversion_score_updated_at` |

**Computed field:** `predictedVsActualDelta = actualDonationReferrals - predictedReferralCount`  
**Default sort:** `conversion_prediction_score DESC NULLS LAST`

---

## Residents & Safehouses Page Endpoints

### W09 — Resident Regression Overview

#### Distribution (Stacked Bar)

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/residents/regression/distribution` |
| **Role** | `super_admin` \| `admin` |
| **Filters** | Respects admin safehouse restriction |
| **Source columns** | `residents.regression_risk_band`, `residents.ml_scores_restricted`, `safehouses.name` |

**Response (per safehouse):**
```json
{
  "safehouseId": 1,
  "safehouseName": "Safehouse A",
  "bands": { "critical": 1, "high": 3, "moderate": 5, "low": 8, "stable": 12 },
  "totalScored": 29,
  "totalRestricted": 2
}
```

**Privacy:** Restricted residents counted in `totalRestricted` — individual ML values never exposed.

#### Watchlist Table (Row-Level)

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/residents/regression/watchlist` |
| **Role** | `super_admin` \| `admin` |
| **Pagination** | `page`, `pageSize` (default 20) |
| **Filters** | `safehouseId`, `caseCategory`, `regressionRiskBand`, `minRegressionRiskScore`, `caseStatus` |
| **Source columns** | `residents.regression_risk_score`, `residents.regression_risk_band`, `residents.regression_risk_drivers`, `residents.regression_recommended_action`, `residents.regression_score_updated_at`, `residents.ml_scores_restricted` |

**Privacy:** Residents with `ml_scores_restricted = true` are **excluded entirely** from results.  
**Meta field:** `totalRestricted` in response meta.  
**Computed:** `topDriverLabel` — first driver's `.label` from `regression_risk_drivers[0]`.

---

### W10 — Reintegration Readiness Overview

#### Funnel Chart

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/residents/reintegration/funnel` |
| **Role** | `super_admin` \| `admin` |
| **Filters** | Safehouse restriction, `dateRange` (applied to Reintegrated stage via `date_closed`) |
| **Source columns** | `residents.reintegration_readiness_score`, `residents.reintegration_readiness_band`, `residents.reintegration_status`, `residents.ml_scores_restricted`, `residents.date_closed`, `intervention_plans.plan_category`, `intervention_plans.status` |

**Funnel stages:** Assessed → Eligible → In Planning → Reintegrated  
**Privacy:** Restricted residents excluded from Assessed and Eligible counts.

#### Ranked Readiness Table

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/residents/reintegration/table` |
| **Role** | `super_admin` \| `admin` |
| **Pagination** | `page`, `pageSize` (default 20) |
| **Filters** | `safehouseId`, `reintegrationType`, `reintegrationReadinessBand`, `regressionRiskBand`, `minReadinessScore`, `reintegrationStatus`, `caseCategory`, `minLengthOfStay`, `maxLengthOfStay` |
| **Source columns** | `residents.reintegration_readiness_score`, `residents.reintegration_readiness_band`, `residents.reintegration_readiness_drivers`, `residents.reintegration_recommended_action`, `residents.reintegration_score_updated_at`, `residents.ml_scores_restricted` |

**Privacy:** Restricted residents **excluded entirely**.  
**Computed:** `topPositiveIndicator = reintegration_readiness_drivers.positive[0].label`, `topBarrier = reintegration_readiness_drivers.barriers[0].label`

---

### W11 — Intervention Effectiveness Matrix

#### Aggregated Heatmap Table

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/interventions/effectiveness` |
| **Role** | `super_admin` \| `admin` |
| **Scope** | Only `status = 'completed'` AND `effectiveness_outcome_score IS NOT NULL` |
| **Filters** | `planCategory`, `safehouseId`, `dateRange` (via `updated_at`), `effectivenessBand` |
| **Source columns** | `intervention_plans.effectiveness_outcome_score`, `intervention_plans.effectiveness_band`, `intervention_plans.effectiveness_outcome_drivers`, `intervention_plans.effectiveness_score_updated_at` |

**Response (per planCategory):**
```json
{
  "planCategory": "Psychological",
  "planCount": 3,
  "avgEffectivenessScore": 0.78,
  "avgHealthScoreDelta": 12.0,
  "avgEducationProgressDelta": 46.0,
  "avgSessionProgressRate": 0.85,
  "effectivenessBandDistribution": {
    "high-impact": 2, "moderate": 1, "low-impact": 0, "insufficient-data": 0
  }
}
```

**Computed deltas:** Extracted from `effectiveness_outcome_drivers` JSONB by `dimension` field.

#### Plan Drilldown

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/interventions/effectiveness/:category/plans` |
| **Role** | `super_admin` \| `admin` |

Returns individual completed plans within a `planCategory`, with full `effectivenessOutcomeDrivers`.

---

### W12 — Safehouse Health Comparison

#### Leaderboard Table

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/safehouses/health` |
| **Role** | `super_admin` \| `admin` |
| **Filters** | `monthStart`, `status`, `region` |
| **Source columns** | `safehouse_monthly_metrics.composite_health_score`, `safehouse_monthly_metrics.peer_rank`, `safehouse_monthly_metrics.health_band`, `safehouse_monthly_metrics.trend_direction`, `safehouse_monthly_metrics.health_score_drivers`, `safehouse_monthly_metrics.incident_severity_distribution`, `safehouse_monthly_metrics.health_score_computed_at`, `safehouse_monthly_metrics.health_score_run_id` |

**Privacy:** `peerRank` returned as `null` for admin role (no cross-safehouse ranking).  
**Default sort:** `peer_rank ASC NULLS LAST` (latest metric per safehouse).

#### Health History (Drilldown Trend)

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/safehouses/:id/health-history` |
| **Role** | `super_admin` \| `admin` |

Returns last 12 months of `safehouse_monthly_metrics` for trend line and peer rank history.

#### Compare Mode (Radar Chart)

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/safehouses/health/compare` |
| **Role** | `super_admin` only |
| **Query params** | `safehouseIdA` (required integer), `safehouseIdB` (required integer), `monthStart` (optional) |
| **Source columns** | `safehouse_monthly_metrics.avg_health_score`, `safehouse_monthly_metrics.avg_education_progress`, `safehouse_monthly_metrics.incident_count`, `safehouse_monthly_metrics.process_recording_count`, `safehouse_monthly_metrics.home_visitation_count` |

**Computed:** `incidentCountInverted = 100 - (incidentCount / maxIncidentCount * 100)` — higher is better.

---

## Model Operations Page Endpoints

### W13 — Model Health & Freshness Dashboard

#### Pipeline Status Table

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/ml/pipelines` |
| **Role** | `super_admin` |
| **Filters** | `pipelineName` (comma-sep), `status`, `trainedAtStart`, `trainedAtEnd` |
| **Source columns** | `ml_pipeline_runs.*` including `scored_entity_count`, `feature_importance_json` (new); `ml_prediction_snapshots.created_at` (for freshness) |

**Response (per pipeline, latest run only):**
```json
{
  "runId": 1,
  "pipelineName": "donor_churn_risk",
  "displayName": "Donor Churn Risk Model",
  "modelName": "xgboost_v2",
  "status": "completed",
  "trainedAt": "2026-04-07T06:00:00.000Z",
  "scoredEntityCount": 3,
  "dataSource": "supporters",
  "metricsF1": 0.82,
  "metricsPrecision": 0.84,
  "metricsRecall": 0.80,
  "metricsRmse": null,
  "freshnessDaysSinceLastPrediction": 2,
  "freshnessStatus": "ok",
  "predictionCount": 3
}
```

**Freshness thresholds (days):**

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

**Freshness status logic:**
- `"never-run"` — no prediction snapshots exist for this pipeline
- `"stale"` — days since last prediction > threshold
- `"ok"` — within threshold

**Sub-view B (Freshness Monitor):** No separate endpoint — uses same pipeline status response.

#### Score Distribution Histogram

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/ml/score-distribution` |
| **Role** | `super_admin` |
| **Query params** | `pipelineName` (required) |
| **Source columns** | `ml_prediction_snapshots.prediction_score`, `ml_prediction_snapshots.pipeline_name` |

**Response:**
```json
{
  "data": {
    "pipelineName": "donor_churn_risk",
    "runId": 1,
    "buckets": [
      { "bucket": 0.0, "count": 0 },
      { "bucket": 0.1, "count": 0 },
      ...
      { "bucket": 0.8, "count": 2 },
      { "bucket": 0.9, "count": 1 }
    ]
  }
}
```

Always returns all 10 buckets (0.0–0.9). Empty buckets are `count: 0`.  
**Empty state:** `{ "data": null }` when no completed run found.

#### Band Label Distribution

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/ml/band-distribution` |
| **Role** | `super_admin` |
| **Query params** | `pipelineName` (required) |
| **Source columns** | `ml_prediction_snapshots.band_label` (new column) |

**Response:**
```json
{
  "data": {
    "pipelineName": "donor_churn_risk",
    "runId": 1,
    "bands": [
      { "bandLabel": "at-risk", "count": 2 },
      { "bandLabel": "stable", "count": 1 }
    ]
  }
}
```

**Empty state:** `{ "data": null }` when no completed run found.

#### Feature Importance

| Field | Value |
|---|---|
| **Endpoint** | `GET /superadmin/ml/feature-importance/:runId` |
| **Role** | `super_admin` |
| **Source columns** | `ml_pipeline_runs.feature_importance_json` (new column) |

Returns top 10 features sorted by `importance DESC`.

**Response:**
```json
{
  "data": {
    "runId": 1,
    "pipelineName": "donor_churn_risk",
    "displayName": "Donor Churn Risk Model",
    "featureImportanceJson": [
      { "feature": "days_since_last_donation", "importance": 0.38, "label": "Days since last donation" }
    ]
  }
}
```

---

## Action / Write Endpoints

### PATCH — Update Resident ML Action Fields

| Field | Value |
|---|---|
| **Endpoint** | `PATCH /superadmin/residents/:id` |
| **Role** | `super_admin` |
| **Body** | `{ "regressionRecommendedAction": "urgent-case-conference" \| "monitor" \| "none" }` or `{ "reintegrationRecommendedAction": "schedule-conference" \| "prepare-plan" \| "monitor" }` |

### PATCH — Update Donor ML Action Fields

| Field | Value |
|---|---|
| **Endpoint** | `PATCH /superadmin/donors/:id` |
| **Role** | `super_admin` |
| **Body** | `{ "churnRecommendedAction": "send-email" \| "schedule-call" \| "none" }` or `{ "upgradeBand": "not-ready" }` |

### PATCH — Update Campaign ML Flags

| Field | Value |
|---|---|
| **Endpoint** | `PATCH /superadmin/campaigns/:id/ml-flags` |
| **Role** | `super_admin` |
| **Body** | `{ "recommendedAvoid": true }` |
| **Implementation** | Merges `{ recommendedAvoid }` into `ml_prediction_snapshots.context_json` for the latest campaign effectiveness run |

---

## Schema Changes Made

### New Drizzle Schema Columns (9 files updated)

| Table | New columns | Count |
|---|---|---|
| `supporters` | `churn_risk_score`, `churn_band`, `churn_top_drivers`, `churn_recommended_action`, `churn_score_updated_at`, `upgrade_likelihood_score`, `upgrade_band`, `upgrade_top_drivers`, `upgrade_recommended_ask_band`, `upgrade_score_updated_at` | 10 |
| `residents` | `regression_risk_score`, `regression_risk_band`, `regression_risk_drivers`, `regression_recommended_action`, `regression_score_updated_at`, `reintegration_readiness_score`, `reintegration_readiness_band`, `reintegration_readiness_drivers`, `reintegration_recommended_action`, `reintegration_score_updated_at`, `ml_scores_restricted` | 11 |
| `safehouse_monthly_metrics` | `composite_health_score`, `peer_rank`, `health_band`, `trend_direction`, `health_score_drivers`, `incident_severity_distribution`, `health_score_computed_at`, `health_score_run_id` | 8 |
| `social_media_posts` | `conversion_prediction_score`, `predicted_referral_count`, `predicted_donation_value_php`, `conversion_band`, `conversion_top_drivers`, `conversion_comparable_post_ids`, `conversion_score_updated_at` | 7 |
| `intervention_plans` | `effectiveness_outcome_score`, `effectiveness_band`, `effectiveness_outcome_drivers`, `effectiveness_score_updated_at` | 4 |
| `public_impact_snapshots` | `projected_gap_php_30d`, `funding_gap_band`, `funding_gap_updated_at` | 3 |
| `donations` | `attributed_outcome_score`, `attribution_run_id` | 2 |
| `ml_prediction_snapshots` | `band_label`, `action_code` | 2 |
| `ml_pipeline_runs` | `scored_entity_count`, `feature_importance_json` | 2 |

**Total: 49 additive columns** (applied via `super_admin_ml_additive_columns.sql`, all verified in live DB).

---

## Files Changed

| File | Change |
|---|---|
| `artifacts/api-server/src/routes/superadminMl.ts` | **Created** — 600-line route file, all 30+ endpoints |
| `artifacts/api-server/src/routes/index.ts` | Imported and registered `superadminMlRouter` |
| `lib/db/src/schema/supporters.ts` | Added 10 ML columns |
| `lib/db/src/schema/residents.ts` | Added 11 ML columns |
| `lib/db/src/schema/safehouseMonthlyMetrics.ts` | Added 8 ML columns |
| `lib/db/src/schema/socialMediaPosts.ts` | Added 7 ML columns |
| `lib/db/src/schema/interventionPlans.ts` | Added 4 ML columns |
| `lib/db/src/schema/publicImpactSnapshots.ts` | Added 3 ML columns |
| `lib/db/src/schema/donations.ts` | Added 2 ML columns |
| `lib/db/src/schema/mlPredictionSnapshots.ts` | Added 2 ML columns (`band_label`, `action_code`) |
| `lib/db/src/schema/mlPipelineRuns.ts` | Added 2 ML columns (`scored_entity_count`, `feature_importance_json`) |
| `SUPER_ADMIN_ML_BACKEND_ENDPOINTS.md` | **Created** — this document |

---

## What Was NOT Implemented

| Item | Reason |
|---|---|
| Model training endpoints | Out of scope per task spec |
| `POST /superadmin/donors/:id/actions/outreach` | Action workflow not yet implemented |
| `POST /superadmin/donors/:id/actions/upgrade-ask` | Action workflow not yet implemented |
| `POST /superadmin/interventions/:category/share-summary` | Email workflow not yet implemented |
| `POST /superadmin/safehouses/:id/flags` | Flag system not yet implemented |
| `POST /superadmin/attribution/report` | PDF generation not yet implemented |
| Frontend UI | Out of scope per task spec |
