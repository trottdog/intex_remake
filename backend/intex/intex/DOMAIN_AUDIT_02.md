# DOMAIN_AUDIT_02

Audit date: 2026-04-09

Scope audited against:
- `Asset-Manager/api_docs/API_CONTRACT_SOURCE_OF_TRUTH.md`
- `Asset-Manager/api_docs/FRONTEND_API_CALL_INVENTORY.md`
- `Asset-Manager/api_docs/EXPRESS_ROUTE_INVENTORY.md`
- `Asset-Manager/api_docs/DATABASE_ACCESS_MAP.md`
- `Asset-Manager/api_docs/MIGRATION_GAP_LIST.md`

Domains audited:
- safehouses
- supporters
- donations
- donation allocations
- campaigns

Build verification:
- `dotnet build` succeeded in `/Users/natemacbook/Desktop/intex_final/backend/intex`

## Fixes Applied During Audit

1. Safehouse assignment scoping is now enforced for safehouse routes.
   - `GET /api/safehouses`
   - `GET /api/safehouses/{id}`
   - `GET /api/safehouses/{id}/metrics`
   - Staff/admin scope now resolves from the database instead of trusting only the JWT `safehouses[]` claim.

2. Safehouse assignment scoping for donation-domain reads now resolves live from the database.
   - `GET /api/donations`
   - `GET /api/donations/{id}`
   - `GET /api/donation-allocations`
   - `POST /api/donation-allocations`
   - `DELETE /api/donation-allocations/{id}`

3. `GET /api/supporters/me/recurring` no longer emits a `message: null` field.
   - The response now stays aligned with the documented minimal shape when no message is present.

4. Donor thank-you formatting was tightened to match the live contract more closely.
   - `POST /api/donations/give` now formats the donation amount without forcibly dropping decimals.

## Domain Results

### Safehouses

Status: Pass after fixes

Checked:
- Exact route paths and methods
- Auth and role rules
- Standard pagination shape on `GET /api/safehouses`
- `safehouses.name` usage
- metrics chronology behavior
- safehouse scoping

Confirmed:
- `/api/public/safehouses` remains public and returns dropdown-compatible data with `safehouseId` and `name`
- `/api/safehouses` remains staff/admin/super_admin only
- create/update/delete remain admin/super_admin only
- metrics endpoint uses chronological ordering by metric date, not fragile insertion order
- staff/admin safehouse visibility now honors current DB assignments

### Supporters

Status: Pass after fixes

Checked:
- Route paths and methods
- Donor self-service behavior
- `recurringEnabled` key name
- standard pagination shape on list endpoint
- aggregate response fields used by frontend
- JSON numeric serialization

Confirmed:
- `/api/supporters/me` and `/api/supporters/me/recurring` preserve donor self-service behavior
- `recurringEnabled` is preserved exactly
- `/api/supporters` returns standard pagination shape
- aggregate fields like `lifetimeGiving`, `donationCount`, `lastGiftDate`, and `hasRecurring` are present
- supporter stats include both current and compatibility alias fields used by pages

Intentional preserved contract quirk:
- `GET /api/supporters/{id}` and `GET /api/supporters/{id}/giving-stats` remain any-auth, matching the current contract and Express inventory, even though the auth matrix flags them as broader-than-ideal access.

### Donations

Status: Pass after fixes

Checked:
- Route paths and methods
- donor/public flows
- standard pagination shape
- computed fields
- numeric serialization
- fundType filtering
- safehouse scoping

Confirmed:
- `/api/donations/my-ledger` preserves donor-only ledger behavior and returns `amount` as a JSON number
- `/api/donations/trends` emits the alias pairs the frontend expects: `month`/`period`, `total`/`totalAmount`, `count`/`donationCount`
- `/api/donations` preserves standard pagination shape and computes `totalAllocated`, `unallocated`, and `isGeneralFund`
- `fundType=general|directed` behavior is preserved
- `/api/donations/give` remains donor-only and returns the donation object plus `message`
- `/api/donations/public` remains public and returns `{ donationId, message }`
- donation-domain scope checks for staff/admin now resolve live DB assignments rather than stale token claims
- multi-step donation delete cleanup remains transaction-backed

Intentional preserved contract quirk:
- `GET /api/donations/{id}` remains any-auth to preserve the documented current behavior, even though the migration notes flag it as an IDOR-style gap in the legacy API.

### Donation Allocations

Status: Pass after fixes

Checked:
- Route paths and methods
- auth/roles
- required request fields
- response field names
- numeric serialization
- safehouse scoping

Confirmed:
- `/api/donation-allocations` preserves `{ data, total }`
- `amountAllocated` is serialized as a JSON number
- required fields `donationId`, `programArea`, and positive `amountAllocated` are enforced
- staff/admin allocation access now uses live DB-backed safehouse assignments for scope checks

### Campaigns

Status: Pass

Checked:
- Route paths and methods
- auth/roles
- role-conditional list behavior
- computed fields
- goal numeric serialization
- donate response shape

Confirmed:
- donors only see active campaigns ordered by `deadline ASC`
- staff/admin/super_admin see all campaigns ordered by `createdAt DESC`
- `totalRaised` and `donorCount` are computed at query time
- `goal` is serialized as a JSON number
- `POST /api/campaigns/{id}/donate` preserves the exact response shape:
  - `donationId`
  - `campaignId`
  - `campaignTitle`
  - `amount`
  - `message`

## Final Audit Summary

No contract-breaking mismatches remain in the audited domains after the fixes above.

The implementation now aligns with the documented route paths, auth rules, response field names, pagination contracts, computed fields, numeric serialization expectations, donor/public donation flows, and safehouse scoping requirements for the audited scope.

The only notable remaining items are intentional legacy-contract behaviors that are still preserved on purpose:
- `GET /api/supporters/{id}`
- `GET /api/supporters/{id}/giving-stats`
- `GET /api/donations/{id}`

Those endpoints remain broader than ideal because the current docs and Express inventory still describe them that way, and changing them now would be a contract change rather than a parity fix.
