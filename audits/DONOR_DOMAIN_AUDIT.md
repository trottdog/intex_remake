Donor domain audit

Scope audited

- `GET /api/dashboard/donor-summary`
- `GET /api/donations/my-ledger`
- `GET /api/supporters/me`
- `PATCH /api/supporters/me`
- `GET /api/donation-allocations`
- `GET /api/social-media-posts`

Sources compared

- `FRONTEND_API_DEPENDENCIES.md`
- `BUSINESS_LOGIC.md`
- `VALIDATION_AND_ERRORS.md`
- `COMPATIBILITY_SUMMARY.md`
- `ROUTES.md`
- `openapi.yaml`
- actual donor frontend files:
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/services/donor.service.ts`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/services/donations.service.ts`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/donor/DonorDashboard.tsx`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/donor/GivingHistoryPage.tsx`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/donor/ProfilePage.tsx`
  - `/Users/natemacbook/Desktop/intex/NodeApp/artifacts/beacon/src/pages/donor/UpdatesPage.tsx`

Audit result

- One confirmed mismatch was found and fixed.
- Remaining discrepancies are docs-vs-frontend conflicts, not implementation bugs. Those are recorded below and the implementation follows current frontend-required behavior unless that would weaken core security.

Confirmed mismatch fixed

1. Donor dashboard null-supporter fallback arrays

- Docs required a zeroed-out donor dashboard response with empty arrays when `supporterId` is null.
- The implementation was returning 3 zero-value `impactCards` in that fallback.
- Fixed in `/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Donor/DonorPortalService.cs`.

Role gating and supporter scoping

1. `GET /api/dashboard/donor-summary`

- Correctly gated to donor-only.
- Returns `403` for authenticated non-donor roles through the auth policy layer.
- Uses only `authenticatedUser.SupporterId` for donor scoping.
- If `supporterId` is null, returns zeroed fields with empty arrays as required.

2. `GET /api/donations/my-ledger`

- Correctly gated to donor-only.
- Correctly scoped to `donations.supporter_id = authenticatedUser.SupporterId`.
- If `supporterId` is null, returns an empty paginated result instead of `404`.

3. `GET /api/supporters/me`

- Correctly gated to donor-only.
- Reads only the supporter linked to `authenticatedUser.SupporterId`.
- Returns `404 { error: "Supporter not found" }` if the donor account has no linked supporter row.

4. `PATCH /api/supporters/me`

- Correctly gated to donor-only.
- Only these fields are recognized:
  - `firstName`
  - `lastName`
  - `phone`
  - `organization`
  - `communicationPreference`
- Unknown fields are ignored by model binding and do not get persisted.
- If none of the 5 allowed fields are present, returns `400 { error: "No fields to update" }`.

5. `GET /api/donation-allocations`

- Gated to donor and staff+.
- For donor role, results are filtered to allocations where `donation.supporterId === authenticatedUser.SupporterId`.
- If donor `supporterId` is null, returns `{ data: [], total: 0 }`.

6. `GET /api/social-media-posts`

- Implemented for donor and staff+.
- This is intentional because the current donor frontend actually calls this route from the donor portal.
- This is a docs conflict:
  - route tables/openapi label it staff-only
  - actual donor portal usage requires donor access
- Implementation follows the live frontend requirement.

List envelopes and exceptions

1. `GET /api/dashboard/donor-summary`

- Flat object response, not a list envelope.
- Matches docs and frontend.

2. `GET /api/donations/my-ledger`

- Returns standard paginated envelope:
  - `data`
  - `total`
  - `pagination`
- Matches docs and frontend.

3. `GET /api/supporters/me`

- Returns a flat supporter object.
- Matches docs and frontend.

4. `PATCH /api/supporters/me`

- Returns the updated flat supporter object.
- Frontend is compatible because it invalidates and refetches.

5. `GET /api/donation-allocations`

- Correctly preserves the special no-pagination quirk:
  - returns `{ data, total }`
  - no `pagination`

6. `GET /api/social-media-posts`

- Returns standard paginated envelope:
  - `data`
  - `total`
  - `pagination`
- This satisfies the handwritten donor service, which reads `data` and `total`, and remains safe for the generated client that expects pagination metadata.

Field names and numeric types

1. `GET /api/dashboard/donor-summary`

- Required documented fields present:
  - `supporterId`
  - `lifetimeGiving`
  - `givingThisYear`
  - `lastGiftDate`
  - `isRecurring`
  - `numberOfGifts`
  - `campaignsSupported`
  - `givingTrend`
  - `allocationBreakdown`
  - `impactCards`
  - `mlRecommendations`
- Numeric values are emitted as JSON numbers:
  - `lifetimeGiving`
  - `givingThisYear`
  - `allocationBreakdown[].amount`
  - `allocationBreakdown[].percentage`
  - `givingTrend[].amount`
  - `givingTrend[].total`
  - `givingTrend[].totalAmount`
  - `givingTrend[].avgAmount`
- Compatibility alias intentionally preserved:
  - `totalGiven`

2. `GET /api/donations/my-ledger`

- Returns donation items with frontend-used fields:
  - `id`
  - `supporterId`
  - `donationType`
  - `amount`
  - `currency`
  - `campaign`
  - `safehouseName`
  - `donationDate`
  - `status`
- `amount` is a JSON number.

3. `GET /api/supporters/me`

- Returns supporter object with numeric fields preserved as JSON numbers:
  - `churnRiskScore`
  - `upgradeScore`
  - `lifetimeGiving`
  - `lastGiftAmount`
- Includes the expected profile fields used by the donor profile page.

4. `GET /api/donation-allocations`

- Returns:
  - `id`
  - `donationId`
  - `safehouseId`
  - `programArea`
  - `amount`
  - `percentage`
  - `safehouseName`
  - `createdAt`
- `amount` and `percentage` are JSON numbers.

5. `GET /api/social-media-posts`

- Returns fields compatible with both the generated schema and handwritten donor page:
  - documented/generated names:
    - `postDate`
    - `postType`
    - `timeWindow`
    - `engagementRate`
    - `donationReferrals`
    - `donationValueFromPost`
    - `predictedConversionScore`
  - handwritten donor compatibility aliases:
    - `postedAt`
    - `donationsAttributed`
    - `conversionScore`
- Numeric fields remain JSON numbers.

Docs vs frontend conflicts explicitly noted

1. `GET /api/social-media-posts`

- Docs/openapi/route table say staff-only.
- Real donor frontend calls it from `/donor/updates`.
- Implementation intentionally allows donor access to preserve current frontend behavior.

2. Donor dashboard response shape

- Generated schema expects only `title`, `value`, `description` on `impactCards`.
- Handwritten donor service also tolerates `label`.
- Implementation returns the documented fields and keeps `label` as a compatibility extra.

3. Donor dashboard `allocationBreakdown`

- Generated schema requires `programArea`, `amount`, `percentage`.
- Handwritten donor service also expects `category`.
- Implementation returns both.

Files changed during this audit

- `/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/Donor/DonorPortalService.cs`

Verification

- `dotnet build` succeeded in `/Users/natemacbook/Desktop/intex/backend/intex/intex`
