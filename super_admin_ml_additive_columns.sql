-- =============================================================================
-- Super Admin ML Feature — Additive Column Migration
-- Source of truth: SUPER_ADMIN_ML_ADDITIVE_SCHEMA_SPEC.md
-- =============================================================================
-- Uses ADD COLUMN IF NOT EXISTS throughout — safe to re-run.
-- No existing columns are altered or removed.
-- No new tables are created.
-- attribution_run_id and health_score_run_id reference ml_pipeline_runs.run_id
-- but are stored as plain BIGINT without FK constraints to match the loose-
-- reference style already in use elsewhere in the schema (e.g. donations.campaign_id).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Table: supporters
-- ML features: Donor Churn Risk (1.1), Donor Upgrade Likelihood (1.2)
-- ---------------------------------------------------------------------------

-- Donor Churn Risk (1.1)
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS churn_risk_score       DOUBLE PRECISION;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS churn_band             TEXT;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS churn_top_drivers      JSONB;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS churn_recommended_action TEXT;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS churn_score_updated_at TIMESTAMP WITH TIME ZONE;

-- Donor Upgrade Likelihood (1.2)
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS upgrade_likelihood_score      DOUBLE PRECISION;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS upgrade_band                  TEXT;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS upgrade_top_drivers           JSONB;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS upgrade_recommended_ask_band  TEXT;
ALTER TABLE supporters ADD COLUMN IF NOT EXISTS upgrade_score_updated_at      TIMESTAMP WITH TIME ZONE;


-- ---------------------------------------------------------------------------
-- Table: donations
-- ML feature: Donation-to-Impact Attribution (1.5)
-- ---------------------------------------------------------------------------

-- attributed_outcome_score: 0–100 outcome improvement index attributed to this
--   donation's program area in the quarter following donation_date.
--   NULL until the attribution window closes.
ALTER TABLE donations ADD COLUMN IF NOT EXISTS attributed_outcome_score DOUBLE PRECISION;

-- attribution_run_id: references ml_pipeline_runs.run_id — identifies which
--   pipeline version computed the cached score on this row.
ALTER TABLE donations ADD COLUMN IF NOT EXISTS attribution_run_id BIGINT;


-- ---------------------------------------------------------------------------
-- Table: donation_allocations
-- No new columns — see spec for rationale (attribution grain is at the
-- donation level, not the allocation level).
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- Table: social_media_posts
-- ML feature: Social Post Conversion Prediction (1.4)
-- ---------------------------------------------------------------------------

ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS conversion_prediction_score  DOUBLE PRECISION;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS predicted_referral_count     NUMERIC;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS predicted_donation_value_php NUMERIC;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS conversion_band              TEXT;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS conversion_top_drivers       JSONB;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS conversion_comparable_post_ids JSONB;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS conversion_score_updated_at  TIMESTAMP WITH TIME ZONE;


-- ---------------------------------------------------------------------------
-- Table: residents
-- ML features: Resident Regression Risk (1.6), Reintegration Readiness (1.7)
-- ---------------------------------------------------------------------------

-- Resident Regression Risk (1.6)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS regression_risk_score        DOUBLE PRECISION;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS regression_risk_band         TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS regression_risk_drivers      JSONB;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS regression_recommended_action TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS regression_score_updated_at  TIMESTAMP WITH TIME ZONE;

-- Reintegration Readiness (1.7)
ALTER TABLE residents ADD COLUMN IF NOT EXISTS reintegration_readiness_score        DOUBLE PRECISION;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS reintegration_readiness_band         TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS reintegration_readiness_drivers      JSONB;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS reintegration_recommended_action     TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS reintegration_score_updated_at       TIMESTAMP WITH TIME ZONE;

-- Visibility / suppression flag (both features)
-- IMPORTANT: Must be enforced server-side before returning any score columns.
-- When TRUE, all ML scores for this resident are withheld from API responses.
ALTER TABLE residents ADD COLUMN IF NOT EXISTS ml_scores_restricted BOOLEAN NOT NULL DEFAULT FALSE;


-- ---------------------------------------------------------------------------
-- Table: intervention_plans
-- ML feature: Intervention Effectiveness (1.8)
-- Scores are only populated for rows where status = 'completed'.
-- ---------------------------------------------------------------------------

ALTER TABLE intervention_plans ADD COLUMN IF NOT EXISTS effectiveness_outcome_score   DOUBLE PRECISION;
ALTER TABLE intervention_plans ADD COLUMN IF NOT EXISTS effectiveness_band            TEXT;
ALTER TABLE intervention_plans ADD COLUMN IF NOT EXISTS effectiveness_outcome_drivers JSONB;
ALTER TABLE intervention_plans ADD COLUMN IF NOT EXISTS effectiveness_score_updated_at TIMESTAMP WITH TIME ZONE;


-- ---------------------------------------------------------------------------
-- Table: safehouse_monthly_metrics
-- ML feature: Safehouse Health Score (1.9)
-- All columns are aggregate-level (per safehouse per month).
-- ---------------------------------------------------------------------------

ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS composite_health_score        DOUBLE PRECISION;
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS peer_rank                     INTEGER;
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS health_band                   TEXT;
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS trend_direction               TEXT;
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS health_score_drivers          JSONB;
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS incident_severity_distribution JSONB;
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS health_score_computed_at      TIMESTAMP WITH TIME ZONE;

-- health_score_run_id: references ml_pipeline_runs.run_id — links each
--   month's health scores to the pipeline version that computed them.
ALTER TABLE safehouse_monthly_metrics ADD COLUMN IF NOT EXISTS health_score_run_id BIGINT;


-- ---------------------------------------------------------------------------
-- Table: public_impact_snapshots
-- ML feature: Funding Gap Forecast (1.10)
-- All columns are aggregate-level and super admin only.
-- projected_gap_php_30d: positive = surplus, negative = shortfall.
-- ---------------------------------------------------------------------------

ALTER TABLE public_impact_snapshots ADD COLUMN IF NOT EXISTS projected_gap_php_30d  NUMERIC;
ALTER TABLE public_impact_snapshots ADD COLUMN IF NOT EXISTS funding_gap_band        TEXT;
ALTER TABLE public_impact_snapshots ADD COLUMN IF NOT EXISTS funding_gap_updated_at  TIMESTAMP WITH TIME ZONE;


-- ---------------------------------------------------------------------------
-- Table: ml_prediction_snapshots
-- All ML features (generic prediction store)
-- These are denormalized surfacing columns only — contextJson remains the
-- authoritative source. Purpose: fast WHERE / GROUP BY without JSONB parsing.
-- ---------------------------------------------------------------------------

ALTER TABLE ml_prediction_snapshots ADD COLUMN IF NOT EXISTS band_label   TEXT;
ALTER TABLE ml_prediction_snapshots ADD COLUMN IF NOT EXISTS action_code   TEXT;


-- ---------------------------------------------------------------------------
-- Table: ml_pipeline_runs
-- All ML features (model operations monitoring)
-- ---------------------------------------------------------------------------

ALTER TABLE ml_pipeline_runs ADD COLUMN IF NOT EXISTS scored_entity_count   INTEGER;
ALTER TABLE ml_pipeline_runs ADD COLUMN IF NOT EXISTS feature_importance_json JSONB;


-- =============================================================================
-- VERIFICATION COMMENTS
-- Which super admin ML feature does each table extension support?
-- =============================================================================
--
-- supporters
--   churn_risk_score, churn_band, churn_top_drivers,
--   churn_recommended_action, churn_score_updated_at
--     → ML Feature 1.1: Donor Churn Risk
--
--   upgrade_likelihood_score, upgrade_band, upgrade_top_drivers,
--   upgrade_recommended_ask_band, upgrade_score_updated_at
--     → ML Feature 1.2: Donor Upgrade Likelihood
--
-- donations
--   attributed_outcome_score, attribution_run_id
--     → ML Feature 1.5: Donation-to-Impact Attribution
--
-- donation_allocations
--   (no columns added — attribution grain is at the donation level)
--
-- social_media_posts
--   conversion_prediction_score, predicted_referral_count,
--   predicted_donation_value_php, conversion_band, conversion_top_drivers,
--   conversion_comparable_post_ids, conversion_score_updated_at
--     → ML Feature 1.4: Social Post Conversion Prediction
--
-- residents
--   regression_risk_score, regression_risk_band, regression_risk_drivers,
--   regression_recommended_action, regression_score_updated_at
--     → ML Feature 1.6: Resident Regression Risk
--
--   reintegration_readiness_score, reintegration_readiness_band,
--   reintegration_readiness_drivers, reintegration_recommended_action,
--   reintegration_score_updated_at
--     → ML Feature 1.7: Reintegration Readiness
--
--   ml_scores_restricted
--     → Both 1.6 and 1.7 (server-side suppression flag)
--
-- intervention_plans
--   effectiveness_outcome_score, effectiveness_band,
--   effectiveness_outcome_drivers, effectiveness_score_updated_at
--     → ML Feature 1.8: Intervention Effectiveness
--
-- safehouse_monthly_metrics
--   composite_health_score, peer_rank, health_band, trend_direction,
--   health_score_drivers, incident_severity_distribution,
--   health_score_computed_at, health_score_run_id
--     → ML Feature 1.9: Safehouse Health Score
--
-- public_impact_snapshots
--   projected_gap_php_30d, funding_gap_band, funding_gap_updated_at
--     → ML Feature 1.10: Funding Gap Forecast
--
-- ml_prediction_snapshots
--   band_label, action_code
--     → All features (fast-query surfacing columns; contextJson is authoritative)
--
-- ml_pipeline_runs
--   scored_entity_count, feature_importance_json
--     → All features (model operations monitoring — Model Operations page)
--
-- campaigns (DEFERRED — not in allowed extension list for this migration)
--   effectiveness_score, effectiveness_band, effectiveness_top_drivers,
--   recommended_replicate, recommended_avoid, effectiveness_score_updated_at
--     → ML Feature 1.3: Campaign Effectiveness (follow-up migration required)
-- =============================================================================
