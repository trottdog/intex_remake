# FULL_BACKEND_AUDIT

Date: 2026-04-09

## Scope

Audited backend route and middleware behavior against:

- `API_CONTRACT_SOURCE_OF_TRUTH.md`
- `AUTH_AND_AUTHORIZATION_MATRIX.md`
- `FRONTEND_API_CALL_INVENTORY.md`
- `EXPRESS_ROUTE_INVENTORY.md`
- `DATABASE_ACCESS_MAP.md`
- `MIDDLEWARE_AND_VALIDATION_AUDIT.md`
- `MIGRATION_GAP_LIST.md`

Tie-breaker order used during audit:

1. Frontend call sites
2. Express route behavior
3. Documentation text

## Route/Contract Audit Coverage

Reviewed all implemented controllers under `Controllers/` for:

- exact route paths and HTTP methods
- auth policy and role gating
- status codes and JSON error envelope
- response field names and pagination envelope shape
- numeric vs string serialization behavior
- JSONB response handling (nested JSON)
- safehouse and donor scoping logic

Also reviewed cross-cutting middleware and startup configuration in:

- `Program.cs`
- `Infrastructure/Middleware/JsonExceptionMiddleware.cs`
- `Infrastructure/Middleware/SecurityHeadersMiddleware.cs`
- `Infrastructure/Extensions/ServiceCollectionExtensions.cs`

## Mismatches Found and Fixed

### 1) Donor-only endpoints were too permissive

- `DonorController` was `DonorOrStaffOrAbove`; contract expects donor-only.
- `DashboardController` donor summary was `DonorOrStaffOrAbove`; contract expects donor-only.

Fixes:

- `Controllers/DonorController.cs` → `[Authorize(Policy = PolicyNames.DonorOnly)]`
- `Controllers/DashboardController.cs` (`GET /api/dashboard/donor-summary`) → `DonorOnly`

### 2) Audit logs auth policy mismatch

- `GET /api/audit-logs` was guarded by `AdminOrAbove`; contract/frontend matrix expect `super_admin`.

Fixes:

- `Controllers/AuditLogsController.cs` policy changed to `SuperAdminOnly`
- Added query parameter support for `userId` and `action` plus existing pagination params (`page`, `pageSize`, `limit`)
- Preserved Shape A pagination envelope response

### 3) Missing in-kind donation route family

- Contract includes `GET/POST/GET:id/DELETE:id /api/in-kind-donation-items`.
- Route family was missing.

Fixes:

- Added `Controllers/InKindDonationItemsController.cs` with:
  - `GET /api/in-kind-donation-items` (Shape A pagination, filters: `donationId`, `itemCategory`, `page`, `pageSize`, `limit`)
  - `POST /api/in-kind-donation-items` (201 created)
  - `GET /api/in-kind-donation-items/{id}` (200/404)
  - `DELETE /api/in-kind-donation-items/{id}` (AdminOrAbove, 204)
- Serialization emits numeric `quantity` and `estimatedUnitValue` as JSON numbers (rounded numeric values), not strings.

### 4) Superadmin action queue semantic mismatch

- `churnAlert.atRiskCount` reflected only top-3 records (`Take(3)`), not actual at-risk population count.

Fix:

- `Controllers/SuperAdminMlController.cs` now computes total `atRiskCount` separately while keeping `topThree`.

### 5) Missing superadmin attribution export route referenced by frontend

- Frontend links to `GET /api/superadmin/attribution/export`.
- Route was missing.

Fix:

- Added `GET /api/superadmin/attribution/export` in `SuperAdminMlController.cs` returning CSV export.

## Cross-Cutting Verification Results

Runtime checks executed against local API:

- CORS preflight: `OPTIONS /api/healthz` with origin `https://intex.trottdog.com`
  - Result: `204`
  - `Access-Control-Allow-Origin: https://intex.trottdog.com`
  - `Access-Control-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type,Authorization`
- Security headers present on `GET /api/healthz`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';`
- JSON error envelope verified:
  - `GET /api/does-not-exist` → `404` with `{"error":"Not found"}`
  - `GET /api/users` unauthenticated → `401` with `{"error":"Authentication required"}`

## Build/Static Validation

- `dotnet build backend/intex/intex/intex.csproj` passes after fixes.
- Existing warnings remain:
  - NuGet vulnerability cache permission warning (`NU1900`)
  - existing nullable warnings in `SuperAdminMlController.cs` (pre-existing runtime-safety warning class)

## Audit Conclusion

Backend route contracts were re-audited and patched for the concrete mismatches found in auth policy, missing route coverage, superadmin export support, and one superadmin aggregate semantic error. Core middleware contract checks (security headers, CORS preflight, JSON error envelope) pass.
