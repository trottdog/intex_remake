## Scope

Audited:
- `/api/process-recordings`
- `/api/home-visitations`
- `/api/case-conferences`
- `/api/intervention-plans`
- `/api/incidents`
- `/api/health-records`
- `/api/education-records`

Compared against:
- `FRONTEND_API_DEPENDENCIES.md`
- `BUSINESS_LOGIC.md`
- `ROUTES.md`
- `COMPATIBILITY_SUMMARY.md`
- `openapi.yaml`
- actual admin frontend services/pages

## Confirmed mismatches fixed

1. `GET /api/case-conferences` did not honor the live frontend `upcoming=true` query flag used by `TasksAlertsPage.tsx`.
- Frontend behavior: `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/services/admin.service.ts` exposes `useListCaseConferences({ upcoming: true })`.
- Fix: added optional `upcoming` query support in the controller/service and filtered to scheduled conferences on or after today.

2. `EducationRecordResponse` and `HealthRecordResponse` were missing `updatedAt`.
- Docs/OpenAPI expect `updatedAt` on these resources.
- Fix: added `updatedAt` to the shared response models and all list/create/update projections.

## Verified compatible

- Exact route paths match the documented `/api/...` names.
- Route ordering is safe: all detail routes use `"{id:int}"`, so they do not shadow collection routes.
- Role restrictions match docs:
  - `process-recordings`, `home-visitations`, `health-records`, `education-records`: `staff+` for read/write/delete
  - `case-conferences`, `intervention-plans`, `incidents`: `staff+` read/write, `admin+` delete
- Pagination behavior is compatible:
  - list routes return the shared paginated envelope with `data`, `total`, and `pagination`
  - `limit` and `pageSize` are both accepted
- Joined display fields required by the frontend are present:
  - process recordings: `residentCode`, `workerName`
  - home visitations: `residentCode`, `workerName`
  - case conferences: `residentCode`, `safehouseName`
  - intervention plans: `residentCode`, `workerName`, `safehouseName`
  - incidents: `residentCode`, `safehouseName`, `reportedByName`
- Resident-scoped filtering is implemented where the frontend uses it.
- `safehouseId`, `severity`, and `status` filters are implemented on the documented route groups.
- `attendees` remains an array in case conference responses.
- Numeric score fields (`progressScore`, `healthScore`) serialize as JSON numbers.

## Docs/frontend drift noted but not treated as backend mismatches

1. `admin.service.ts` contains stale handwritten interfaces that do not fully match the documented payloads.
- Example: `CaseConference.attendees` is typed as `string | null` there, while generated schemas and docs expect `string[]`.
- Example: handwritten process recording/home visitation/intervention plan interfaces still reference old fields like `summary`, `purpose`, or `objective`.
- The actual page usage in this repo does not require those stale fields, so the backend should stay aligned to docs/generated schema instead of reproducing stale aliases blindly.

2. `openapi.yaml` marks some SQL-required foreign keys as nullable on read models.
- Example: `process-recordings.safehouseId` and `workerId`.
- SQL schema is the persistence source of truth, and the real EF model keeps them required.

3. `TasksAlertsPage.tsx` relies on the non-documented `upcoming=true` convenience filter for case conferences.
- This is now supported because the real frontend uses it.

## Files updated during audit

- `/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/CaseConferencesController.cs`
- `/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/CaseManagement/CaseManagementService.cs`
- `/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/CaseManagement/Contracts/CaseManagementModels.cs`
