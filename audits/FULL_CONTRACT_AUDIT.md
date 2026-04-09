# Full Contract Audit

## Scope & Inputs
- Implementation audited: `/Users/natemacbook/Desktop/intex/backend/intex/intex`
- Specs/docs checked:
  - `NodeApp/docs/api/DOTNET_BACKEND_BUILD_SPEC.md`
  - `NodeApp/docs/api/COMPATIBILITY_SUMMARY.md`
  - `NodeApp/docs/api/FRONTEND_API_DEPENDENCIES.md`
  - `NodeApp/docs/api/AUTH.md`
  - `NodeApp/docs/api/BUSINESS_LOGIC.md`
  - `NodeApp/docs/api/VALIDATION_AND_ERRORS.md`
  - `NodeApp/docs/api/ROUTES.md`
  - `NodeApp/docs/api/openapi.yaml`
- Frontend usage checked:
  - `NodeApp/artifacts/beacon/src/services/*.ts`
  - `NodeApp/artifacts/beacon/src/pages/**/*.tsx`

## Severity Summary

### Breaks Frontend Immediately
1. `GET /api/supporters/:id` was missing even though the real frontend exposes `useGetSupporter()`.
   - Fixed now.
2. `GET /api/ml/predictions/:entityType/:entityId` truncated results to 20 even though the route has no pagination query contract.
   - Fixed now.
3. `GET /api/dashboard/executive-summary` returned `donationTrend` without `avgAmount`, which the generated schema expects.
   - Fixed now.

### Latent Bug
1. `GET /api/supporters/:id/giving-stats` was missing from the documented contract.
   - Fixed now.
2. `GET /api/donations/:id` was missing from the documented contract.
   - Fixed now.
3. `GET /api/partners` ignored `search` and `programArea`.
   - Fixed now.

### Docs Conflict Only
1. Legacy docs sometimes describe duplicate email/username as `500`; current .NET implementation returns `409` in multiple write paths.
   - This matches the build spec direction and is safer for clients.
2. `GET /api/social-media-posts` allows donor reads for current frontend compatibility, while some docs still label it staff-only.
   - Preserved intentionally because the donor frontend really calls it.
3. Audit logs backend default limit is `50`, but the handwritten pagination hook usually sends `pageSize=20`.
   - Backend remains doc-correct; explicit frontend query params still override.
4. Several handwritten frontend TypeScript interfaces contain stale optional fields not present in current SQL-backed responses.
   - No immediate break observed where the pages do not actually read those fields.

## Route Matrix

Legend:
- `Auth/Role`: `Public`, `Any`, `Donor`, `Staff+`, `Admin+`, `SuperAdmin`
- `Envelope`: `Flat`, `Paged`, `DataOnly`, `Array`
- `Audit`: `OK`, `Fixed`, `DocsConflict`

### Health & Auth

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/healthz` | Public | none | health object | Flat | `200` | public liveness route | OK |
| `POST /api/auth/login` | Public | `username`, `password` | `{ token, user }` | Flat | `200`, `400`, `401` | updates `lastLogin`; safehouses in body only | OK |
| `POST /api/auth/logout` | Public | none | message response | Flat | `200` | stateless | OK |
| `GET /api/auth/me` | Public optional auth | none | `{ user }` or `{ user: null }` | Flat | `200` | must never 401 when anonymous | OK |
| `POST /api/auth/change-password` | Any | `currentPassword`, `newPassword` | message response | Flat | `200`, `400`, `401` | aggregated password error string | OK |

### Dashboard

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/dashboard/public-impact` | Public | none | public impact summary | Flat | `200` | milestone hardcodes + public aliases | OK |
| `GET /api/dashboard/donor-summary` | Donor | none | donor summary | Flat | `200` | zeroed response if `supporterId` null | OK |
| `GET /api/dashboard/admin-summary` | Staff+ | none | admin summary | Flat | `200` | admin aliases preserved | OK |
| `GET /api/dashboard/executive-summary` | SuperAdmin | none | executive summary | Flat | `200` | includes handwritten aliases + `donationTrend.avgAmount` | Fixed |

### Users

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/users` | SuperAdmin | `page`, `limit/pageSize`, `role` | user list | Paged | `200` | `assignedSafehouses` always array | OK |
| `POST /api/users` | SuperAdmin | create user body | user | Flat | `201`, `400`, `409` | first-failure password validation; default role `public` if omitted | OK |
| `GET /api/users/:id` | SuperAdmin | path id | user | Flat | `200`, `404` | `assignedSafehouses` joined from assignments | OK |
| `PATCH /api/users/:id` | SuperAdmin | partial user body | user | Flat | `200`, `404`, `409` | `assignedSafehouses` fully replaces, including `[]` | OK |
| `DELETE /api/users/:id` | SuperAdmin | path id | none | Flat | `204`, `400`, `404` | self-delete guard exact message | OK |
| `POST /api/users/:id/disable` | SuperAdmin | none | user | Flat | `200`, `404` | flips `isActive=false` | OK |
| `POST /api/users/:id/enable` | SuperAdmin | none | user | Flat | `200`, `404` | flips `isActive=true` | OK |

### Supporters

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/supporters/me` | Donor | none | supporter | Flat | `200`, `404` | linked by `supporterId` | OK |
| `PATCH /api/supporters/me` | Donor | whitelisted fields only | supporter | Flat | `200`, `400`, `404` | `"No fields to update"` exact 400 | OK |
| `GET /api/supporters/stats` | Staff+ | none | stats object | Flat | `200` | hardcoded/computed mix + aliases | OK |
| `GET /api/supporters/:id/giving-stats` | Donor own or Staff+ | path id | giving stats | Flat | `200`, `403`, `404` | `givingThisYear = lifetimeGiving * .35`, `monthlyTrend=[]` | Fixed |
| `GET /api/supporters/:id` | Staff+ | path id | supporter | Flat | `200`, `404` | formatted supporter | Fixed |
| `GET /api/supporters` | Staff+ | `page`, `limit/pageSize` | supporter list | Paged | `200` | numeric fields remain numbers | OK |
| `POST /api/supporters` | Staff+ | create supporter body | supporter | Flat | `201`, `400`, `409` | SQL-backed create | OK |
| `PATCH /api/supporters/:id` | Staff+ | partial supporter body | supporter | Flat | `200`, `400`, `404`, `409` | SQL-backed update | OK |
| `DELETE /api/supporters/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |

### Donations & Allocations

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/donations/my-ledger` | Donor | `page`, `limit/pageSize` | donation list | Paged | `200` | empty list if `supporterId` null | OK |
| `GET /api/donations/trends` | Staff+ | `months` | `{ data: trends }` | DataOnly | `200` | alias duplication preserved | OK |
| `GET /api/donations/:id` | Any authenticated | path id | donation | Flat | `200`, `403`, `404` | donor limited to own donation | Fixed |
| `GET /api/donations` | Staff+ | `page`, `limit/pageSize`, `supporterId` | donation list | Paged | `200` | money fields are numbers | OK |
| `POST /api/donations` | Staff+ | create donation body | donation | Flat | `201`, `400`, `409` | positive amount validation | OK |
| `PATCH /api/donations/:id` | Staff+ | partial donation body | donation | Flat | `200`, `400`, `404`, `409` | update route | OK |
| `DELETE /api/donations/:id` | Admin+ | path id | none | Flat | `204`, `404` | stateless delete | OK |
| `GET /api/donation-allocations` | Donor or Staff+ | `donationId`, `safehouseId` | allocations | DataOnly | `200` | no pagination; donor scoped to own donations | OK |
| `POST /api/donation-allocations` | Staff+ | create allocation body | allocation | Flat | `201`, `400`, `409` | create returns `safehouseName: ""` | OK |

### Residents

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/residents/stats` | Staff+ | none | resident stats | Flat | `200` | heuristic fields + aliases | OK |
| `GET /api/residents/:id/timeline` | Staff+ | path id | timeline events | Array | `200`, `404` | plain root array | OK |
| `GET /api/residents/:id` | Staff+ | path id | resident detail | Flat | `200`, `404` | includes joined names | OK |
| `GET /api/residents` | Staff+ | list/filter params | resident list | Paged | `200` | list keeps `safehouseName=""` quirk | OK |
| `POST /api/residents` | Staff+ | create resident body | resident | Flat | `201`, `400`, `409` | create response keeps blank joined names | OK |
| `PATCH /api/residents/:id` | Staff+ | partial resident body | resident | Flat | `200`, `400`, `404`, `409` | updates `lastUpdated` | OK |
| `DELETE /api/residents/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |

### Case Management

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/process-recordings` | Staff+ | list/filter params | process recordings | Paged | `200` | includes `residentCode`, `workerName` | OK |
| `GET /api/process-recordings/:id` | Staff+ | path id | process recording | Flat | `200`, `404` | detail route | OK |
| `POST /api/process-recordings` | Staff+ | create body | process recording | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/process-recordings/:id` | Staff+ | patch body | process recording | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/process-recordings/:id` | Staff+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/home-visitations` | Staff+ | list/filter params | home visitations | Paged | `200` | includes `residentCode`, `workerName` | OK |
| `GET /api/home-visitations/:id` | Staff+ | path id | home visitation | Flat | `200`, `404` | detail route | OK |
| `POST /api/home-visitations` | Staff+ | create body | home visitation | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/home-visitations/:id` | Staff+ | patch body | home visitation | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/home-visitations/:id` | Staff+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/case-conferences` | Staff+ | list/filter params | case conferences | Paged | `200` | supports `upcoming=true` | OK |
| `GET /api/case-conferences/:id` | Staff+ | path id | case conference | Flat | `200`, `404` | detail route | OK |
| `POST /api/case-conferences` | Staff+ | create body | case conference | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/case-conferences/:id` | Staff+ | patch body | case conference | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/case-conferences/:id` | Admin+ | path id | none | Flat | `204`, `404` | stricter delete role | OK |
| `GET /api/intervention-plans` | Staff+ | list/filter params | intervention plans | Paged | `200` | includes joined display fields | OK |
| `GET /api/intervention-plans/:id` | Staff+ | path id | intervention plan | Flat | `200`, `404` | detail route | OK |
| `POST /api/intervention-plans` | Staff+ | create body | intervention plan | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/intervention-plans/:id` | Staff+ | patch body | intervention plan | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/intervention-plans/:id` | Admin+ | path id | none | Flat | `204`, `404` | stricter delete role | OK |
| `GET /api/incidents` | Staff+ | list/filter params | incidents | Paged | `200` | includes `reportedByName` | OK |
| `GET /api/incidents/:id` | Staff+ | path id | incident | Flat | `200`, `404` | detail route | OK |
| `POST /api/incidents` | Staff+ | create body | incident | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/incidents/:id` | Staff+ | patch body | incident | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/incidents/:id` | Admin+ | path id | none | Flat | `204`, `404` | stricter delete role | OK |
| `GET /api/health-records` | Staff+ | list/filter params | health records | Paged | `200` | includes `updatedAt` | OK |
| `POST /api/health-records` | Staff+ | create body | health record | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/health-records/:id` | Staff+ | patch body | health record | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/health-records/:id` | Staff+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/education-records` | Staff+ | list/filter params | education records | Paged | `200` | includes `updatedAt` | OK |
| `POST /api/education-records` | Staff+ | create body | education record | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/education-records/:id` | Staff+ | patch body | education record | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/education-records/:id` | Staff+ | path id | none | Flat | `204`, `404` | delete route | OK |

### Safehouses, Partners, Reports, Social, In-Kind

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/safehouses` | Staff+ | `page`, `limit/pageSize`, `search` | safehouse list | Paged | `200` | SQL search on name | OK |
| `GET /api/safehouses/:id` | Staff+ | path id | safehouse | Flat | `200`, `404` | detail route | OK |
| `GET /api/safehouses/:id/metrics` | Staff+ | `months` | monthly metrics | Array | `200`, `404` | plain array, not paged | OK |
| `POST /api/safehouses` | Admin+ | create body | safehouse | Flat | `201`, `400`, `409` | create route | OK |
| `PATCH /api/safehouses/:id` | Admin+ | patch body | safehouse | Flat | `200`, `400`, `404`, `409` | update route | OK |
| `DELETE /api/safehouses/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/partners` | Staff+ | `page`, `limit/pageSize`, `search`, `programArea` | partner list | Paged | `200` | now honors `search` and `programArea` | Fixed |
| `GET /api/partners/:id` | Staff+ | path id | partner | Flat | `200`, `404` | detail route | OK |
| `POST /api/partners` | Admin+ | create body | partner | Flat | `201`, `400`, `409` | create route | OK |
| `PATCH /api/partners/:id` | Admin+ | patch body | partner | Flat | `200`, `400`, `404`, `409` | update route | OK |
| `DELETE /api/partners/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/partner-assignments` | Staff+ | `partnerId`, `safehouseId` | assignments | Array | `200` | data list without pagination wrapper | OK |
| `POST /api/partner-assignments` | Admin+ | create body | assignment | Flat | `201`, `400`, `409` | create route | OK |
| `DELETE /api/partner-assignments/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/reports/donation-trends` | Staff+ | none | report rows | DataOnly | `200` | precomputed table | OK |
| `GET /api/reports/accomplishments` | Staff+ | none | report rows | DataOnly | `200` | precomputed table | OK |
| `GET /api/reports/reintegration-stats` | Staff+ | none | report rows | DataOnly | `200` | aliases `reintegrated`, `total` preserved | OK |
| `GET /api/social-media-posts` | Donor or Staff+ | `page`, `limit/pageSize`, filters | social posts | Paged | `200` | donor access kept for real frontend | DocsConflict |
| `GET /api/social-media-posts/analytics` | Staff+ | none | analytics object | Flat | `200` | static best-* fields + empty heatmap | OK |
| `GET /api/social-media-posts/:id` | Staff+ | path id | social post | Flat | `200`, `404` | route order safe | OK |
| `POST /api/social-media-posts` | Staff+ | create body | social post | Flat | `201`, `400`, `404` | create route | OK |
| `PATCH /api/social-media-posts/:id` | Staff+ | patch body | social post | Flat | `200`, `400`, `404` | update route | OK |
| `DELETE /api/social-media-posts/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `GET /api/in-kind-donation-items` | Staff+ | `page`, `pageSize`, `donationId`, `category` | item list | Paged | `200` | ignores `limit`, uses `pageSize` only | OK |
| `GET /api/in-kind-donation-items/:id` | Staff+ | path id | item | Flat | `200`, `404` | detail route | OK |
| `POST /api/in-kind-donation-items` | Staff+ | create body | item | Flat | `201`, `400`, `409` | required-field aggregate message | OK |
| `DELETE /api/in-kind-donation-items/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |

### ML

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/ml/predictions` | Staff+ | `pipeline`, `entityType`, `entityId`, paging | prediction list | Paged | `200` | filtering in memory before pagination | OK |
| `GET /api/ml/pipelines` | Staff+ | none | pipeline list | DataOnly | `200` | each pipeline includes `performanceTrend: []` | OK |
| `GET /api/ml/predictions/:entityType/:entityId` | Staff+ | path params | prediction list | Paged | `200` | now returns full entity history in one page | Fixed |

### Impact Snapshots

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/impact-snapshots` | Public | `page`, `limit/pageSize`, ignored `published` | published snapshots | Paged | `200` | published only | OK |
| `GET /api/impact-snapshots/:id` | Public | path id | snapshot | Flat | `200`, `404` | unpublished also returns 404 | OK |
| `GET /api/admin/impact-snapshots` | Admin+ | `page`, `limit/pageSize` | snapshots | Paged | `200` | all snapshots, ordered by `createdAt desc` | OK |
| `GET /api/admin/impact-snapshots/:id` | Admin+ | path id | snapshot | Flat | `200`, `404` | admin can see unpublished | OK |
| `POST /api/impact-snapshots` | Admin+ | SQL fields plus legacy admin aliases | snapshot | Flat | `201`, `400` | always creates unpublished | OK |
| `PATCH /api/impact-snapshots/:id` | Admin+ | partial body | snapshot | Flat | `200`, `404` | SQL fields + legacy aliases both accepted | OK |
| `DELETE /api/impact-snapshots/:id` | Admin+ | path id | none | Flat | `204`, `404` | delete route | OK |
| `POST /api/impact-snapshots/:id/publish` | Admin+ | none | snapshot | Flat | `200`, `404` | sets `publishedAt` now | OK |
| `POST /api/impact-snapshots/:id/unpublish` | Admin+ | none | snapshot | Flat | `200`, `404` | clears `publishedAt` | OK |

### Audit Logs

| Endpoint | Auth/Role | Request | Response | Envelope | Status/Error | Quirks | Audit |
|---|---|---|---|---|---|---|---|
| `GET /api/audit-logs` | SuperAdmin | `page`, `limit/pageSize`, `actorId`, `action`, `entityType` | audit log list | Paged | `200` | backend default `limit=50` | OK |

## Remaining Inconsistencies After Fixes

### Docs Conflict Only
1. Unique violation handling
   - Some legacy docs still say duplicate unique values bubble out as `500`.
   - Current .NET implementation returns `409` on many create/update paths.
   - This is a deliberate improvement consistent with the build spec.

2. Donor access on `GET /api/social-media-posts`
   - Some docs mark it as staff-only.
   - Real donor frontend usage requires it.
   - Current backend preserves donor access intentionally.

3. Handwritten frontend types vs SQL-backed payloads
   - Some handwritten interfaces still list extra optional fields not present in the SQL-backed API shape.
   - Example categories: extra resident/supporter/safehouse fields not read by current pages.
   - No immediate UI break observed.

### No Explicit Product Choice Blockers Remaining
- No unresolved contract mismatch was found that currently requires a product decision before shipping the implementation.

## Fixes Applied During This Audit
1. Added `GET /api/supporters/:id`.
2. Added `GET /api/supporters/:id/giving-stats`.
3. Added `GET /api/donations/:id`.
4. Added `avgAmount` to executive dashboard `donationTrend`.
5. Removed the implicit `20`-item truncation from `GET /api/ml/predictions/:entityType/:entityId`.
6. Implemented `search` / `programArea` filtering on `GET /api/partners`.
