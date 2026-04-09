# Persistence Notes

## Schema-first observations

- `beacon_rebuild.sql` is the primary source of truth and defines 26 tables, while several docs refer to 24.
- The SQL schema includes these JSONB columns whose runtime JSON shape is only loosely documented:
  - `impact_snapshots.program_outcomes`
  - `ml_prediction_snapshots.top_features`
  - `audit_logs.details`
- The SQL uses `SERIAL` primary keys. The EF mapping uses PostgreSQL serial column configuration to stay aligned with the current schema.

## SQL vs docs/frontend mismatches worth keeping in mind

- `donations` does not have a `status` column in SQL, even though some docs/frontend typings mention one.
- `report_accomplishments` in SQL is shaped as:
  - `year`, `service_area`, `category`, `beneficiary_count`, `sessions_delivered`, `outcome_summary`, `notes`
  - This does not match some API docs/frontend typings that expect `period`, `title`, or `description`.
- `impact_snapshots` in SQL uses:
  - `title`, `period`, `is_published`, `published_at`, `residents_served`, `total_donations_amount`, `program_outcomes`, `safehouses_covered`, `reintegration_count`, `summary`
  - This differs from the superadmin management page typing, which expects fields like `periodLabel`, `year`, `quarter`, `newSupporters`, and `highlights`.
- `residents` in SQL is intentionally minimal and privacy-oriented. Several frontend types include additional identity/profile fields that are not present in the table and would need to come from API shaping rather than direct persistence mapping.
- `audit_logs.actor_id` is not declared as a foreign key in SQL, so the persistence layer intentionally does not model it as a relationship.

## Intentional persistence choices

- PostgreSQL text-backed date fields are mapped as `string`.
- PostgreSQL `NUMERIC` fields are mapped as `decimal`.
- PostgreSQL `TEXT[]` fields are mapped as `string[]`.
- `TIMESTAMPTZ` fields are mapped as `DateTimeOffset`.
- No ASP.NET Identity types were introduced.
- No controllers, DTOs, or request/response contracts were created in this step.
