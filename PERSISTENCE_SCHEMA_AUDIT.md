# Persistence Schema Audit

Source of truth audited against:
- [beacon_rebuild.sql](/Users/natemacbook/Desktop/intex/NodeApp/docs/database/beacon_rebuild.sql)

Persistence layer audited:
- [BeaconDbContext.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/BeaconDbContext.cs)
- [FoundationEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/FoundationEntities.cs)
- [CaseManagementEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/CaseManagementEntities.cs)
- [InsightsEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/InsightsEntities.cs)
- [FoundationModelConfiguration.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Configurations/FoundationModelConfiguration.cs)
- [CaseManagementModelConfiguration.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Configurations/CaseManagementModelConfiguration.cs)
- [InsightsModelConfiguration.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Configurations/InsightsModelConfiguration.cs)

## Summary

The persistence model is structurally aligned with the SQL schema for:
- table names
- column names
- nullability
- PostgreSQL `TEXT` date fields mapped as `string`
- PostgreSQL `NUMERIC` fields mapped as `decimal`
- PostgreSQL `TEXT[]` fields mapped as `string[]`
- JSONB fields mapped as `JsonDocument`
- foreign keys and delete behaviors
- SQL check constraints

Confirmed drift found during this pass:
- several SQL indexes defined in `beacon_rebuild.sql` were missing from the EF model configuration

Those missing indexes were added before closing this audit.

## Table-By-Table Results

### 2.01 `safehouses`
- Status: match
- Verified:
  - columns `id`, `name`, `location`, `capacity`, `current_occupancy`, `program_areas`, `status`, `contact_name`, `contact_email`, `created_at`, `updated_at`
  - defaults on `capacity`, `current_occupancy`, `program_areas`, `status`
  - `program_areas` mapped as `string[]`
  - status check constraint preserved

### 2.02 `partners`
- Status: match
- Verified:
  - columns and nullability match SQL
  - `status` default and check constraint preserved

### 2.03 `partner_assignments`
- Status: match
- Verified:
  - columns `partner_id`, `safehouse_id`, `program_area`, `start_date`, `end_date`, `notes`, `created_at`
  - `start_date` and `end_date` remain `string`
  - FK delete behavior preserved: cascade to `partners` and `safehouses`

### 2.04 `supporters`
- Status: match
- Verified:
  - all columns present and correctly named
  - `email` unique preserved
  - `support_type` default and check constraint preserved
  - `churn_risk_score`, `upgrade_score`, `lifetime_giving`, `last_gift_amount` mapped as `decimal`
  - `interests` mapped as `string[]`

### 2.05 `users`
- Status: match
- Verified:
  - all columns present and correctly named
  - unique constraints on `username` and `email`
  - role default and check constraint preserved
  - FK `supporter_id` delete behavior preserved: `SET NULL`
  - indexes `idx_users_role`, `idx_users_supporter` present

### 2.06 `staff_safehouse_assignments`
- Status: match
- Verified:
  - all columns present
  - unique `(user_id, safehouse_id)` preserved
  - cascade delete behavior preserved on both FKs

### 2.07 `donations`
- Status: match
- Verified:
  - all columns present and correctly named
  - `donation_type` check constraint preserved
  - `amount` mapped as nullable `decimal`
  - `donation_date` remains `string`
  - delete behavior preserved:
    - `supporter_id` cascade
    - `safehouse_id` set null
  - indexes `idx_donations_supporter`, `idx_donations_safehouse`, `idx_donations_date` present

### 2.08 `donation_allocations`
- Status: match
- Verified:
  - all columns present
  - `amount` and `percentage` mapped as `decimal`
  - cascade delete behavior preserved to `donations` and `safehouses`

### 2.09 `in_kind_donation_items`
- Status: match
- Verified:
  - all columns present and correctly named
  - defaults on `category`, `quantity`, `unit`, `condition` preserved
  - `estimated_value_per_unit` and `total_estimated_value` mapped as nullable `decimal`
  - `received_at` remains timestamp
  - delete behavior preserved:
    - `donation_id` cascade
    - `received_by` set null
  - category and condition check constraints preserved

### 2.10 `residents`
- Status: match
- Verified:
  - all columns present and correctly named
  - `admission_date` and `discharge_date` remain `string`
  - defaults on `case_status`, `risk_level`, `reintegration_status`, `last_updated`
  - check constraints preserved
  - delete behavior preserved:
    - `safehouse_id` restrict
    - `assigned_worker_id` set null
  - indexes `idx_residents_safehouse`, `idx_residents_worker`, `idx_residents_status`, `idx_residents_risk` present

### 2.11 `process_recordings`
- Status: match
- Verified:
  - all columns present
  - `session_date` remains `string`
  - `tags` mapped as `string[]`
  - defaults on boolean flags preserved
  - delete behavior preserved:
    - `resident_id` cascade
    - `worker_id` restrict
    - `safehouse_id` restrict
  - indexes `idx_proc_rec_resident`, `idx_proc_rec_worker` present

### 2.12 `home_visitations`
- Status: match
- Verified:
  - all columns present
  - `visit_date` and `follow_up_due` remain `string`
  - outcome check constraint preserved
  - delete behavior preserved:
    - `resident_id` cascade
    - `worker_id` restrict
  - index `idx_home_vis_resident` present

### 2.13 `case_conferences`
- Status: match
- Verified:
  - all columns present
  - all date-like text fields remain `string`
  - `attendees` mapped as `string[]`
  - status default and check constraint preserved
  - delete behavior preserved:
    - `resident_id` cascade
    - `safehouse_id` restrict
  - indexes `idx_case_conf_resident`, `idx_case_conf_status` present

### 2.14 `intervention_plans`
- Status: match
- Verified:
  - all columns present
  - `target_date` and `completed_date` remain `string`
  - `services` and `milestones` mapped as `string[]`
  - `success_probability` mapped as nullable `decimal`
  - status default and check constraint preserved
  - delete behavior preserved:
    - `resident_id` cascade
    - `safehouse_id` restrict
    - `worker_id` restrict
  - indexes `idx_interv_resident`, `idx_interv_status` present

### 2.15 `incident_reports`
- Status: match
- Verified:
  - all columns present
  - `incident_date` and `resolution_date` remain `string`
  - severity and status checks preserved
  - status default preserved
  - delete behavior preserved:
    - `resident_id` set null
    - `safehouse_id` restrict
    - `reported_by` restrict
  - indexes `idx_incident_safehouse`, `idx_incident_severity` present

### 2.16 `education_records`
- Status: match
- Verified:
  - all columns present
  - `record_date` remains `string`
  - `progress_score` mapped as nullable `decimal`
  - cascade delete on `resident_id` preserved

### 2.17 `health_records`
- Status: match
- Verified:
  - all columns present
  - `record_date` and `next_appointment` remain `string`
  - `health_score` mapped as nullable `decimal`
  - cascade delete on `resident_id` preserved

### 2.18 `social_media_posts`
- Status: match
- Verified:
  - all columns present
  - `post_date` remains `string`
  - `engagement_rate` and `donation_value_from_post` mapped as `decimal`
  - defaults preserved
  - platform check constraint preserved

### 2.19 `safehouse_monthly_metrics`
- Status: match after fix
- Verified:
  - all columns present
  - `month` remains `string`
  - `avg_health_score` and `avg_education_progress` mapped as nullable `decimal`
  - cascade delete on `safehouse_id` preserved
- Fixed in this pass:
  - added missing `idx_metrics_safehouse`
  - added missing unique `idx_metrics_safehouse_month (safehouse_id, month)`

### 2.20 `impact_snapshots`
- Status: match
- Verified:
  - all columns present
  - `program_outcomes` mapped as JSONB `JsonDocument`
  - defaults on `is_published`, `residents_served`, `total_donations_amount`, `program_outcomes`, `safehouses_covered`, `reintegration_count`

### 2.21 `ml_pipeline_runs`
- Status: match
- Verified:
  - all columns present
  - `last_retrained` remains `string`
  - decimal precisions preserved for `avg_confidence` and `override_rate`
  - status and health status checks preserved

### 2.22 `ml_prediction_snapshots`
- Status: match after fix
- Verified:
  - all columns present
  - `prediction_value` and `confidence_score` mapped as `decimal`
  - `top_features` mapped as JSONB `JsonDocument`
  - default on `top_features` preserved
  - `predicted_at` timestamp default preserved
- Fixed in this pass:
  - added missing `idx_ml_pred_pipeline`
  - existing `idx_ml_pred_entity` was already present

### 2.23 `report_donation_trends`
- Status: match
- Verified:
  - all columns present
  - money/rate fields mapped as `decimal`
  - `period` remains `string`

### 2.24 `report_accomplishments`
- Status: match
- Verified:
  - all columns present
  - `year` remains integer
  - `notes` nullable as in SQL

### 2.25 `report_reintegration_stats`
- Status: match
- Verified:
  - all columns present
  - decimal fields mapped correctly
  - FK `safehouse_id` delete behavior preserved: `SET NULL`

### 2.26 `audit_logs`
- Status: match after fix
- Verified:
  - all columns present
  - `details` mapped as JSONB `JsonDocument`
  - `entity_id` nullable
  - `ip_address` nullable
  - default on `details` preserved
- Fixed in this pass:
  - added missing `idx_audit_actor`
  - added missing `idx_audit_entity (entity_type, entity_id)`
  - added missing descending `idx_audit_created`

## Confirmed Fixes Made During This Audit

- [InsightsModelConfiguration.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Configurations/InsightsModelConfiguration.cs)
  - added `idx_metrics_safehouse`
  - added unique `idx_metrics_safehouse_month`
  - added `idx_ml_pred_pipeline`
  - added `idx_audit_actor`
  - added `idx_audit_entity`
  - added descending `idx_audit_created`

## Final Assessment

The persistence model now matches `beacon_rebuild.sql` very closely for schema fidelity.

Remaining note:
- this audit checks the .NET persistence code against the SQL source of truth
- it does not guarantee the live Supabase database already has every expected index applied

That last point matters because live runtime timeouts can still happen if the deployed database was created from a drifted schema or if the SQL rebuild script was not fully applied.
