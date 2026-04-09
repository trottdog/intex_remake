# Final Compatibility Checklist

## JSON Casing
- `PASS` Global MVC JSON serialization uses camelCase in [ApiContractServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Api/ApiContractServiceCollectionExtensions.cs).
- `PASS` HTTP JSON serialization for middleware/auth responses also uses camelCase in [ApiContractServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Api/ApiContractServiceCollectionExtensions.cs).
- `PASS` Legacy frontend alias fields that must differ from normal camelCase are explicitly pinned with `JsonPropertyName`, for example in [PublicReadModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Public/Contracts/PublicReadModels.cs), [DonorPortalModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Donor/Contracts/DonorPortalModels.cs), [ExtendedAdminModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/ExtendedAdmin/Contracts/ExtendedAdminModels.cs), and [SuperAdminModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/SuperAdmin/Contracts/SuperAdminModels.cs).

## Error Shape
- `PASS` Automatic ASP.NET validation responses are suppressed in [ApiContractServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Api/ApiContractServiceCollectionExtensions.cs).
- `PASS` Validation fallback still returns `{ error: string }`, not `ProblemDetails`, in [ApiContractServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Api/ApiContractServiceCollectionExtensions.cs).
- `PASS` Unhandled application exceptions are normalized to `{ error: string }` in [ApiExceptionHandlingMiddleware.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Api/Middleware/ApiExceptionHandlingMiddleware.cs).
- `PASS` JWT auth challenge/forbidden responses return `{ error: string }` in [AuthenticationFoundationServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Auth/AuthenticationFoundationServiceCollectionExtensions.cs).
- `PASS` No `ProblemDetails`, `ValidationProblem`, `Forbid()`, or `Challenge()` response helpers are used in the API surface.

## Numeric Serialization
- `PASS` Money, scores, rates, and percentages remain `decimal`-backed across persistence and response contracts, including the main financial and ML models in [FoundationEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/FoundationEntities.cs), [InsightsEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/InsightsEntities.cs), [AdminStaffReadModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/AdminStaff/Contracts/AdminStaffReadModels.cs), [DonorPortalModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Donor/Contracts/DonorPortalModels.cs), and [SuperAdminModels.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/SuperAdmin/Contracts/SuperAdminModels.cs).
- `PASS` No remaining confirmed numeric fields were found typed as `string`.

## Text Date Typing
- `PASS` PostgreSQL text date fields remain `string` in persistence entities, including residents, donations, supporters, partner assignments, case-management records, and monthly metrics in [FoundationEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/FoundationEntities.cs), [CaseManagementEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/CaseManagementEntities.cs), and [InsightsEntities.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Persistence/Entities/InsightsEntities.cs).
- `PASS` API response contracts also expose those text date fields as `string` where the frontend expects raw text dates.

## DELETE Behavior
- `PASS` DELETE endpoints return `NoContent()` with no body across the implemented controllers.
- `PASS` No confirmed `204` responses were found returning payload objects.

## 401 / 403 Consistency
- `PASS` Missing/invalid bearer tokens challenge with `401` and `{ error: "..." }` in [AuthenticationFoundationServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Auth/AuthenticationFoundationServiceCollectionExtensions.cs).
- `PASS` Role failures use `403` and `{ error: "Insufficient permissions" }` in [AuthenticationFoundationServiceCollectionExtensions.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Auth/AuthenticationFoundationServiceCollectionExtensions.cs).
- `PASS` Optional-auth `/api/auth/me` remains outside mandatory auth and returns `200` with `{ user: null }` when unauthenticated in [AuthController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/AuthController.cs).
- `PASS` Donor authorization checks that intentionally reject access use `403`, not `404`, on the routes where the frontend expects a forbidden redirect.

## Route Ordering
- `PASS` Special fixed subroutes come before potential `:id` collisions where required, including:
  - `analytics` before `:id` in [SocialMediaPostsController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/SocialMediaPostsController.cs)
  - `stats` before `:id` in [ResidentsController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/ResidentsController.cs) and [SupportersController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/SupportersController.cs)
  - `trends` and `my-ledger` before `:id` in [DonationsController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/DonationsController.cs)
- `PASS` Publish/unpublish routes are safe after `:id` because the `:id` route is constrained to `int` in [ImpactSnapshotsController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/ImpactSnapshotsController.cs).
- `PASS` Supporter `:id/giving-stats` is safe with the `int` path constraint in [SupportersController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/SupportersController.cs).

## Final Result
- `PASS` No remaining confirmed anti-drift failures were found in the final frontend-compatibility sweep.
- `PASS` No code changes were required in this last pass because the previously fixed implementation already satisfied the wire-compatibility checks.
