## Scope

Audited:
- `/api/safehouses`
- `/api/safehouses/:id/metrics`
- `/api/partners`
- `/api/partner-assignments`
- `/api/reports/*`
- `/api/social-media-posts`
- `/api/social-media-posts/analytics`
- `/api/in-kind-donation-items`

Compared against:
- `FRONTEND_API_DEPENDENCIES.md`
- `COMPATIBILITY_SUMMARY.md`
- `VALIDATION_AND_ERRORS.md`
- `ROUTES.md`
- `openapi.yaml`
- actual frontend services/pages under `NodeApp/artifacts/beacon/src`

## Confirmed mismatches fixed

1. `GET /api/in-kind-donation-items` was still accepting `limit` as a fallback.
- Required behavior: this route preserves the known quirk of using `pageSize` directly and ignoring `limit`.
- Fix: controller now reads `pageSize ?? 20` and does not fall back to `limit`.

2. `POST /api/in-kind-donation-items` allowed `quantity = 0`.
- Required behavior: `quantity` is part of the 5-field required/valid set and must be an integer greater than 0.
- Fix: `quantity <= 0` now returns the exact aggregate 400 message:
  - `"Missing required fields: donationId, itemDescription, category, quantity, condition"`

## Verified compatible

### Route ordering

- `GET /api/social-media-posts/analytics` is safe from `:id` shadowing.
- Controller order already places `analytics` before `"{id:int}"`.
- Even if reordered later, the `int` constraint on `:id` means the literal `analytics` path will still resolve correctly.

- `GET /api/safehouses/:id/metrics` is safe from `GET /api/safehouses/:id`.
- The extra `/metrics` segment prevents ambiguity.

### Analytics and non-list responses

- `GET /api/social-media-posts/analytics` returns a flat analytics object, not a list envelope.
- Response includes the required hardcoded values:
  - `bestPlatform: "instagram"`
  - `bestPostType: "story"`
  - `bestTimeWindow: "18:00–20:00"`
  - `engagementHeatmap: []`
- Numeric analytics fields serialize as JSON numbers.

- `GET /api/safehouses/:id/metrics` returns a plain root array of monthly metric objects.

- `GET /api/partner-assignments` returns a plain root array, matching the generated client.

- `GET /api/reports/donation-trends`
- `GET /api/reports/accomplishments`
- `GET /api/reports/reintegration-stats`
all return `{ data: [...] }` as required.

### In-kind donation items

- `GET /api/in-kind-donation-items` uses `page` + `pageSize` and defaults `pageSize` to 20.
- `POST /api/in-kind-donation-items` preserves:
  - exact aggregate required-fields error string
  - `unit` default of `"pcs"`
  - `totalEstimatedValue = estimatedValuePerUnit * quantity` when not explicitly provided
- `DELETE /api/in-kind-donation-items/:id` checks existence first and returns `204` on success.

### Safehouses and partners

- Safehouse list/create/get/update/delete auth matches docs:
  - list/get/metrics: `staff+`
  - create/update/delete: `admin+`
- Partner list/get auth is `staff+`; create/update/delete is `admin+`.
- `GET /api/partners` still intentionally ignores `search` and `programArea` to preserve the documented current bug.
- Partner single responses include `assignmentCount`.
- Safehouse list responses preserve `programAreas` as JSON arrays.

## Docs/frontend conflicts noted

1. `GET /api/social-media-posts`
- Docs label this as `staff+`.
- Real frontend usage also includes donor reads via `donor.service.ts` and donor pages.
- Current backend preserves donor read access for the list route only, which matches actual frontend behavior without broadening analytics or mutation access.

2. `GET /api/safehouses/:id/metrics`
- `ROUTES.md` still shows a wrapped response example in one place.
- The generated client and reconnection notes expect a plain root array.
- Backend stays with the plain array because that is the stronger frontend compatibility signal.

3. `GET /api/in-kind-donation-items`
- Handwritten `donations.service.ts` expects a list envelope `{ data, total }`.
- Generated vendor hooks expect a plain array.
- Current backend stays with the handwritten service/docs contract because that is the active app-side service layer in `src/services`.

4. Handwritten in-kind service DTO drift
- `donations.service.ts` still uses old aliases like `description` and `estimatedValue` in its local types.
- Backend returns the documented/generated fields and also includes those aliases on the response model for compatibility.
- Create requests still require documented request keys (`itemDescription`, `estimatedValuePerUnit`, etc.).

## Files updated during audit

- `/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/InKindDonationItemsController.cs`
- `/Users/natemacbook/Desktop/intex/backend/intex/intex/Infrastructure/ExtendedAdmin/ExtendedAdminService.cs`
