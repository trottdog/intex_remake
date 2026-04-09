# Foundation Contradiction Register

Frontend call sites are the tie-breaker. Express behavior is the second tie-breaker. Markdown docs are reconciled after those two.

## Open Contradictions

| ID | Area | Frontend Expectation | Current .NET Behavior | Fix Target |
|---|---|---|---|---|
| FND-01 | Pipeline hardening | JSON-friendly API transport with rate limiting and security headers | No global rate limiter and no explicit security header middleware | `Program.cs`, new middleware in `Infrastructure/Middleware/` |
| FND-02 | Scaffold leftovers | Production composition root should not include placeholder markers | `IRepositoryMarker`/`IServiceMarker` still registered in DI | `Program.cs` |
| FND-03 | Status code parity | Non-exception HTTP failures should keep JSON `{ error }` shape where practical | Only exception pipeline guarantees JSON body | `Program.cs`, `JsonExceptionMiddleware.cs` |
| API-01 | Missing route | `GET /api/dashboard/public-impact` is called by `public.service.ts` | Route missing | new `DashboardController.cs` |
| API-02 | Missing route | `GET /api/dashboard/donor-summary` is called by `donor.service.ts` | Route missing | new `DashboardController.cs` |
| API-03 | Missing route | `GET /api/dashboard/admin-summary` and `GET /api/dashboard/executive-summary` are called by admin/superadmin pages | Routes missing | new `DashboardController.cs` |
| API-04 | Missing route | `GET /api/audit-logs` is called by `superadmin.service.ts` | Route missing | new `AuditLogsController.cs` |
| API-05 | Missing routes | `GET/POST/PATCH/DELETE /api/partners` | Routes missing | new `PartnersController.cs` |
| API-06 | Missing routes | `GET/POST/PATCH/DELETE /api/partner-assignments` | Routes missing | new `PartnerAssignmentsController.cs` |
| API-07 | Missing routes | Public/admin impact snapshots and publish/unpublish endpoints | Routes missing | new `ImpactSnapshotsController.cs` |
| API-08 | Missing routes | Program updates CRUD (read for donor/admin, write for admin) | Routes missing | new `ProgramUpdatesController.cs` |
| API-09 | Missing routes | Social media posts list/details/analytics CRUD | Routes missing | new `SocialMediaPostsController.cs` |
| API-10 | Missing routes | Standard ML routes: `/api/ml/pipelines`, `/api/ml/predictions`, `/api/ml/insights` | Routes missing | new `MlController.cs` |
| API-11 | Missing routes | Superadmin analytics route family used by `superadminMl.service.ts` | Routes missing | new `SuperAdminMlController.cs` |
| RTM-01 | Runtime mismatch | Legacy-compatible allocation delete should not break calling flow when id missing | Returns 404 when no row deleted | `DonationAllocationsController.cs` |
| RTM-02 | Runtime mismatch | Admin tasks use `status` filter on incidents | `ListIncidentReportsQuery` ignores `status` | case-management DTO/service/repo |
| RTM-03 | Runtime mismatch | Admin tasks use `upcoming=true` for conferences | `ListCaseConferencesQuery` ignores `upcoming` | case-management DTO/service/repo |
| DOC-01 | Doc conflict | Shape A pagination is `pageSize` object in source-of-truth API contract | Gap list still documents `limit` in pagination object | `Asset-Manager/api_docs/MIGRATION_GAP_LIST.md` |
| DOC-02 | Doc conflict | SQL schema uses normalized table names used by current EF model | Database access map still references legacy names in places | `Asset-Manager/api_docs/DATABASE_ACCESS_MAP.md` |

## Resolution Log

| ID | Status | Notes |
|---|---|---|
| FND-01 | resolved | Added rate limiting, security headers middleware, and API status-code JSON shaping in `Program.cs`. |
| FND-02 | resolved | Removed placeholder DI registrations from `Program.cs`. |
| FND-03 | resolved | Added API `UseStatusCodePages` JSON mapping for common non-exception failures. |
| API-01 | resolved | Added `GET /api/dashboard/public-impact` in `DashboardController.cs`. |
| API-02 | resolved | Added `GET /api/dashboard/donor-summary` in `DashboardController.cs`. |
| API-03 | resolved | Added `GET /api/dashboard/admin-summary` and `GET /api/dashboard/executive-summary` in `DashboardController.cs`. |
| API-04 | resolved | Added `GET /api/audit-logs` in `AuditLogsController.cs`. |
| API-05 | resolved | Added `/api/partners` CRUD in `PartnersController.cs`. |
| API-06 | resolved | Added `/api/partner-assignments` CRUD in `PartnerAssignmentsController.cs`. |
| API-07 | resolved | Added public/admin impact snapshots endpoints in `ImpactSnapshotsController.cs` and `AdminImpactSnapshotsController.cs`. |
| API-08 | resolved | Added `/api/program-updates` CRUD in `ProgramUpdatesController.cs`. |
| API-09 | resolved | Added `/api/social-media-posts` CRUD + analytics in `SocialMediaPostsController.cs`. |
| API-10 | resolved | Added `/api/ml/pipelines`, `/api/ml/predictions`, `/api/ml/insights` in `MlController.cs`. |
| API-11 | resolved | Added `/api/superadmin/*` analytics family in `SuperAdminMlController.cs`. |
| RTM-01 | resolved | `DELETE /api/donation-allocations/:id` now returns `204` regardless of prior existence. |
| RTM-02 | resolved | Added `status` filter support to incident list query DTO/service/repository. |
| RTM-03 | resolved | Added `upcoming` filter support to case conference list query DTO/service/repository. |
| DOC-01 | resolved | Updated pagination wording in `MIGRATION_GAP_LIST.md` to canonical Shape A. |
| DOC-02 | resolved | Added normalization addendum in `DATABASE_ACCESS_MAP.md` to reconcile legacy table naming mismatches. |
