# Scaffold Audit 01

Audit date: 2026-04-09

Sources audited against:

- `Asset-Manager/DATABASE_SCHEMA.sql`
- `Asset-Manager/api_docs/API_CONTRACT_SOURCE_OF_TRUTH.md`
- `Asset-Manager/api_docs/MIGRATION_GAP_LIST.md`
- `Asset-Manager/api_docs/DATABASE_ACCESS_MAP.md`

## Summary

The .NET foundation and entity scaffold are now in a good baseline state for continued parity work.

Before this audit was finalized, the following issues were found and corrected:

- CORS middleware was being used at runtime but had not actually been registered in DI.
- The scaffold did not yet support the documented `CORS_ALLOWED_ORIGINS` env var pattern.
- Standard pagination metadata used `limit` instead of the source-of-truth `pageSize` property.
- The contract-level `/api/healthz` baseline endpoint was missing.

After those fixes, the scaffold builds successfully and the remaining gaps are mostly expected because business routes have not been implemented yet.

## Fixes Applied During Audit

### 1. CORS Registration and Env Compatibility

Status: fixed

What changed:

- added a configured CORS policy registration
- added support for the documented comma-separated `CORS_ALLOWED_ORIGINS` env variable
- preserved the required header/method allowlist
- kept the JWT-only, no-cookie transport model

Why it mattered:

- without `AddCors(...)`, Azure + Vercel cross-origin traffic would fail at runtime
- without `CORS_ALLOWED_ORIGINS` support, deployment would not match the documented configuration contract

## 2. Standard Pagination Property Name

Status: fixed

What changed:

- `StandardPaginationMeta` now uses `pageSize`

Why it mattered:

- `API_CONTRACT_SOURCE_OF_TRUTH.md` defines `pageSize` as the standard pagination field

Note:

- `MIGRATION_GAP_LIST.md` references `limit` in one section. This appears to reflect live Express behavior or an earlier contract snapshot.
- For the scaffold, the current source-of-truth document was prioritized.
- When route implementations begin, each endpoint should be validated against the live frontend usage before finalizing response envelopes.

## 3. Foundation Health Endpoint

Status: fixed

What changed:

- added `/api/healthz`
- response shape is `{ "status": "ok" }`
- endpoint is anonymous

Why it mattered:

- this is a contract-level foundational route and does not count as a business endpoint

## Schema Audit

### Tables present

Result: pass

All tables from `DATABASE_SCHEMA.sql` are represented in the entity scaffold:

- `safehouses`
- `users`
- `supporters`
- `partners`
- `campaigns`
- `social_media_posts`
- `public_impact_snapshots`
- `program_updates`
- `ml_pipeline_runs`
- `residents`
- `donations`
- `staff_safehouse_assignments`
- `partner_assignments`
- `safehouse_monthly_metrics`
- `ml_prediction_snapshots`
- `donor_viewed_items`
- `incident_reports`
- `intervention_plans`
- `home_visitations`
- `case_conferences`
- `process_recordings`
- `education_records`
- `health_wellbeing_records`
- `donation_allocations`
- `in_kind_donation_items`

### Column name fidelity

Result: pass

The scaffold uses explicit fluent mapping for table and column names, including the known quirks:

- `safehouses.name`
- `staff_safehouse_assignments.user_id` as `varchar`

### Relationship discipline

Result: pass

No navigation graph was invented. Only scalar foreign-key columns were mapped, which aligns with the requirement not to create unsupported relationships.

## Type Audit

### Numeric fields

Result: pass

`NUMERIC` columns were mapped to `decimal`, which is the safest persistence choice for PostgreSQL precision.

Important downstream note:

- the API layer will still need to control JSON formatting per endpoint because the docs require:
  - normal API numeric fields as JSON numbers
  - some superadmin ML monetary fields as formatted strings

### JSONB fields

Result: pass

`JSONB` columns were mapped as `JsonDocument`, which is appropriate and safe for now.

This aligns well with `DATABASE_ACCESS_MAP.md`, which emphasizes that JSONB fields must become structured JSON objects in API responses and not raw strings.

### Timestamp fields

Result: pass with one caution

Mappings used:

- `TIMESTAMP` -> `DateTime`
- `TIMESTAMPTZ` -> `DateTimeOffset`

This correctly follows the SQL schema.

Caution:

- route implementations must normalize outbound serialization to the ISO 8601 format expected by the frontend and docs

### Special schema quirks

Result: pass

Handled correctly:

- `supporters.created_at` remains a `string` because the SQL schema defines it as `TEXT`
- `staff_safehouse_assignments.user_id` remains `string`

## Route Foundation Audit

### `/api` prefix

Result: pass

The global controller route convention enforces the `/api` prefix for attribute-routed controllers.

### Error response shape

Result: pass

The global exception middleware and model validation path both return:

```json
{ "error": "..." }
```

### 204 behavior

Result: pass

ASP.NET Core naturally returns empty bodies for 204 responses. No conflicting wrapper behavior was introduced.

### JWT-only transport

Result: pass

- bearer auth shell is configured
- no cookie auth or ASP.NET Identity was introduced

### JWT bearer validation shell

Result: pass

The scaffold matches the required shell well:

- symmetric key
- no issuer requirement
- no audience requirement
- zero clock skew
- `role` claim type configured

Important remaining gap:

- token issuance is not implemented yet, so login parity is still pending

### Role-based authorization shell

Result: pass

Policy shells are present for donor, staff/admin/super_admin combinations.

Remaining gap:

- endpoint-level role application still needs to happen as routes are implemented

## Azure + Supabase + Vercel Deployment Audit

### Forwarded headers / HTTPS / HSTS

Result: pass

The scaffold includes:

- forwarded headers
- HTTPS redirection
- HSTS outside development

This is appropriate for Azure-hosted APIs behind reverse proxies.

### Supabase/PostgreSQL wiring

Result: pass with one caution

The scaffold includes:

- `NpgsqlDataSource`
- EF Core `DbContext`
- runtime connection string wiring

Caution:

- runtime configuration still depends on a correctly supplied `DATABASE_URL` or `ConnectionStrings:PostgreSql`
- Supabase pooler-specific runtime validation is not enforced yet

### Vercel frontend interoperability

Result: pass at scaffold level

The corrected CORS policy now supports the documented environment-based origin configuration required for Vercel-to-Azure browser calls.

## Remaining Expected Gaps

These are not scaffold defects; they are simply unfinished work because business routes are intentionally not implemented yet:

- no auth login/change-password/me endpoints yet beyond `healthz`
- no request/response DTOs per route contract
- no query/repository implementations
- no response projection logic for numeric/string formatting differences
- no safehouse-scoping enforcement in route handlers yet
- no ML/raw-SQL read layer yet
- no audit log implementation yet

## Final Assessment

Current status: foundation-ready

The scaffold is now structurally aligned with the contract and schema for:

- deployment shape
- transport rules
- database model coverage
- auth shell
- pagination shells
- Azure/Vercel/Supabase compatibility

The next major risk will shift from scaffolding to route-level parity as soon as business endpoints are implemented.
