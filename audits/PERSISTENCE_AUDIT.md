# Persistence Audit

## Audit Basis

Compared the generated persistence layer against:

- `NodeApp/docs/database/beacon_rebuild.sql`
- `NodeApp/docs/api/DATA_MODELS.md`
- `NodeApp/docs/api/DOTNET_BACKEND_BUILD_SPEC.md`
- `NodeApp/docs/api/ROUTES.md`
- `NodeApp/docs/api/openapi.yaml`

Priority used for persistence decisions:

1. SQL schema
2. Compatibility/build docs where they agree with SQL
3. OpenAPI and data model docs as secondary references

If docs conflicted with SQL, SQL was treated as authoritative for persistence and the conflict is listed below.

## Confirmed Persistence Fixes Applied

These gaps were fixed during this audit so the EF model now tracks the real schema more closely:

- Added default schema mapping to `public` in `BeaconDbContext`.
- Added SQL-backed check constraints for enum-like text columns:
  - `safehouses.status`
  - `partners.status`
  - `supporters.support_type`
  - `users.role`
  - `donations.donation_type`
  - `in_kind_donation_items.category`
  - `in_kind_donation_items.condition`
  - `residents.case_status`
  - `residents.risk_level`
  - `residents.reintegration_status`
  - `home_visitations.outcome`
  - `case_conferences.status`
  - `intervention_plans.status`
  - `incident_reports.severity`
  - `incident_reports.status`
  - `social_media_posts.platform`
  - `ml_pipeline_runs.status`
  - `ml_pipeline_runs.health_status`
- Added the SQL indexes that were defined in `beacon_rebuild.sql` and missing from EF configuration:
  - `users(role, supporter_id)`
  - `residents(safehouse_id, assigned_worker_id, case_status, risk_level)`
  - `donations(supporter_id, safehouse_id, donation_date)`
  - `process_recordings(resident_id, worker_id)`
  - `home_visitations(resident_id)`
  - `case_conferences(resident_id, status)`
  - `intervention_plans(resident_id, status)`
  - `incident_reports(safehouse_id, severity)`
  - `ml_prediction_snapshots(entity_type, entity_id)`

## Current Match Against SQL

After the fixes above, no confirmed mismatches remain in the audited categories below.

### Table Names

- All 26 SQL tables are represented in the persistence layer.
- `BeaconDbContext` exposes a `DbSet<>` for every SQL table.
- All entity mappings target the correct snake_case table names.

### Column Names

- All mapped columns use the SQL snake_case column names from `beacon_rebuild.sql`.
- No persistence-only renamed columns were introduced.

### Nullability

- Required vs nullable scalar properties now align with SQL in the persistence model.
- Nullable foreign keys are modeled as nullable C# properties where SQL allows null:
  - `users.supporter_id`
  - `donations.safehouse_id`
  - `in_kind_donation_items.received_by`
  - `residents.assigned_worker_id`
  - `incident_reports.resident_id`
  - `report_reintegration_stats.safehouse_id`
- Required string-backed date fields are modeled as non-nullable where SQL says `NOT NULL`.

### Date Field Typing

- PostgreSQL text-backed date fields are mapped as `string`, not `DateTime`:
  - `partner_assignments.start_date`, `end_date`
  - `supporters.last_gift_date`
  - `donations.donation_date`
  - `residents.admission_date`, `discharge_date`
  - `process_recordings.session_date`
  - `home_visitations.visit_date`, `follow_up_due`
  - `case_conferences.scheduled_date`, `completed_date`, `next_conference_date`
  - `intervention_plans.target_date`, `completed_date`
  - `incident_reports.incident_date`, `resolution_date`
  - `education_records.record_date`
  - `health_records.record_date`, `next_appointment`
  - `social_media_posts.post_date`
  - `safehouse_monthly_metrics.month`
  - `ml_pipeline_runs.last_retrained`
  - `report_donation_trends.period`
  - `report_reintegration_stats.period`
- `TIMESTAMPTZ` columns remain mapped as `DateTimeOffset`.

### Arrays

- All PostgreSQL `TEXT[]` columns are mapped as `string[]`:
  - `safehouses.program_areas`
  - `supporters.interests`
  - `process_recordings.tags`
  - `case_conferences.attendees`
  - `intervention_plans.services`
  - `intervention_plans.milestones`

### Decimal Handling

- All PostgreSQL `NUMERIC` fields are mapped as `decimal` or `decimal?`.
- Precision/scale from SQL is preserved in column mappings.

### Foreign Keys And Delete Behaviors

- EF relationships match SQL foreign keys and delete actions:
  - `CASCADE`, `SET NULL`, and `RESTRICT` are preserved as configured.
- `audit_logs.actor_id` remains scalar-only because SQL does not define it as a foreign key.

## Documentation Conflicts Where SQL Won

These are not persistence bugs. They are doc/schema conflicts and were intentionally resolved in favor of SQL.

### `donations`

- Docs/openapi mention `status`.
- SQL table does not have a `status` column.
- Persistence intentionally does not model `donations.status`.

### `partner_assignments`

- `DATA_MODELS.md` describes fields such as `status` and `updated_at`, and says `safehouse_id` / `start_date` may be nullable.
- SQL actually defines:
  - no `status`
  - no `updated_at`
  - `safehouse_id NOT NULL`
  - `start_date TEXT NOT NULL`
- Persistence follows SQL.

### `incident_reports`

- `DATA_MODELS.md` describes a different shape with fields like `follow_up_date` and `resolution_notes`, and different nullability.
- SQL actually defines:
  - `resolution`
  - `resolution_date`
  - no `follow_up_date`
  - several fields as `NOT NULL`
- Persistence follows SQL.

### `process_recordings`

- `DATA_MODELS.md` describes a simpler/older structure with fields like `session_type`, `summary`, `intervention_used`, and `progress_note`.
- SQL actually defines:
  - `safehouse_id`
  - `duration`
  - `emotional_state_start`
  - `emotional_state_end`
  - `progress_noted`
  - `referral_made`
  - `follow_up_required`
  - `tags`
- Persistence follows SQL.

### `home_visitations`

- `DATA_MODELS.md` refers to fields such as `purpose`, `observations`, and `conducted_by`.
- SQL actually defines:
  - `worker_id`
  - `cooperation_level`
  - `follow_up_required`
  - `follow_up_due`
- Persistence follows SQL.

### `intervention_plans`

- `DATA_MODELS.md` describes columns like `objective`, `completion_date`, and `assigned_to`.
- SQL actually defines:
  - `worker_id`
  - `services`
  - `milestones`
  - `success_probability`
  - `completed_date`
- Persistence follows SQL.

### `safehouse_monthly_metrics`

- `DATA_MODELS.md` describes `resident_count` and `incidents`.
- SQL actually defines:
  - `active_residents`
  - `incident_count`
  - `process_recording_count`
  - `visit_count`
- Persistence follows SQL.

### `impact_snapshots`

- Docs/frontend references mention fields like `content`, `periodLabel`, `year`, `quarter`, `newSupporters`, and `highlights`.
- SQL actually defines:
  - `title`
  - `period`
  - `program_outcomes`
  - `safehouses_covered`
  - `summary`
  - no `content`, `periodLabel`, `year`, `quarter`, `newSupporters`, or `highlights`
- Persistence follows SQL. Any alternate API shape will need to be composed later above the persistence layer.

### `social_media_posts`

- `DATA_MODELS.md` references `posted_at`.
- SQL defines `post_date` and `time_window`, but not `posted_at`.
- Persistence follows SQL.

### `ml_prediction_snapshots`

- `DATA_MODELS.md` mentions `created_at`.
- SQL defines `predicted_at` and does not define `created_at`.
- Persistence follows SQL.

### `ml_pipeline_runs`

- `DATA_MODELS.md` mentions `last_run_at`.
- SQL does not define `last_run_at`; it defines `last_retrained`.
- Persistence follows SQL.

### `report_accomplishments`

- Docs/frontend expectations refer to fields like `period`, `title`, and `description`.
- SQL defines:
  - `year`
  - `service_area`
  - `category`
  - `beneficiary_count`
  - `sessions_delivered`
  - `outcome_summary`
  - `notes`
- Persistence follows SQL.

### `in_kind_donation_items`

- `DATA_MODELS.md` lists category values including `supplies`.
- SQL allows:
  - `food`, `clothing`, `medicine`, `equipment`, `educational`, `hygiene`, `other`
- Persistence follows SQL.

## Result

The persistence layer now matches `beacon_rebuild.sql` as closely as possible for:

- table names
- column names
- nullability
- date field typing
- arrays
- decimal handling
- foreign keys and delete behaviors

Build verification: `dotnet build` succeeded after the audit fixes.
