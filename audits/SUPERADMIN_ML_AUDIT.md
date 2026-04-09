# Super-Admin & ML Audit

## Scope
- `GET /api/ml/predictions`
- `GET /api/ml/pipelines`
- `GET /api/ml/predictions/:entityType/:entityId`
- `GET /api/dashboard/executive-summary`
- `/api/users`
- `/api/users/:id`
- `/api/users/:id/disable`
- `/api/users/:id/enable`
- `/api/admin/impact-snapshots`
- `/api/impact-snapshots` management endpoints
- `GET /api/audit-logs`

## Sources Checked
- `NodeApp/docs/api/FRONTEND_API_DEPENDENCIES.md`
- `NodeApp/docs/api/BUSINESS_LOGIC.md`
- `NodeApp/docs/api/AUTH.md`
- `NodeApp/docs/api/COMPATIBILITY_SUMMARY.md`
- `NodeApp/docs/api/ROUTES.md`
- `NodeApp/docs/api/VALIDATION_AND_ERRORS.md`
- `NodeApp/docs/api/openapi.yaml`
- frontend usage in:
  - `NodeApp/artifacts/beacon/src/services/ml.service.ts`
  - `NodeApp/artifacts/beacon/src/services/superadmin.service.ts`
  - `NodeApp/artifacts/beacon/src/pages/superadmin/MLDashboard.tsx`
  - `NodeApp/artifacts/beacon/src/pages/superadmin/UsersPage.tsx`
  - `NodeApp/artifacts/beacon/src/pages/superadmin/AuditLogsPage.tsx`
  - `NodeApp/artifacts/beacon/src/pages/superadmin/ImpactSnapshotsManagementPage.tsx`
  - `NodeApp/artifacts/beacon/src/pages/superadmin/SuperAdminDashboard.tsx`

## Confirmed Mismatches Found
1. `GET /api/dashboard/executive-summary`
   - Issue: `donationTrend` items were missing `avgAmount`, which is part of the generated `DonationTrend` schema used by the repo's typed client.
   - Fix: added `avgAmount` while preserving the handwritten dashboard aliases already in use.

2. `GET /api/ml/predictions/:entityType/:entityId`
   - Issue: the initial implementation reused the generic paginated list path with a hardcoded limit of `20`, which could truncate entity-specific prediction history even though the route has no pagination query contract.
   - Fix: entity-specific endpoint now returns all matching predictions in a standard list envelope with page `1`.

## Verified Compatible
- Route paths and HTTP methods match the docs and frontend callers.
- Role restrictions match:
  - ML routes: `staff+`
  - executive summary: `super_admin`
  - users routes: `super_admin`
  - audit logs: `super_admin`
  - admin impact snapshots and management routes: `admin+`
- Users responses preserve `assignedSafehouses` as an array and never expose `passwordHash`.
- `PATCH /api/users/:id` with `assignedSafehouses` present fully replaces assignments, including `[]`.
- `DELETE /api/users/:id` preserves the self-delete guard and exact message: `"Cannot delete your own account"`.
- `GET /api/audit-logs` defaults backend pagination limit to `50`.
- Public impact snapshot routes remain published-only; admin routes return all snapshots.
- Impact snapshot create still forces `isPublished = false`; publish/unpublish update `publishedAt` correctly.

## Documented Conflicts Preserved Intentionally
1. Audit log default page size
   - Docs require backend default `50`.
   - The handwritten frontend pagination hook defaults `pageSize` to `20`, so the browser often sends `pageSize=20` explicitly.
   - Resolution: backend remains doc-correct at `50` when no page size is supplied; explicit frontend query params still win.

2. Impact snapshot admin UI shape
   - The handwritten management page still uses legacy fields like `periodLabel`, `year`, `quarter`, `newSupporters`, and `highlights`.
   - SQL-backed docs use `title`, `period`, `programOutcomes`, `safehousesCovered`, `reintegrationCount`, and `summary`.
   - Resolution: admin snapshot responses return the SQL-backed fields plus the legacy aliases so current frontend usage stays intact.

## Outcome
- No remaining confirmed compatibility mismatches were found after the fixes above.
