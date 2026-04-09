# DATABASE_ACCESS_MAP.md

> **Purpose** — Exhaustive mapping of every database table touched by the Express API layer, with the ORM patterns, query quirks, type-coercion rules, and cross-cutting behaviors that the .NET replacement backend **must** replicate exactly.
>
> **Target migration stack**: Frontend → Vercel | Backend → Azure (.NET Web API) | Database → Supabase (PostgreSQL)
>
> Last updated: 2026-04-09

---

## 1. ORM & Connection Layer

### 1.1 Two `db` instances

| Instance | File | SSL | Used by |
|---|---|---|---|
| Runtime `db` | `artifacts/api-server/src/lib/db.ts` | Conditional — `ssl: { rejectUnauthorized: false }` when `DATABASE_URL` contains `sslmode=require` | All 18 route files |
| Tooling `db` | `lib/db/src/index.ts` | None | Drizzle Kit migrations, seed scripts |

Both connect via `pg.Pool` wrapped by `drizzle-orm/node-postgres`.

### 1.2 ORM split

| Pattern | Where used | Notes |
|---|---|---|
| Drizzle fluent API (`db.select().from(...).where(...)`) | All routes except `superadminMl.ts` | Type-safe, schema-bound |
| Raw SQL via `db.execute(sql\`...\`)` | `superadminMl.ts` exclusively | 2 544 lines of CTE-heavy PostgreSQL; returns `{ rows: [...] }` |

### 1.3 No transactions

`db.transaction()` is never called anywhere. All multi-step writes are sequential, unguarded inserts/updates. **The .NET backend should wrap equivalent multi-step operations in `BEGIN … COMMIT` blocks.**

### 1.4 No repository pattern

Routes access `db` directly. There is no service or repository abstraction layer.

---

## 2. Cross-Cutting Behaviors

### 2.1 Pagination — `resolveLimit()` hard-cap

```ts
// artifacts/api-server/src/lib/paginate.ts
Math.min(Math.max(resolved, 1), 100)   // hard cap: 100
```

**Bypass pattern**: Dashboard, export, and ML summary routes that need >100 rows either use hardcoded `.limit()` in raw SQL or fetch all rows into memory and slice in JS.

**Migration rule**: Do NOT apply a global 100-row cap in the .NET backend. Honor the hard-cap only on paginated list endpoints; export/summary endpoints may return unlimited rows.

### 2.2 In-memory filtering (scalability concern)

Many list endpoints fetch **all rows** then filter in JavaScript rather than with a SQL `WHERE` clause:

| Route file | Tables fetched entirely | Filter applied in JS |
|---|---|---|
| `residents.ts` | `residents`, `safehouses` | safehouse scope, search, status |
| `caseManagement.ts` | `residents`, `case_sessions` | `getAllowedResidentIds()` safehouse scope |
| `users.ts` | `users`, `staff_safehouse_assignments` | role, safehouse, search |
| `ml.ts` | `ml_prediction_snapshots` | `pipelineName`, `entityId`, `entityType` |
| `inKindDonationItems.ts` | `in_kind_donation_items` | `donationId`, `itemCategory` |
| `records.ts` | `resident_records` | resident scope, type filter |

**Migration rule**: Push all filters to DB-level `WHERE` clauses in the .NET backend. Enumerate explicit filter parameters in query builders.

### 2.3 `staffSafehouseAssignments` — `userId` type mismatch

The `staff_safehouse_assignments.user_id` column is `varchar`, but `users.id` is `integer`. The Express layer always casts:

```ts
String(user.id)   // before inserting or querying assignments
```

**Migration rule**: In the .NET backend, cast `int userId` to `string` when querying or inserting `staff_safehouse_assignments`.

### 2.4 NUMERIC columns — string-to-float coercion

PostgreSQL `numeric`/`decimal` columns arrive from `pg` as **strings**. The Express layer explicitly `parseFloat()`s them before serializing:

| Column examples | Tables |
|---|---|
| `amount`, `goal`, `amount_allocated` | `donations`, `campaigns`, `donation_allocations` |
| `quantity`, `estimated_unit_value` | `in_kind_donation_items` |
| `total_raised` (computed SUM) | `campaigns` query |
| `total_allocated` (correlated subquery) | `donations` query |

**Exception**: `superadminMl.ts` PHP monetary values are returned as **numeric strings** (`.toFixed(2)`) — NOT parsed to float.

**Migration rule**: Npgsql maps `numeric` to `decimal` natively — no `parseFloat` needed. Ensure JSON serialization emits JS-compatible floats (not strings) for all non-ML endpoints. ML monetary values must serialize as strings with 2 decimal places.

### 2.5 JSONB columns

The following columns are stored as `jsonb` in PostgreSQL. Drizzle returns them as parsed JS objects. **Npgsql returns them as `string`** — the .NET backend must deserialize and re-serialize:

| Column | Table |
|---|---|
| `context_json` | `case_sessions` |
| `metric_payload_json` | `safehouse_metrics` |
| `feature_importance_json` | `ml_pipeline_runs` |
| `churn_top_drivers` | `ml_prediction_snapshots` |
| `regression_risk_drivers` | `ml_prediction_snapshots` |
| Any other `*_json` / `*_drivers` columns | Various ML tables |

**Migration rule**: Deserialize JSONB to `JsonDocument` (or a typed class) on read; serialize back to JSON string when writing. Response must emit the object, not a raw JSON string.

### 2.6 Timestamp handling

All timestamp columns (`created_at`, `updated_at`, `trained_at`, etc.) are serialized with `.toISOString()` → ISO 8601 with timezone (e.g., `2025-03-15T08:00:00.000Z`). `superadminMl.ts` uses a `toIso()` helper with null-safety.

**Migration rule**: All DateTime fields in .NET responses must be serialized as ISO 8601 UTC strings.

---

## 3. Domain Table Map

### 3.1 Users & Authentication

**Route file**: `auth.ts`, `users.ts`

| Table | Operation | Notes |
|---|---|---|
| `users` | SELECT, INSERT, UPDATE | `id` is `serial` (integer). Password stored as bcrypt hash (`bcryptjs`). |
| `staff_safehouse_assignments` | SELECT, INSERT, DELETE | `user_id` is `varchar` — cast from `users.id` (integer). |

**Key behaviors**:
- Login: `bcrypt.compare(password, user.password_hash)` → JWT signed with `JWT_SECRET` (HS256, 7-day expiry).
- `POST /api/auth/register` inserts user then optionally inserts safehouse assignments in a separate loop (no transaction).
- `PATCH /api/users/:id` supports partial update: only provided fields are set.
- `DELETE /api/users/:id` deletes assignments first, then the user (no DB-level cascade).
- Post-login redirect: `super_admin` → `/superadmin`, `admin`/`staff` → `/admin`, `donor` → `/donor`.

**Supabase/Azure note**: JWT secret must be set in Azure Key Vault and injected as `JWT_SECRET` env var. Do not use Supabase Auth — the app manages its own JWT.

---

### 3.2 Safehouses

**Route file**: `safehouses.ts`

| Table | Operation | Notes |
|---|---|---|
| `safehouses` | SELECT, INSERT, UPDATE, DELETE | PK: `safehouse_id` (integer/serial). Field name is `name` (NOT `safehouseName`). |
| `staff_safehouse_assignments` | SELECT (scoping) | Joined to resolve which safehouses a staff/admin user can see. |
| `safehouse_metrics` | SELECT | Latest N rows per safehouse for trend charts. |

**Key behaviors**:
- ALL safehouse queries use raw SQL (`db.execute(sql\`...\`)`) because early Drizzle schema used `safehouseName` while DB column is `name`. Raw SQL avoids the mismatch.
- `GET /api/safehouses/:id/metrics?months=N` uses `.limit(months)` — returns latest N rows by DB insertion order, NOT a date-range filter. Month boundaries are not guaranteed.
- Safehouse scoping for non-super_admin roles: `getUserSafehouses(user)` from `middleware/auth.ts` returns allowed safehouse IDs; routes filter on those.

**Migration rule**: Always use the column name `name` in SQL. Implement a proper date-range filter for metrics in .NET (`.limit()` by insertion order is unreliable).

---

### 3.3 Supporters & Donations

**Route files**: `supporters.ts`, `donations.ts`, `donationAllocations.ts`, `inKindDonationItems.ts`

| Table | Operation | Notes |
|---|---|---|
| `supporters` | SELECT, INSERT, UPDATE, DELETE | PK: `supporter_id`. |
| `donations` | SELECT, INSERT, UPDATE, DELETE | FK: `supporter_id`, optional `campaign_id`. |
| `donation_allocations` | SELECT, INSERT, DELETE | FK: `donation_id`, `safehouse_id`. |
| `in_kind_donation_items` | SELECT, INSERT, DELETE | FK: `donation_id`. `quantity` and `estimated_unit_value` are NUMERIC — parseFloat on read. |

**Key behaviors**:
- `donations.totalAllocated`: computed via correlated subquery `SUM(donation_allocations.amount_allocated)` grouped by `donation_id` — not stored.
- `donations.unallocated = max(0, amount - totalAllocated)`.
- `donations.isGeneralFund = safehouseId IS NULL`.
- `inKindDonationItems` list fetches all rows, filters in JS by `donationId` and `itemCategory`.
- No cascade delete on `in_kind_donation_items` — must delete items before donation (or add ON DELETE CASCADE in Supabase schema).

---

### 3.4 Campaigns

**Route file**: `campaigns.ts`

| Table | Operation | Notes |
|---|---|---|
| `campaigns` | SELECT, INSERT, UPDATE, DELETE | PK: `campaign_id`. |
| `donations` | SELECT (aggregate) | `totalRaised = SUM(donations.amount)` via GROUP BY — not stored. |

**Key behaviors**:
- Donor role sees only `status = 'active'` campaigns, ordered by `deadline ASC`.
- Admin/staff/super_admin see all campaigns, ordered by `created_at DESC`.
- `totalRaised` is computed at query time — never cached or stored.

---

### 3.5 Residents

**Route file**: `residents.ts`

| Table | Operation | Notes |
|---|---|---|
| `residents` | SELECT, INSERT, UPDATE, DELETE | PK: `resident_id`. |
| `safehouses` | SELECT (join) | To include safehouse name in resident list response. |
| `staff_safehouse_assignments` | SELECT (scoping) | Scope residents to allowed safehouses for non-super_admin. |

**Key behaviors**:
- List endpoint fetches ALL residents then filters in JS by safehouse scope, search term, and status.
- `ml_scores_restricted = true` residents are excluded from ML watchlists (superadmin ML routes check this).

---

### 3.6 Case Management

**Route file**: `caseManagement.ts`

| Table | Operation | Notes |
|---|---|---|
| `case_sessions` | SELECT, INSERT, UPDATE, DELETE | PK: `session_id`. FK: `resident_id`. |
| `residents` | SELECT (scoping) | `getAllowedResidentIds()` fetches ALL residents, filters by allowed safehouses in JS. |
| `staff_safehouse_assignments` | SELECT (scoping) | Used inside `getAllowedResidentIds()`. |

**Key behaviors**:
- `context_json` is a JSONB column on `case_sessions` — returned as parsed object.
- `getAllowedResidentIds()` is the most expensive in-memory filter in the codebase: fetches all residents, all assignments, computes intersection in JS.
- **Migration rule**: Replace with a SQL JOIN + WHERE in .NET.

---

### 3.7 Records (Resident Records)

**Route file**: `records.ts`

| Table | Operation | Notes |
|---|---|---|
| `resident_records` | SELECT, INSERT, UPDATE, DELETE | PK: `record_id`. FK: `resident_id`. |
| `residents` | SELECT (scoping) | Scope records to allowed residents. |

**Key behaviors**:
- Fetches all records, filters in JS by resident scope and `record_type`.
- File attachment metadata stored in record fields (no separate table).

---

### 3.8 Program Updates & Notifications

**Route file**: `programUpdates.ts`

| Table | Operation | Notes |
|---|---|---|
| `program_updates` | SELECT, INSERT, UPDATE, DELETE | PK: `update_id`. |
| `donor_viewed_items` | SELECT, DELETE | Tracks donor read status. |

**Key behaviors**:
- **Manual cascade on DELETE**: Code deletes from `donor_viewed_items` WHERE `item_type = 'program_update' AND item_id = :id` BEFORE deleting the `program_updates` row. There is NO `ON DELETE CASCADE` in the DB schema.
- **Migration rule**: Replicate this two-step delete in .NET, or add `ON DELETE CASCADE` to the Supabase schema.

---

### 3.9 Social Media Posts & Impact

**Route files**: `socialMedia.ts`, `impactSnapshots.ts`

| Table | Operation | Notes |
|---|---|---|
| `social_media_posts` | SELECT, INSERT, UPDATE, DELETE | PK: `post_id`. `created_at` defaults to `NOW()` — always populated. |
| `public_impact_snapshots` | SELECT, INSERT, UPDATE, DELETE | PK: `snapshot_id`. |

**Key behaviors**:
- `GET /api/social-media` requires auth (`donor`, `staff`, `admin`, `super_admin`) — NOT public despite being in `public.service.ts` on the frontend.
- `GET /api/impact-snapshots` is **public** (no auth). Filters `isPublished = true` in JS after fetching all rows.
- `GET /api/admin/impact-snapshots` requires auth (admin/super_admin). Returns all rows.

---

### 3.10 ML Predictions & Pipeline Runs

**Route files**: `ml.ts`, `superadminMl.ts`

| Table | Operation | Notes |
|---|---|---|
| `ml_prediction_snapshots` | SELECT | PK: `snapshot_id`. Columns: `entity_id`, `entity_type`, `pipeline_name`, `prediction_score`, `band_label`, `churn_top_drivers` (JSONB), `regression_risk_drivers` (JSONB), `run_id`, `created_at`. |
| `ml_pipeline_runs` | SELECT | PK: `run_id`. Columns: `pipeline_name`, `status`, `trained_at`, `feature_importance_json` (JSONB). |
| `supporters` | SELECT (join, ML) | Joined in action-queue churn CTEs. |
| `residents` | SELECT (join, ML) | Joined in regression-risk CTEs; `ml_scores_restricted` column checked. |
| `safehouses` | SELECT (join, ML) | Joined in safehouse-health CTEs. |

**Key behaviors**:
- `ml.ts` uses Drizzle fluent API; fetches ALL `ml_prediction_snapshots` rows into memory, filters in JS. Extremely expensive at scale.
- `superadminMl.ts` uses **raw SQL exclusively** with CTEs that join multiple tables per widget (W01–W13).
- Privacy rules in `superadminMl.ts`:
  - `ml_scores_restricted = true` residents excluded from watchlist/row-level endpoints.
  - Other row endpoints null out ML fields and set `mlScoresRestricted: true`.
  - Donor emails redacted to `"***@***.***"` for `admin` role.
- W08 social planner accessible to `super_admin | admin`.
- W11 interventions / W12 safehouse health accessible to `super_admin | admin`.
- All other ML endpoints: `super_admin` only.
- Monetary values from ML endpoints returned as NUMERIC strings (`.toFixed(2)`), not floats.
- **Freshness thresholds** (days before a pipeline run is considered stale):

| Pipeline | Threshold (days) |
|---|---|
| `donor_churn_risk` | 8 |
| `resident_regression_risk` | 8 |
| `safehouse_health_score` | 35 |
| `reintegration_readiness` | 35 |
| `donor_upgrade_likelihood` | 35 |
| `social_post_conversion` | 35 |
| `donation_attribution` | 35 |
| `intervention_effectiveness` | 35 |

---

### 3.11 Audit Logs

**Status**: `GET /api/audit-logs` — **no Express route exists** → returns 404. Frontend calls this endpoint; it must be implemented in the .NET backend.

---

## 4. Missing / Stub Routes (Must Implement in .NET)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/dashboard/public-impact` | No Express route → 404 | Called by frontend `public.service.ts` |
| `GET /api/audit-logs` | No Express route → 404 | Called by admin/superadmin frontend |

Both must be implemented in the .NET backend from scratch.

---

## 5. Table × Route Cross-Reference

| Table | Route Files That Access It |
|---|---|
| `users` | `auth.ts`, `users.ts` |
| `staff_safehouse_assignments` | `auth.ts`, `users.ts`, `safehouses.ts`, `residents.ts`, `caseManagement.ts` |
| `safehouses` | `safehouses.ts`, `residents.ts`, `superadminMl.ts` |
| `safehouse_metrics` | `safehouses.ts`, `superadminMl.ts` |
| `supporters` | `supporters.ts`, `donations.ts`, `superadminMl.ts` |
| `donations` | `donations.ts`, `campaigns.ts`, `donationAllocations.ts` |
| `donation_allocations` | `donationAllocations.ts`, `donations.ts` |
| `in_kind_donation_items` | `inKindDonationItems.ts` |
| `campaigns` | `campaigns.ts` |
| `residents` | `residents.ts`, `caseManagement.ts`, `records.ts`, `superadminMl.ts` |
| `case_sessions` | `caseManagement.ts` |
| `resident_records` | `records.ts` |
| `program_updates` | `programUpdates.ts` |
| `donor_viewed_items` | `programUpdates.ts` |
| `social_media_posts` | `socialMedia.ts` |
| `public_impact_snapshots` | `impactSnapshots.ts` |
| `ml_prediction_snapshots` | `ml.ts`, `superadminMl.ts` |
| `ml_pipeline_runs` | `ml.ts`, `superadminMl.ts` |

---

## 6. .NET Backend — Behaviors to Preserve

The following is an ordered checklist of Express behaviors the .NET backend **must** replicate to maintain API contract compatibility:

1. **JWT format**: HS256, `JWT_SECRET` from env, 7-day expiry. Payload includes `{ id, email, role }`.
2. **Role hierarchy**: `super_admin` > `admin` > `staff` > `donor`. Guard each endpoint with the same role set as Express (`requireRoles(...)`).
3. **Safehouse scoping**: Non-super_admin users see only their assigned safehouses. Use DB-level JOIN, not in-memory filter.
4. **Pagination envelope**: `{ data: [...], total: number, pagination: { page, pageSize, totalPages } }`.
5. **Hard-cap 100 on paginated list endpoints only**. Export/summary endpoints return all rows.
6. **`safehouses.name`** — use `name` column, not any alias.
7. **`staff_safehouse_assignments.user_id`** — always `varchar`; cast integer `userId` to string before querying.
8. **NUMERIC → float**: All `numeric`/`decimal` columns serialize as JSON numbers (floats), except ML monetary values which serialize as strings with 2 decimal places.
9. **JSONB → object**: Deserialize `jsonb` columns on read; emit as JSON object (not string) in response.
10. **Timestamps → ISO 8601 UTC**: All DateTime fields in responses.
11. **`program_updates` DELETE**: Delete from `donor_viewed_items` first, then delete the update (or add ON DELETE CASCADE in Supabase schema).
12. **`campaigns.totalRaised`**: Compute via `SUM(donations.amount)` at query time, not from a stored column.
13. **`donations.totalAllocated` + `unallocated`**: Compute via subquery at query time.
14. **`donations.isGeneralFund`**: `safehouse_id IS NULL`.
15. **ML privacy**: Exclude `ml_scores_restricted = true` residents from watchlists. Redact admin-role donor emails to `"***@***.***"`.
16. **ML monetary values**: Return as `string` with `.toFixed(2)` format.
17. **`GET /api/impact-snapshots`**: Public endpoint (no auth required). Filter `is_published = true` in SQL.
18. **`GET /api/social-media`**: Requires auth (all roles).
19. **Implement missing routes**: `GET /api/audit-logs` and `GET /api/dashboard/public-impact`.

---

## 7. Schema Coupling Risks

| Risk | Description | Mitigation |
|---|---|---|
| `safehouses.name` alias | Drizzle schema had `safehouseName` alias; DB column is `name`. Raw SQL in safehouses routes bypasses ORM to avoid this. | Use column name `name` in all .NET SQL; do not trust ORM property names from old schema files. |
| `staffSafehouseAssignments.userId` type | Varchar in DB, integer in `users.id`. Casting in app layer, not DB. | .NET: cast `int` to `string` in query parameters. |
| `safehouses/:id/metrics` order | Returns latest N rows by insertion order, not by date. | .NET: implement `ORDER BY metric_date DESC LIMIT :months` for correct chronological behavior. |
| `programUpdates` cascade | No DB-level cascade; manually deleted in code. | Either replicate two-step delete in .NET or add `ON DELETE CASCADE` in Supabase DDL. |
| `ml.ts` in-memory fetch | Fetches entire `ml_prediction_snapshots` table. | .NET: push filters to SQL WHERE clause. |
| `caseManagement` scoping | `getAllowedResidentIds()` fetches all residents + all assignments. | .NET: replace with SQL JOIN + WHERE. |

---

## 8. Nullability & Enum Assumptions

| Column | Table | Nullable | Enum values / constraints |
|---|---|---|---|
| `role` | `users` | No | `'super_admin'`, `'admin'`, `'staff'`, `'donor'` |
| `status` | `campaigns` | No | `'active'`, `'completed'`, `'cancelled'` |
| `status` | `residents` | No | `'active'`, `'exited'`, `'transferred'` |
| `status` | `ml_pipeline_runs` | No | `'pending'`, `'running'`, `'completed'`, `'failed'` |
| `band_label` | `ml_prediction_snapshots` | Yes | `'safe'`, `'at-risk'`, `'critical'`, `'high'` (regression), `'low'` |
| `health_band` | `safehouse_metrics` | Yes | `'healthy'`, `'at-risk'`, `'critical'` |
| `is_published` | `public_impact_snapshots` | Yes | boolean |
| `ml_scores_restricted` | `residents` | Yes | boolean; NULL treated as false |
| `safehouse_id` | `donations` | Yes | NULL → general fund |
| `created_at` | `social_media_posts` | No | Defaults to `NOW()` — always populated |

---

## 9. Supabase / Azure Migration Notes

### 9.1 Database (Supabase)

- **Runtime connection**: Supabase pooler URL (`host:6543`, `?pgbouncer=true`). Set as `DATABASE_URL` in Azure App Service environment.
- **Migration connection**: Direct URL (`host:5432`) — used by Drizzle Kit or EF Core migrations.
- **SSL**: Always required for Supabase. .NET Npgsql connection string: `Ssl Mode=Require;Trust Server Certificate=true`.
- **Schema changes**: Apply via Drizzle Kit (`pnpm db:push`) in dev; use EF Core migrations or raw SQL scripts in production Azure pipeline.
- **ON DELETE CASCADE gaps**: `program_updates` → `donor_viewed_items` and `donations` → `in_kind_donation_items` both lack DB-level cascade. Add in Supabase DDL or replicate manual deletes in .NET.

### 9.2 Backend (Azure .NET Web API)

- Store `JWT_SECRET`, `DATABASE_URL` in **Azure Key Vault**; inject as App Settings.
- Use `Microsoft.AspNetCore.Authentication.JwtBearer` for HS256 JWT validation.
- Use Npgsql / EF Core or Dapper for database access.
- Deserialize JSONB columns with `System.Text.Json.JsonDocument` or typed POCOs.
- Serialize all `decimal` columns as JSON numbers (not strings), except ML monetary fields.
- Implement `GET /api/audit-logs` and `GET /api/dashboard/public-impact` as new endpoints.
- Apply DB-level filters (WHERE clauses) for all list endpoints — do not replicate in-memory filtering.
- Wrap all multi-step writes in `BEGIN … COMMIT` transactions.

### 9.3 Frontend (Vercel)

- Set `VITE_API_BASE_URL` to the Azure App Service URL in Vercel environment variables.
- All API calls in `artifacts/beacon/src/services/` use this base URL.
- No changes to API contract needed if .NET replicates all behaviors above.
