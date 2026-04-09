Public endpoints audit

Scope audited

- `/api/dashboard/public-impact`
- `/api/impact-snapshots`
- `/api/impact-snapshots/:id`

Sources compared

- `FRONTEND_API_DEPENDENCIES.md`
- `BUSINESS_LOGIC.md`
- `COMPATIBILITY_SUMMARY.md`
- `ROUTES.md`
- `openapi.yaml`
- actual frontend callers:
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/services/public.service.ts`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/services/donor.service.ts`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/LandingPage.tsx`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/PublicImpactPage.tsx`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/donor/ImpactPage.tsx`

Result

- No confirmed blocking compatibility mismatches remain in the implemented public endpoints.
- All three routes are anonymous and do not require authentication.
- Numeric fields are serialized as JSON numbers.
- Null-capable fields are emitted as `null` when absent, which is safe for the current frontend and consistent with the app-wide JSON policy.

Endpoint findings

1. `GET /api/dashboard/public-impact`

- Route path and method match the docs exactly.
- No auth is required.
- Documented fields present:
  - `residentsServedTotal`
  - `totalDonationsRaised`
  - `reintegrationCount`
  - `safehouseCount`
  - `programAreasActive`
  - `recentSnapshots`
  - `milestones`
- Business logic matches docs:
  - all residents counted
  - donations filtered to `monetary`, `recurring`, `grant`
  - reintegrations filtered to `completed`
  - active safehouses counted from `safehouses.status = 'active'`
  - distinct `programAreas` counted across safehouses
  - last 3 published snapshots returned
  - 3 hardcoded milestone cards returned
- Numeric serialization is compatible:
  - `residentsServedTotal`, `reintegrationCount`, `safehouseCount`, `programAreasActive` are integers
  - `totalDonationsRaised` is a decimal JSON number
- Compatibility extensions intentionally preserved:
  - `totalResidentsServed`
  - `totalFundsRaised`
  - `activeResidents`
  - `donorsCount`
- These extra fields are not in the docs, but the current handwritten frontend type still tolerates and may rely on them. Keeping them is the safer compatibility choice.

2. `GET /api/impact-snapshots`

- Route path and method match the docs exactly.
- No auth is required.
- Public-only filtering is correct:
  - always filters to `isPublished = true`
  - accepts `published` query param but ignores it, per docs
- Response envelope is frontend-compatible:
  - `data`
  - `total`
  - `pagination`
- Numeric serialization is compatible:
  - `residentsServed`, `reintegrationCount`, `safehousesCovered`, `safehousetsCovered` are integers
  - `totalDonationsAmount` is a decimal JSON number
- Null handling is compatible:
  - `summary`, `content`, `publishedAt`, `createdAt`, `programOutcomes` may be `null`
- Doc/frontend conflict explicitly preserved:
  - docs and OpenAPI use `safehousesCovered`
  - the current handwritten donor page reads `safehousetsCovered`
  - implementation returns both, which is the correct compatibility choice
- Doc/frontend conflict explicitly preserved:
  - generated OpenAPI client expects `data` + `pagination`
  - handwritten donor service expects `data` + `total`
  - implementation returns all three fields, which satisfies both callers

3. `GET /api/impact-snapshots/:id`

- Route path and method match the docs exactly.
- No auth is required.
- Only published snapshots are returned.
- Missing or unpublished rows correctly return `404`, not `401`.
- Response field set matches the list item model and remains frontend-safe.

Code changes made during this audit

- None. The current implementation was already aligned with the live frontend contract.

Guardrails to preserve

- Do not remove the `safehousetsCovered` alias until the handwritten donor frontend is updated.
- Do not remove `total` from the list envelope unless the handwritten donor service is migrated to rely only on `pagination`.
- Do not remove the legacy public-impact aliases until the public frontend types stop tolerating or referencing them.
