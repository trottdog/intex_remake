# Admin Write Audit

Audit date: 2026-04-08

Scope:
- `POST /api/residents`
- `PATCH /api/residents/:id`
- `DELETE /api/residents/:id`
- `POST /api/donations`
- `PATCH /api/donations/:id`
- `DELETE /api/donations/:id`
- `POST /api/supporters`
- `PATCH /api/supporters/:id`
- `DELETE /api/supporters/:id`
- `POST /api/donation-allocations`

Sources compared:
- `VALIDATION_AND_ERRORS.md`
- `ROUTES.md`
- `COMPATIBILITY_SUMMARY.md`
- `BUSINESS_LOGIC.md`
- actual frontend mutation calls under `NodeApp/artifacts/beacon/src`

## Frontend Mutation Usage

No handwritten page/service mutations are currently using these admin write endpoints directly.

The only active frontend references found were the generated API client functions:
- `createResident`, `updateResident`, `deleteResident`
- `createDonation`, `updateDonation`, `deleteDonation`
- `createSupporter`, `updateSupporter`, `deleteSupporter`
- `createDonationAllocation`

That made the generated schema contract the main frontend compatibility surface for this audit.

## Confirmed Mismatches Found

1. Resident write 404 message
- The write implementation returned `404 { "error": "Resident not found" }`.
- The compatibility/validation docs use the generic ID-miss contract: `404 { "error": "Not found" }`.
- Fix applied: resident update/delete now use `"Not found"`.

2. Resident write response field drift
- Generated frontend schema still expects `assignedWorkerId` on resident responses.
- The .NET resident response model only exposed `assignedStaffId`.
- Fix applied: resident responses now include both `assignedWorkerId` and `assignedStaffId` for compatibility.

## Verified Compatible

### Status codes
- Creates return `201`.
- Updates return `200`.
- Deletes return `204`.

### Delete behavior
- `DELETE /api/residents/:id` returns `204` with no body.
- `DELETE /api/donations/:id` returns `204` with no body.
- `DELETE /api/supporters/:id` returns `204` with no body.

### Error shape
- Error responses use `{ "error": "..." }`.
- Wrong-role access still resolves through the shared auth layer to `403 { "error": "Insufficient permissions" }`.

### Role restrictions
- Resident create/update: `staff, admin, super_admin`
- Resident delete: `admin, super_admin`
- Donation create/update: `staff, admin, super_admin`
- Donation delete: `admin, super_admin`
- Supporter create/update: `staff, admin, super_admin`
- Supporter delete: `admin, super_admin`
- Donation allocation create: `staff, admin, super_admin`

### Validation behavior
- `POST /api/supporters` validates email format and returns `400 { "error": "Invalid email format" }` when invalid, matching the .NET build spec recommendation.
- `POST /api/donations` rejects non-positive amounts with `400 { "error": "Amount must be positive" }`.
- Text-backed date fields on these write routes are validated to `YYYY-MM-DD` and return `400 { "error": "Invalid date format — use YYYY-MM-DD" }`.
- Unique constraint collisions are normalized to `409 { "error": "A record with that value already exists" }`.

### Write-response quirks preserved
- `POST /api/residents` returns `safehouseName: ""` and `assignedWorkerName: null`.
- `POST /api/donation-allocations` returns `safehouseName: ""`.
- Money fields remain JSON numbers.

## Notes

1. Supporter PATCH validation scope
- The current implementation validates email format on `PATCH /api/supporters/:id` as well as `POST /api/supporters`.
- The docs explicitly call out `POST /api/supporters` for this added validation but do not forbid the PATCH check.
- No frontend mutation caller was found that depends on accepting invalid email values here, so this was not treated as a confirmed compatibility mismatch.

2. Authorization outcomes
- This audit verified role restrictions at the controller/policy level and shared auth middleware behavior.
- No live HTTP smoke test was run in this pass; verification was code-path and build based.
