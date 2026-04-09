# Entity Mapping Notes

This file documents the notable schema-to-.NET mappings created from `DATABASE_SCHEMA.sql`.

## Type Handling

- `SERIAL` maps to `int`
- `BIGSERIAL` and `BIGINT` map to `long`
- `INTEGER` maps to `int`
- `NUMERIC` maps to `decimal`
- `DOUBLE PRECISION` maps to `double`
- `BOOLEAN` maps to `bool`
- `DATE` maps to `DateOnly`
- `TIMESTAMP` maps to `DateTime`
- `TIMESTAMPTZ` maps to `DateTimeOffset`
- `JSONB` maps to `JsonDocument`

Nullable CLR types were used wherever the SQL column is nullable.

## Known Quirks Preserved Exactly

- `safehouses.name` is mapped directly as the real backing column for `Safehouse.Name`.
- `staff_safehouse_assignments.user_id` is mapped as `string` with `varchar` column type, not `int`.

## JSONB Safety

`jsonb` columns were mapped to `JsonDocument` so the backend can safely deserialize database JSON into structured values without flattening them into strings. This is important for:

- ML driver fields
- payload/metrics columns
- JSON context columns

The current mapping is intentionally conservative and avoids strong typed sub-objects until route DTOs are implemented.

## Timestamp Choices

- `timestamp without time zone` was mapped to `DateTime`
- `timestamp with time zone` was mapped to `DateTimeOffset`

This matches the SQL definition and avoids silently inventing timezone semantics where the schema does not define them.

## Relationships

No navigation-property graph was introduced. Only scalar foreign key columns were mapped.

That was done deliberately because the task requires:

- no invented relationships beyond the SQL
- schema accuracy first
- compile-safe scaffolding without prematurely shaping loading behavior

Foreign key columns are still present and named exactly, so repository/query code can join on them explicitly later.

## Notable Risk Areas

- `supporters.created_at` is stored as `TEXT` in the schema, not a timestamp. It was therefore mapped as `string`.
- `campaigns.created_at` / `updated_at`, `program_updates.*`, and some other timestamp columns are plain `TIMESTAMP`, not `TIMESTAMPTZ`, so they are mapped as `DateTime`.
- Several monetary and score fields are `NUMERIC`; these were mapped to `decimal` so precision is preserved. API-layer formatting decisions will still need to follow the transport contract later.

## What Still Remains

- add repository/query implementations
- add request/response DTOs
- add route-specific projection models
- add contract tests to confirm serialization behavior matches the frontend expectations
