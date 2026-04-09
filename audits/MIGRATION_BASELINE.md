# Migration Baseline — Node/Express to .NET 10 Web API

## Scope

This baseline captures the migration guardrails before implementing ASP.NET Core controllers. The goal is a .NET 10 Web API in `/Users/natemacbook/Desktop/intex/backend` that is wire-compatible with the current React + Vite frontend in `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon`, while using PostgreSQL/Supabase as the backing database.

## Source-of-Truth Priority

1. `NodeApp/docs/database/beacon_rebuild.sql`
   - Source of truth for tables, columns, PostgreSQL types, defaults, keys, checks, foreign keys, and delete behavior.
   - Especially important because several API fields are backed by `TEXT` date columns and multiple `NUMERIC` columns that the frontend expects as JSON numbers.
2. Frontend runtime contract
   - `NodeApp/artifacts/beacon/src/services/*.ts`
   - Inline page usage such as `ResidentDetailPage.tsx` and `ImpactSnapshotsManagementPage.tsx`
   - `NodeApp/artifacts/beacon/src/services/api.ts`
   - These are the source of truth for real route paths, auth handling, query param names, response envelope shapes, and error parsing.
3. Compatibility docs
   - `DOTNET_BACKEND_BUILD_SPEC.md`
   - `COMPATIBILITY_SUMMARY.md`
   - `FRONTEND_API_DEPENDENCIES.md`
   - `AUTH.md`
   - `BUSINESS_LOGIC.md`
   - `VALIDATION_AND_ERRORS.md`
   - `ROUTES.md`
4. `NodeApp/docs/api/openapi.yaml`
   - Useful as a contract reference, but subordinate to the SQL schema plus live frontend usage if they conflict.

## Non-Negotiable Compatibility Rules

- Keep the API rooted at `/api`. No version prefixing.
- Preserve current HTTP semantics:
  - `GET`/`PATCH`/business `POST` success: `200`
  - create `POST`: `201`
  - `DELETE`: `204` with no body
- Return errors only as `{ "error": "<message>" }`. Do not emit ASP.NET `ProblemDetails`.
- Preserve camelCase JSON in both request/response payloads.
- Preserve JWT auth behavior:
  - `Authorization: Bearer <token>`
  - HS256
  - 8 hour expiry
  - live `isActive` database check on every protected request
  - `GET /api/auth/me` remains optional-auth and returns `{ user: null }` when unauthenticated
- Public endpoints must stay public:
  - `/api/healthz`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/me`
  - `/api/dashboard/public-impact`
  - `/api/impact-snapshots`
  - `/api/impact-snapshots/:id` for published-only reads
- Preserve list envelopes exactly where the frontend expects them:
  - standard paginated shape: `{ data, total, pagination }`
  - exceptions must remain exceptions
- Do not rename fields the frontend already reads, even if the name is awkward or duplicated.
- Do not map schema `TEXT` date columns to `DateTime`/`DateOnly`; keep them as strings in the domain/API boundary.
- Ensure PostgreSQL `NUMERIC` values serialize as JSON numbers, not strings.

## Known Frontend Quirks To Preserve

- `POST /api/auth/login` returns `user.safehouses` in the response body, but `safehouses` is not part of the JWT payload.
- Any `401` causes frontend logout via `beacon:unauthorized`; any `403` causes redirect to `/forbidden`. Status code drift will break UX.
- `GET /api/donations/trends` must include both aliases:
  - `month` and `period`
  - `total` and `totalAmount`
  - `count` and `donationCount`
- `PATCH /api/users/:id` with `assignedSafehouses: []` means remove all assignments. This is full replacement, not patch-merge.
- `POST /api/impact-snapshots` always creates drafts with `isPublished: false`, regardless of request body.
- Public impact snapshots must only expose published records; admin snapshot routes expose all records.
- `GET /api/partners` currently accepts `search` and `programArea` params but effectively ignores them. Preserve behavior unless frontend is updated with a coordinated change.
- `GET /api/donation-allocations` returns `{ data, total }` without `pagination`.
- `GET /api/residents/:id/timeline` returns a plain array, not a wrapped object.
- `GET /api/social-media-posts/analytics` returns a flat analytics object, not a wrapped list.
- `GET /api/in-kind-donation-items` uses `pageSize` and not the shared `limit` convention.
- Some frontend typings are looser than docs and may tolerate extra fields, but they do depend on current names for core fields like `residentCode`, `assignedWorkerName`, `safehouseName`, `impactCards`, `allocationBreakdown`, `milestones`, and list `data`.

## Implementation Order

1. Establish infrastructure in the .NET app
   - Remove scaffold-only sample controller usage.
   - Add global JSON camelCase config.
   - Suppress automatic model validation responses.
   - Add centralized error shaping to `{ error }`.
   - Add auth wiring, JWT config, and role policy helpers.
   - Add CORS/configuration appropriate for React on Vercel and API on Azure.
2. Model the database from `beacon_rebuild.sql`
   - Build entities/configuration from SQL, not from current OpenAPI guesses.
   - Pay special attention to `TEXT[]`, `NUMERIC`, `TIMESTAMPTZ`, and `TEXT` date columns.
   - Capture FK delete behavior exactly, including `CASCADE`, `SET NULL`, and `RESTRICT`.
3. Implement shared compatibility helpers
   - pagination/query parsing
   - list envelope formatting
   - numeric serialization consistency
   - auth user shaping
   - user/safehouse assignment formatting
4. Implement auth first
   - `healthz`
   - `auth/login`
   - `auth/logout`
   - `auth/me`
   - `auth/change-password`
   - These unblock the frontend shell and establish the 401/403 contract early.
5. Implement core admin data surfaces with highest frontend reach
   - users
   - residents and resident stats/timeline
   - supporters and donor self-profile
   - donations, donation trends, donation allocations
   - dashboard endpoints
6. Implement remaining operational CRUD/resource families
   - process recordings
   - home visitations
   - case conferences
   - intervention plans
   - incidents
   - education records
   - health records
   - safehouses
   - partners and partner assignments
7. Implement reporting and ML read models
   - reports
   - ML pipelines
   - ML predictions
   - social media analytics
   - audit logs
8. Implement impact snapshot publish workflow last among public-facing features
   - because it has both public and admin visibility semantics and draft/publish behavior
9. After each group, verify against real frontend calls before moving on
   - route path
   - query params
   - status codes
   - response body shape
   - auth behavior

## Risk List: Most Likely Drift Areas

- Schema drift from replacing SQL truth with inferred C# types
  - Highest risk: text-backed dates, `TEXT[]` arrays, `NUMERIC` precision, and FK delete semantics.
- ASP.NET default behaviors leaking through
  - `ProblemDetails`
  - automatic 400 model validation responses
  - PascalCase serialization
  - default auth/authorization challenge responses that do not match current error messages
- Numeric drift
  - Postgres decimals accidentally exposed as strings or rounded differently than current frontend expectations.
- Envelope drift
  - returning `{ items, count }`, omitting `pagination`, or wrapping single-resource responses.
- Auth drift
  - changing JWT claims
  - omitting live `isActive` checks
  - making `/api/auth/me` hard-auth instead of optional-auth
  - returning different 401/403 patterns that trigger wrong frontend behavior
- Route drift
  - path names, route precedence for special paths like `/stats`, `/trends`, `/my-ledger`, `/analytics`, `/me`
  - accidental versioning or controller naming changes
- Business-logic drift
  - heuristics and hardcoded dashboard/supporter values being “cleaned up”
  - create-vs-publish rules for impact snapshots
  - user safehouse replacement semantics
- Query param drift
  - `pageSize` vs `limit`
  - endpoints that accept params but currently ignore them
- Error-message drift
  - user creation password validation uses first-failure messages
  - change-password uses aggregated `"Password must contain: ..."` messaging
  - login intentionally collapses bad credentials and inactive accounts into the same `401`
- Frontend type looseness hiding backend incompatibilities until runtime
  - some components only read a subset of fields, so silent regressions can hide in less-used screens unless we test page-by-page.

## Current Structure Snapshot

- `.NET backend scaffold`: `/Users/natemacbook/Desktop/intex/backend/intex/intex`
  - currently still stock ASP.NET Core template with `Program.cs` and `WeatherForecastController.cs`
- Legacy app + docs: `/Users/natemacbook/Desktop/intex/NodeApp`
  - frontend: `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src`
  - API docs: `/Users/natemacbook/Desktop/intex/NodeApp/docs/api`
  - DB schema: `/Users/natemacbook/Desktop/intex/NodeApp/docs/database/beacon_rebuild.sql`

## Working Assumption For Migration

The migration target is:
- React + Vite frontend hosted on Vercel
- .NET 10 ASP.NET Core Web API hosted on Azure
- PostgreSQL hosted on Supabase

That hosting change is infrastructure-only. It must not change the frontend-facing API contract.
