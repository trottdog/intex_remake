# Admin Read Audit

Audit date: 2026-04-08

Scope:
- `GET /api/dashboard/admin-summary`
- `GET /api/residents`
- `GET /api/residents/stats`
- `GET /api/residents/:id`
- `GET /api/residents/:id/timeline`
- `GET /api/supporters`
- `GET /api/supporters/stats`
- `GET /api/donations`
- `GET /api/donations/trends`

Sources compared:
- `FRONTEND_API_DEPENDENCIES.md`
- `BUSINESS_LOGIC.md`
- `COMPATIBILITY_SUMMARY.md`
- `ROUTES.md`
- `openapi.yaml`
- real frontend admin services and page usage under `NodeApp/artifacts/beacon/src`

## Confirmed Mismatches Found

1. `GET /api/donations/trends` response wrapper
- Docs and OpenAPI require `{ data: [...] }`.
- Handwritten shared service in `src/services/donations.service.ts` also expects `{ data: DonationTrend[] }`.
- The .NET implementation was returning a bare root array.
- Fix applied: endpoint now returns `{ data: [...] }`.

2. Real frontend conflict on `GET /api/donations/trends`
- `src/services/donations.service.ts` expected `{ data: [...] }`.
- `src/pages/superadmin/DonationsOverviewPage.tsx` was doing an inline `apiFetch<Trend[]>()` and expected a bare array.
- This is a frontend inconsistency, not a backend contract inconsistency.
- Resolution applied: normalized the superadmin page to consume `{ data: [...] }`, matching docs/OpenAPI/shared service usage.

3. `GET /api/donations` status field
- Current admin/superadmin UI renders a donation `status`.
- SQL source of truth in `beacon_rebuild.sql` does not contain a `status` column on `donations`.
- `DATA_MODELS.md` and handwritten frontend interfaces still mention `status`, so docs/frontend drift from SQL here.
- Fix applied: response now supplies compatibility value `"completed"` for read-only donation list rows.
- Conflict note: this is a compatibility shim because SQL no longer persists donation status.

4. `GET /api/donations` safehouse name
- Frontend donation typings still allow `safehouseName`.
- The .NET staff list response omitted it.
- Fix applied: `safehouseName` is now joined when present.

## Verified Compatible

- Route paths and HTTP methods match the docs.
- Role gating is `staff, admin, super_admin` across all audited admin-read endpoints.
- Residents timeline returns a plain root array.
- Residents list preserves `safehouseName: ""` instead of joining a real name.
- Resident detail returns joined `safehouseName` and `assignedWorkerName`.
- Paginated list endpoints use `{ data, total, pagination }`.
- Donation trends preserve alias duplication:
  - `month` and `period`
  - `total` and `totalAmount`
  - `count` and `donationCount`
- JSON casing remains camelCase.
- Numeric money/score fields remain JSON numbers.

## SQL-vs-Docs Conflicts Noted

1. Donations `status`
- SQL schema does not define `donations.status`.
- Some docs and frontend typings still expect it.
- Persistence remains SQL-first; API read behavior now provides a compatibility value instead of inventing new persisted schema.

2. Donations trends consumer shape
- Shared docs/OpenAPI/service layer say `{ data: [...] }`.
- One page had drifted to a bare-array assumption.
- Standardized on the documented/shared contract.
