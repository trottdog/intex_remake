-- =============================================================================
-- Beacon Nonprofit Management Platform — PostgreSQL Schema
-- Generated from Drizzle schema source (lib/db/src/schema/)
-- Run this against a blank PostgreSQL database to replicate the full structure.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- =============================================================================
-- INDEPENDENT TABLES (no foreign-key dependencies)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- safehouses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE safehouses (
  safehouse_id      BIGSERIAL    PRIMARY KEY,
  safehouse_code    TEXT,
  name              TEXT,
  region            TEXT,
  city              TEXT,
  province          TEXT,
  country           TEXT,
  open_date         DATE,
  status            TEXT,
  capacity_girls    INTEGER,
  capacity_staff    INTEGER,
  current_occupancy INTEGER,
  notes             TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL       PRIMARY KEY,
  username      TEXT         NOT NULL UNIQUE,
  email         TEXT         NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  first_name    TEXT         NOT NULL,
  last_name     TEXT         NOT NULL,
  role          TEXT         NOT NULL DEFAULT 'public'
                             CHECK (role IN ('public','donor','staff','admin','super_admin')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  mfa_enabled   BOOLEAN      NOT NULL DEFAULT FALSE,
  mfa_secret    TEXT,
  last_login    TIMESTAMPTZ,
  supporter_id  BIGINT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- supporters
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE supporters (
  supporter_id                BIGSERIAL    PRIMARY KEY,
  supporter_type              TEXT,
  display_name                TEXT,
  organization_name           TEXT,
  first_name                  TEXT,
  last_name                   TEXT,
  relationship_type           TEXT,
  region                      TEXT,
  country                     TEXT,
  email                       TEXT,
  phone                       TEXT,
  status                      TEXT,
  created_at                  TEXT,          -- stored as text in source schema
  first_donation_date         DATE,
  acquisition_channel         TEXT,
  identity_user_id            VARCHAR,
  can_login                   BOOLEAN      NOT NULL DEFAULT FALSE,
  recurring_enabled           BOOLEAN      NOT NULL DEFAULT FALSE,
  churn_risk_score            DOUBLE PRECISION,
  churn_band                  TEXT,
  churn_top_drivers           JSONB,
  churn_recommended_action    TEXT,
  churn_score_updated_at      TIMESTAMPTZ,
  upgrade_likelihood_score    DOUBLE PRECISION,
  upgrade_band                TEXT,
  upgrade_top_drivers         JSONB,
  upgrade_recommended_ask_band TEXT,
  upgrade_score_updated_at    TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────────────
-- partners
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE partners (
  partner_id   BIGSERIAL  PRIMARY KEY,
  partner_name TEXT,
  partner_type TEXT,
  role_type    TEXT,
  contact_name TEXT,
  email        TEXT,
  phone        TEXT,
  region       TEXT,
  status       TEXT,
  start_date   DATE,
  end_date     DATE,
  notes        TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- campaigns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE campaigns (
  campaign_id BIGSERIAL   PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  category    TEXT,
  goal        NUMERIC,
  deadline    DATE,
  status      TEXT        DEFAULT 'draft',
  created_by  BIGINT,
  created_at  TIMESTAMP   DEFAULT NOW(),
  updated_at  TIMESTAMP   DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- social_media_posts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE social_media_posts (
  post_id                       BIGSERIAL  PRIMARY KEY,
  platform                      TEXT,
  platform_post_id              TEXT,
  post_url                      TEXT,
  created_at                    TIMESTAMP,
  day_of_week                   TEXT,
  post_hour                     INTEGER,
  post_type                     TEXT,
  media_type                    TEXT,
  caption                       TEXT,
  hashtags                      TEXT,
  num_hashtags                  INTEGER,
  mentions_count                INTEGER,
  has_call_to_action            BOOLEAN,
  call_to_action_type           TEXT,
  content_topic                 TEXT,
  sentiment_tone                TEXT,
  caption_length                INTEGER,
  features_resident_story       BOOLEAN,
  campaign_name                 TEXT,
  is_boosted                    BOOLEAN,
  boost_budget_php              NUMERIC,
  impressions                   INTEGER,
  reach                         INTEGER,
  likes                         INTEGER,
  comments                      INTEGER,
  shares                        INTEGER,
  saves                         INTEGER,
  click_throughs                INTEGER,
  video_views                   NUMERIC,
  engagement_rate               NUMERIC,
  profile_visits                INTEGER,
  donation_referrals            INTEGER,
  estimated_donation_value_php  NUMERIC,
  follower_count_at_post        INTEGER,
  watch_time_seconds            NUMERIC,
  avg_view_duration_seconds     NUMERIC,
  subscriber_count_at_post      NUMERIC,
  forwards                      NUMERIC,
  conversion_prediction_score   DOUBLE PRECISION,
  predicted_referral_count      NUMERIC,
  predicted_donation_value_php  NUMERIC,
  conversion_band               TEXT,
  conversion_top_drivers        JSONB,
  conversion_comparable_post_ids JSONB,
  conversion_score_updated_at   TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────────────
-- public_impact_snapshots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public_impact_snapshots (
  snapshot_id           BIGSERIAL   PRIMARY KEY,
  snapshot_date         DATE,
  headline              TEXT,
  summary_text          TEXT,
  metric_payload_json   JSONB,
  is_published          BOOLEAN,
  published_at          TIMESTAMP,
  projected_gap_php_30d NUMERIC,
  funding_gap_band      TEXT,
  funding_gap_updated_at TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────────────
-- program_updates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE program_updates (
  update_id    BIGSERIAL   PRIMARY KEY,
  title        TEXT        NOT NULL,
  summary      TEXT,
  category     TEXT,
  is_published BOOLEAN     DEFAULT FALSE,
  published_at TIMESTAMP,
  created_by   BIGINT,
  created_at   TIMESTAMP   DEFAULT NOW(),
  updated_at   TIMESTAMP   DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ml_pipeline_runs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE ml_pipeline_runs (
  run_id                 BIGSERIAL   PRIMARY KEY,
  pipeline_name          TEXT        NOT NULL,
  display_name           TEXT,
  model_name             TEXT,
  status                 TEXT        NOT NULL DEFAULT 'completed',
  trained_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_source            TEXT,
  source_commit          TEXT,
  metrics_json           JSONB,
  manifest_json          JSONB,
  scored_entity_count    INTEGER,
  feature_importance_json JSONB
);


-- =============================================================================
-- TABLES WITH FOREIGN KEYS — TIER 1 (depend only on independent tables)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- residents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE residents (
  resident_id                       BIGSERIAL   PRIMARY KEY,
  case_control_no                   TEXT,
  internal_code                     TEXT,
  safehouse_id                      BIGINT      REFERENCES safehouses (safehouse_id),
  case_status                       TEXT,
  sex                               TEXT,
  date_of_birth                     DATE,
  birth_status                      TEXT,
  place_of_birth                    TEXT,
  religion                          TEXT,
  case_category                     TEXT,
  sub_cat_orphaned                  BOOLEAN,
  sub_cat_trafficked                BOOLEAN,
  sub_cat_child_labor               BOOLEAN,
  sub_cat_physical_abuse            BOOLEAN,
  sub_cat_sexual_abuse              BOOLEAN,
  sub_cat_osaec                     BOOLEAN,
  sub_cat_cicl                      BOOLEAN,
  sub_cat_at_risk                   BOOLEAN,
  sub_cat_street_child              BOOLEAN,
  sub_cat_child_with_hiv            BOOLEAN,
  is_pwd                            BOOLEAN,
  pwd_type                          TEXT,
  has_special_needs                 BOOLEAN,
  special_needs_diagnosis           TEXT,
  family_is_4ps                     BOOLEAN,
  family_solo_parent                BOOLEAN,
  family_indigenous                 BOOLEAN,
  family_parent_pwd                 BOOLEAN,
  family_informal_settler           BOOLEAN,
  date_of_admission                 DATE,
  age_upon_admission                TEXT,
  present_age                       TEXT,
  length_of_stay                    TEXT,
  referral_source                   TEXT,
  referring_agency_person           TEXT,
  date_colb_registered              DATE,
  date_colb_obtained                DATE,
  assigned_social_worker            TEXT,
  initial_case_assessment           TEXT,
  date_case_study_prepared          DATE,
  reintegration_type                TEXT,
  reintegration_status              TEXT,
  initial_risk_level                TEXT,
  current_risk_level                TEXT,
  date_enrolled                     DATE,
  date_closed                       DATE,
  created_at                        TIMESTAMP,
  notes_restricted                  TEXT,
  regression_risk_score             DOUBLE PRECISION,
  regression_risk_band              TEXT,
  regression_risk_drivers           JSONB,
  regression_recommended_action     TEXT,
  regression_score_updated_at       TIMESTAMPTZ,
  reintegration_readiness_score     DOUBLE PRECISION,
  reintegration_readiness_band      TEXT,
  reintegration_readiness_drivers   JSONB,
  reintegration_recommended_action  TEXT,
  reintegration_score_updated_at    TIMESTAMPTZ,
  ml_scores_restricted              BOOLEAN
);


-- ─────────────────────────────────────────────────────────────────────────────
-- donations  (depends on supporters, social_media_posts, safehouses)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE donations (
  donation_id             BIGSERIAL   PRIMARY KEY,
  supporter_id            BIGINT      REFERENCES supporters (supporter_id),
  campaign_id             BIGINT,
  donation_type           TEXT,
  donation_date           DATE,
  is_recurring            BOOLEAN,
  campaign_name           TEXT,
  channel_source          TEXT,
  currency_code           TEXT,
  amount                  NUMERIC,
  estimated_value         NUMERIC,
  impact_unit             TEXT,
  notes                   TEXT,
  referral_post_id        BIGINT      REFERENCES social_media_posts (post_id),
  safehouse_id            BIGINT      REFERENCES safehouses (safehouse_id),
  attributed_outcome_score DOUBLE PRECISION,
  attribution_run_id      BIGINT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- staff_safehouse_assignments  (depends on safehouses)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE staff_safehouse_assignments (
  id           BIGSERIAL  PRIMARY KEY,
  user_id      VARCHAR    NOT NULL,
  safehouse_id BIGINT     NOT NULL REFERENCES safehouses (safehouse_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- partner_assignments  (depends on partners, safehouses)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE partner_assignments (
  assignment_id        BIGSERIAL  PRIMARY KEY,
  partner_id           BIGINT     REFERENCES partners (partner_id),
  safehouse_id         BIGINT     REFERENCES safehouses (safehouse_id),
  program_area         TEXT,
  assignment_start     DATE,
  assignment_end       DATE,
  responsibility_notes TEXT,
  is_primary           BOOLEAN,
  status               TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- safehouse_monthly_metrics  (depends on safehouses)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE safehouse_monthly_metrics (
  metric_id                     BIGSERIAL        PRIMARY KEY,
  safehouse_id                  BIGINT           REFERENCES safehouses (safehouse_id),
  month_start                   DATE,
  month_end                     DATE,
  active_residents              INTEGER,
  avg_education_progress        NUMERIC,
  avg_health_score              NUMERIC,
  process_recording_count       INTEGER,
  home_visitation_count         INTEGER,
  incident_count                INTEGER,
  notes                         TEXT,
  composite_health_score        DOUBLE PRECISION,
  peer_rank                     INTEGER,
  health_band                   TEXT,
  trend_direction               TEXT,
  health_score_drivers          JSONB,
  incident_severity_distribution JSONB,
  health_score_computed_at      TIMESTAMPTZ,
  health_score_run_id           BIGINT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ml_prediction_snapshots  (depends on ml_pipeline_runs)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE ml_prediction_snapshots (
  prediction_id    BIGSERIAL    PRIMARY KEY,
  run_id           BIGINT       NOT NULL REFERENCES ml_pipeline_runs (run_id),
  pipeline_name    TEXT         NOT NULL,
  entity_type      TEXT         NOT NULL,
  entity_id        BIGINT,
  entity_key       TEXT         NOT NULL,
  entity_label     TEXT,
  safehouse_id     BIGINT,
  record_timestamp TIMESTAMPTZ,
  prediction_value INTEGER,
  prediction_score DOUBLE PRECISION NOT NULL,
  rank_order       INTEGER      NOT NULL,
  context_json     JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  band_label       TEXT,
  action_code      TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- donor_viewed_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE donor_viewed_items (
  id           BIGSERIAL   PRIMARY KEY,
  supporter_id BIGINT,
  item_type    TEXT,
  item_id      BIGINT,
  viewed_at    TIMESTAMP   DEFAULT NOW()
);


-- =============================================================================
-- TABLES WITH FOREIGN KEYS — TIER 2 (depend on residents or donations)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- incident_reports  (depends on residents, safehouses)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE incident_reports (
  incident_id       BIGSERIAL  PRIMARY KEY,
  resident_id       BIGINT     REFERENCES residents (resident_id),
  safehouse_id      BIGINT     REFERENCES safehouses (safehouse_id),
  incident_date     DATE,
  incident_type     TEXT,
  severity          TEXT,
  description       TEXT,
  response_taken    TEXT,
  resolved          BOOLEAN,
  resolution_date   DATE,
  reported_by       TEXT,
  follow_up_required BOOLEAN,
  status            TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- intervention_plans  (depends on residents)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE intervention_plans (
  plan_id                       BIGSERIAL   PRIMARY KEY,
  resident_id                   BIGINT      REFERENCES residents (resident_id),
  plan_category                 TEXT,
  plan_description              TEXT,
  services_provided             TEXT,
  target_value                  NUMERIC,
  target_date                   DATE,
  status                        TEXT,
  case_conference_date          DATE,
  created_at                    TIMESTAMP,
  updated_at                    TIMESTAMP,
  effectiveness_outcome_score   DOUBLE PRECISION,
  effectiveness_band            TEXT,
  effectiveness_outcome_drivers JSONB,
  effectiveness_score_updated_at TIMESTAMPTZ
);


-- ─────────────────────────────────────────────────────────────────────────────
-- home_visitations  (depends on residents)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE home_visitations (
  visitation_id            BIGSERIAL  PRIMARY KEY,
  resident_id              BIGINT     REFERENCES residents (resident_id),
  visit_date               DATE,
  social_worker            TEXT,
  visit_type               TEXT,
  location_visited         TEXT,
  family_members_present   TEXT,
  purpose                  TEXT,
  observations             TEXT,
  family_cooperation_level TEXT,
  safety_concerns_noted    BOOLEAN,
  follow_up_needed         BOOLEAN,
  follow_up_notes          TEXT,
  visit_outcome            TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- case_conferences  (depends on residents)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE case_conferences (
  conference_id       BIGSERIAL  PRIMARY KEY,
  resident_id         BIGINT     NOT NULL REFERENCES residents (resident_id),
  conference_date     DATE       NOT NULL,
  conference_type     TEXT,
  summary             TEXT,
  decisions_made      TEXT,
  next_steps          TEXT,
  next_conference_date DATE,
  created_by          TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- process_recordings  (depends on residents)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE process_recordings (
  recording_id              BIGSERIAL  PRIMARY KEY,
  resident_id               BIGINT     REFERENCES residents (resident_id),
  session_date              DATE,
  social_worker             TEXT,
  session_type              TEXT,
  session_duration_minutes  INTEGER,
  emotional_state_observed  TEXT,
  emotional_state_end       TEXT,
  session_narrative         TEXT,
  interventions_applied     TEXT,
  follow_up_actions         TEXT,
  progress_noted            BOOLEAN,
  concerns_flagged          BOOLEAN,
  referral_made             BOOLEAN,
  notes_restricted          TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- education_records  (depends on residents)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE education_records (
  education_record_id BIGSERIAL  PRIMARY KEY,
  resident_id         BIGINT     REFERENCES residents (resident_id),
  record_date         DATE,
  education_level     TEXT,
  school_name         TEXT,
  enrollment_status   TEXT,
  attendance_rate     NUMERIC,
  progress_percent    NUMERIC,
  completion_status   TEXT,
  notes               TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- health_wellbeing_records  (depends on residents)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE health_wellbeing_records (
  health_record_id           BIGSERIAL  PRIMARY KEY,
  resident_id                BIGINT     REFERENCES residents (resident_id),
  record_date                DATE,
  general_health_score       NUMERIC,
  nutrition_score            NUMERIC,
  sleep_quality_score        NUMERIC,
  energy_level_score         NUMERIC,
  height_cm                  NUMERIC,
  weight_kg                  NUMERIC,
  bmi                        NUMERIC,
  medical_checkup_done       BOOLEAN,
  dental_checkup_done        BOOLEAN,
  psychological_checkup_done BOOLEAN,
  notes                      TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- donation_allocations  (depends on donations, safehouses)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE donation_allocations (
  allocation_id    BIGSERIAL  PRIMARY KEY,
  donation_id      BIGINT     REFERENCES donations (donation_id),
  safehouse_id     BIGINT     REFERENCES safehouses (safehouse_id),
  program_area     TEXT,
  amount_allocated NUMERIC,
  allocation_date  DATE,
  allocation_notes TEXT
);


-- ─────────────────────────────────────────────────────────────────────────────
-- in_kind_donation_items  (depends on donations)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE in_kind_donation_items (
  item_id               BIGSERIAL  PRIMARY KEY,
  donation_id           BIGINT     REFERENCES donations (donation_id),
  item_name             TEXT,
  item_category         TEXT,
  quantity              NUMERIC,
  unit_of_measure       TEXT,
  estimated_unit_value  NUMERIC,
  intended_use          TEXT,
  received_condition    TEXT
);


-- =============================================================================
-- INDEXES
-- (Covers the most common query patterns used by the API)
-- =============================================================================

-- residents
CREATE INDEX idx_residents_safehouse_id     ON residents (safehouse_id);
CREATE INDEX idx_residents_case_status      ON residents (case_status);
CREATE INDEX idx_residents_current_risk     ON residents (current_risk_level);

-- donations
CREATE INDEX idx_donations_supporter_id     ON donations (supporter_id);
CREATE INDEX idx_donations_safehouse_id     ON donations (safehouse_id);
CREATE INDEX idx_donations_campaign_id      ON donations (campaign_id);
CREATE INDEX idx_donations_donation_date    ON donations (donation_date);

-- donation_allocations
CREATE INDEX idx_allocations_donation_id    ON donation_allocations (donation_id);
CREATE INDEX idx_allocations_safehouse_id   ON donation_allocations (safehouse_id);

-- incident_reports
CREATE INDEX idx_incidents_resident_id      ON incident_reports (resident_id);
CREATE INDEX idx_incidents_safehouse_id     ON incident_reports (safehouse_id);

-- intervention_plans
CREATE INDEX idx_plans_resident_id          ON intervention_plans (resident_id);

-- home_visitations
CREATE INDEX idx_visitations_resident_id    ON home_visitations (resident_id);

-- case_conferences
CREATE INDEX idx_conferences_resident_id    ON case_conferences (resident_id);

-- process_recordings
CREATE INDEX idx_recordings_resident_id     ON process_recordings (resident_id);

-- education_records
CREATE INDEX idx_education_resident_id      ON education_records (resident_id);

-- health_wellbeing_records
CREATE INDEX idx_health_resident_id         ON health_wellbeing_records (resident_id);

-- social_media_posts
CREATE INDEX idx_social_platform            ON social_media_posts (platform);
CREATE INDEX idx_social_created_at          ON social_media_posts (created_at);

-- ml_prediction_snapshots
CREATE INDEX idx_ml_predictions_run_id      ON ml_prediction_snapshots (run_id);
CREATE INDEX idx_ml_predictions_pipeline    ON ml_prediction_snapshots (pipeline_name);
CREATE INDEX idx_ml_predictions_entity      ON ml_prediction_snapshots (entity_type, entity_id);

-- safehouse_monthly_metrics
CREATE INDEX idx_metrics_safehouse_month    ON safehouse_monthly_metrics (safehouse_id, month_start);

-- partner_assignments
CREATE INDEX idx_partner_assign_partner     ON partner_assignments (partner_id);
CREATE INDEX idx_partner_assign_safehouse   ON partner_assignments (safehouse_id);

-- staff_safehouse_assignments
CREATE INDEX idx_staff_assign_safehouse     ON staff_safehouse_assignments (safehouse_id);

-- supporters
CREATE INDEX idx_supporters_email           ON supporters (email);
CREATE INDEX idx_supporters_identity_user   ON supporters (identity_user_id);

-- donor_viewed_items
CREATE INDEX idx_viewed_supporter           ON donor_viewed_items (supporter_id, item_type);
