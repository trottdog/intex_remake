# API Contract — Source of Truth

**Purpose:** Canonical definition of every HTTP contract the Beacon React SPA depends on.
A .NET replacement backend must satisfy every constraint listed here exactly.
All contracts are derived first from actual frontend code, second from the Express implementation.

---

## Table of Contents

1. [Global Transport Contract](#1-global-transport-contract)
2. [Authentication Contract](#2-authentication-contract)
3. [Pagination Contract](#3-pagination-contract)
4. [Endpoint Contracts](#4-endpoint-contracts)
   - [Health](#41-health)
   - [Auth](#42-auth)
   - [Dashboard](#43-dashboard)
   - [Public Endpoints](#44-public-endpoints)
   - [Safehouses](#45-safehouses)
   - [Partners](#46-partners)
   - [Supporters](#47-supporters)
   - [Donations](#48-donations)
   - [Donation Allocations](#49-donation-allocations)
   - [In-Kind Donation Items](#410-in-kind-donation-items)
   - [Campaigns](#411-campaigns)
   - [Residents](#412-residents)
   - [Case Management — Process Recordings](#413-case-management--process-recordings)
   - [Case Management — Home Visitations](#414-case-management--home-visitations)
   - [Case Management — Case Conferences](#415-case-management--case-conferences)
   - [Case Management — Intervention Plans](#416-case-management--intervention-plans)
   - [Case Management — Incident Reports](#417-case-management--incident-reports)
   - [Education Records](#418-education-records)
   - [Health Records](#419-health-records)
   - [Social Media Posts](#420-social-media-posts)
   - [Impact Snapshots](#421-impact-snapshots)
   - [ML Predictions (Standard)](#422-ml-predictions-standard)
   - [Program Updates](#423-program-updates)
   - [Donor Notifications](#424-donor-notifications)
   - [Users](#425-users)
   - [Super Admin ML — Overview](#426-super-admin-ml--overview)
   - [Super Admin ML — Donor Intelligence](#427-super-admin-ml--donor-intelligence)
   - [Super Admin ML — Attribution](#428-super-admin-ml--attribution)
   - [Super Admin ML — Campaigns & Social](#429-super-admin-ml--campaigns--social)
   - [Super Admin ML — Resident Regression](#430-super-admin-ml--resident-regression)
   - [Super Admin ML — Reintegration](#431-super-admin-ml--reintegration)
   - [Super Admin ML — Intervention Effectiveness](#432-super-admin-ml--intervention-effectiveness)
   - [Super Admin ML — Safehouse Health](#433-super-admin-ml--safehouse-health)
   - [Super Admin ML — Model Ops](#434-super-admin-ml--model-ops)
   - [Super Admin ML — PATCH Actions](#435-super-admin-ml--patch-actions)
5. [Compatibility Analysis](#5-compatibility-analysis)
6. [.NET Migration Non-Negotiables](#6-net-migration-non-negotiables)

---

## 1. Global Transport Contract

These rules apply to every endpoint without exception.

| Property | Required value |
|---|---|
| API prefix | All routes served under `/api/` |
| Request content-type | `application/json` |
| Response content-type | `application/json` (except 204) |
| Auth header | `Authorization: Bearer <token>` |
| 401 behaviour | Must return `{ "error": "<message>" }` with status `401`. Client fires `beacon:unauthorized` → auto-logout. |
| 403 behaviour | Must return status `403`. Client redirects to `/forbidden`. |
| 204 behaviour | Body must be empty. Client treats 204 as a successful void — does not attempt `res.json()`. |
| Error body shape | `{ "error": string }` — the `error` key is extracted by `ApiError`. Any other key name is silently lost. |
| No cookies | Auth is stateless JWT only. No session cookies are created or read by the frontend. |
| CORS | Must allow the SPA origin in all environments. |

**Must preserve exactly:** The 401/403 status codes and error body shape. The `Authorization: Bearer` scheme. The 204 empty-body convention.

**Can be internally reimplemented:** Logging, rate limiting, CORS configuration, security headers.

---

## 2. Authentication Contract

### JWT Payload

The frontend reads the following fields from `user` in the login response and stores them as `AuthUser`:

```typescript
interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "public" | "donor" | "staff" | "admin" | "super_admin";
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin?: string | null;
  supporterId?: number | null;
  safehouses?: number[];      // array of safehouseId integers
}
```

**Must preserve exactly:** Every field name and type above. The frontend destructures these directly from the login response and stores them in React context. Missing or renamed fields break role-based routing, safehouse scoping, and the donor portal.

**Known ambiguity:** `safehouses` is an array of safehouse IDs used for scoping. If absent, the frontend treats the user as having no safehouse restrictions. The .NET backend must populate this correctly per user assignment.

### Role Values

The frontend performs `role === "super_admin"`, `role === "admin"`, `role === "staff"`, `role === "donor"` checks directly. These exact string values must be returned — no camelCase, no PascalCase.

---

## 3. Pagination Contract

Two distinct pagination shapes exist. The frontend TypeScript types enforce these — do not mix them.

### Shape A — Standard paginated lists

Used by: safehouses, partners, supporters, donations, residents, case management, records, campaigns, users, program updates, impact snapshots (admin).

```json
{
  "data": [...],
  "total": 100,
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

The frontend commonly reads: `data`, `total`. The `pagination` object is used for paging UI.

### Shape B — Super Admin ML paginated lists

Used by: all `/api/superadmin/*` paginated endpoints.

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalAtRisk": 12,
    "totalRestricted": 3
  }
}
```

The frontend reads `data` and `meta.*`. Extra meta fields (`totalAtRisk`, `totalRestricted`) are endpoint-specific and documented per endpoint below.

### Pagination query params

The frontend uses `pageSize` as the query param name (not `limit`). The Express backend accepts both `limit` and `pageSize`. The .NET backend must accept `pageSize` as the canonical name. Supporting `limit` as an alias is optional.

---

## 4. Endpoint Contracts

---

### 4.1 Health

#### `GET /api/healthz`

| Property | Value |
|---|---|
| Auth | None |
| Roles | None |
| Response 200 | `{ "status": "ok" }` |

**Must preserve exactly:** Path, no auth requirement, response shape.
**Can be internally reimplemented:** Health check logic (DB ping, etc.).

---

### 4.2 Auth

#### `POST /api/auth/login`

| Property | Value |
|---|---|
| Auth | None |
| Request body | `{ "username": string, "password": string }` |
| Response 200 | `{ "token": string, "user": AuthUser }` — see AuthUser shape in §2 |
| Response 401 | `{ "error": string }` |

**Must preserve exactly:** `token` and `user` field names. The full `AuthUser` shape. Status 200 on success, 401 on bad credentials.
**Can be internally reimplemented:** Token signing algorithm (as long as the backend can verify it on subsequent requests), password hashing.
**Known ambiguity:** The Express backend issues a JWT. The .NET backend may use a different JWT library but must produce a bearer token readable as `Authorization: Bearer <token>`.

---

#### `POST /api/auth/change-password`

| Property | Value |
|---|---|
| Auth | `requireAuth` (any role) |
| Request body | `{ "currentPassword": string, "newPassword": string }` |
| Response 200 | `{ "message": string }` |
| Response 400 | `{ "error": string }` — password rule violation |
| Response 401 | `{ "error": string }` — wrong current password |
| Password rules | Min 12 chars, at least one uppercase, lowercase, digit, and special character |

**Must preserve exactly:** Request field names `currentPassword` and `newPassword`. The `message` field on success. Status 200 on success, 400 on rule violation.

---

#### `GET /api/auth/me`

| Property | Value |
|---|---|
| Auth | Optional (no-op if no token) |
| Response 200 (authenticated) | `{ "user": AuthUser }` |
| Response 200 (unauthenticated) | `{ "user": null }` |

**Note:** The frontend `public.service.ts` does not appear to call `/api/auth/me` directly; it is used internally by the generated client bootstrap. Must return the same `AuthUser` shape as login.

---

#### `POST /api/auth/logout`

| Property | Value |
|---|---|
| Auth | None (stateless) |
| Response 200 | `{ "message": string }` or any success body |

**Can be internally reimplemented:** Body is ignored by the frontend. Client simply clears its local token on logout.

---

### 4.3 Dashboard

#### `GET /api/dashboard/admin-summary`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Response 200 | Composite object — see field list below |

Frontend accesses: `activeResidents`, `highRiskCount`, `openIncidents`, `upcomingConferences`, `totalDonations`, `donationTrend[]`, `residentsByRisk[]`, `reintegrationBreakdown`, `processRecordingsThisWeek`, `activeInterventionPlans`, `priorityAlerts[]`, `mlAlerts[]`.

All fields are optional/nullable from the frontend's perspective (uses `?.` access throughout).

**Must preserve exactly:** Field names listed above. Numeric monetary values as JS numbers.
**Can be internally reimplemented:** Exact SQL queries, which source tables are used.

---

#### `GET /api/dashboard/donor-summary`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Response 200 | `DonorDashboardSummary` — see shape below |

Frontend-defined `DonorDashboardSummary` fields consumed:
```typescript
{
  lifetimeGiving?: number;
  givingThisYear?: number;
  donationCount?: number;
  lastDonationDate?: string | null;
  lastDonationAmount?: number | null;
  campaignsSupported?: number;
  givingTrend?: { month: string; year: number; amount: number }[];
  allocationBreakdown?: { programArea: string; amount: number; percentage: number }[];
  recentDonations?: {
    donationId?: number | null;
    donationType?: string | null;
    donationDate?: string | null;
    campaignName?: string | null;
    currencyCode?: string | null;
    amount?: number | null;
    channelSource?: string | null;
  }[];
  impactStats?: {
    activeResidents?: number;
    totalResidentsServed?: number;
    safehouses?: number;
    reintegrations?: number;
    avgHealthScore?: number | null;
    avgEducationProgress?: number | null;
  };
  recentSnapshots?: {
    snapshotId?: number | null;
    snapshotDate?: string | null;
    headline?: string | null;
    summaryText?: string | null;
    metricPayloadJson?: Record<string, unknown> | null;
    publishedAt?: string | null;
  }[];
  mlReintegrationReadiness?: {
    predictionId?: number | null;
    entityLabel?: string | null;
    predictionScore?: number | null;
    contextJson?: Record<string, unknown> | null;
  }[];
}
```

**Must preserve exactly:** All field names above. Monetary values as JS numbers.
**Can be internally reimplemented:** Calculation logic, SQL sources.
**Known ambiguity / needs caution:** The frontend also aliases `totalGiven`, `isRecurring`, `impactCards` from an older version. These are currently read defensively with `?.`. The .NET backend does not need to emit the legacy aliases.

---

#### `GET /api/dashboard/executive-summary`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | admin, super_admin |
| Query params | `safehouseId` (integer), `months` (integer, 1–24, default 12) |
| Response 200 | `ExecutiveDashboardSummary` — see shape below |

Frontend-defined `ExecutiveDashboardSummary` fields consumed:
```typescript
{
  totalSafehouses?: number;
  activeSafehouses?: number;
  totalResidents?: number;
  activeResidents?: number;
  totalSupporters?: number;
  totalDonations?: number;
  totalDonationCount?: number;
  openIncidents?: number;
  incidentsThisWeek?: number;
  highRiskResidents?: number;
  admissionsThisMonth?: number;
  upcomingCaseConferences?: number;
  activeInterventionPlans?: number;
  processRecordingsThisMonth?: number;
  reintegrationRate?: number;
  reintegrationCount?: number;
  avgHealthScore?: number | null;
  avgEducationProgress?: number | null;
  riskDistribution?: { low: number; medium: number; high: number; critical: number; unknown: number };
  reintegrationBreakdown?: { notStarted: number; inProgress: number; ready: number; completed: number };
  safehouseBreakdown?: {
    safehouseId?: number;
    name?: string | null;
    status?: string | null;
    region?: string | null;
    capacityGirls?: number;
    currentOccupancy?: number;
    occupancyPct?: number;
    activeResidents?: number;
    totalResidents?: number;
    highRiskCount?: number;
    openIncidents?: number;
    riskLow?: number; riskMedium?: number; riskHigh?: number; riskCritical?: number;
  }[];
  donationTrend?: { month: string; year: string; label: string; amount: number; count: number }[];
  allocationByProgram?: { programArea: string; amount: number; percentage: number }[];
  donationByChannel?: { channel: string; amount: number }[];
  recentIncidents?: {
    incidentId?: number;
    incidentDate?: string | null;
    incidentType?: string | null;
    severity?: string | null;
    status?: string | null;
    safehouseName?: string | null;
    residentId?: number | null;
  }[];
  upcomingConferences?: {
    conferenceId?: number;
    conferenceDate?: string | null;
    conferenceType?: string | null;
    status?: string | null;
    residentId?: number | null;
  }[];
  mlAlerts?: {
    predictionId?: number;
    entityLabel?: string | null;
    predictionScore?: number | null;
    pipelineName?: string | null;
    createdAt?: string | null;
    contextJson?: unknown;
  }[];
}
```

**Must preserve exactly:** All field names above. Monetary values as JS numbers. The `safehouseId` and `months` query param names.
**Can be internally reimplemented:** Calculation logic.

---

#### `GET /api/dashboard/public-impact`

| Property | Value |
|---|---|
| Auth | None |
| Roles | None |
| Called by | `public.service.ts` → `usePublicImpact()` |
| Status | **MISSING FROM BACKEND** — no Express route exists for this path |

**Known ambiguity / needs caution:** The frontend calls this endpoint but no route was found in the Express codebase. The .NET backend must implement it. The frontend does not define a TypeScript return type for this hook beyond a generic result. Based on naming conventions and the donor dashboard pattern, it should return public aggregate impact statistics (active residents served, safehouses, reintegrations). Exact schema must be defined before implementation.

---

### 4.4 Public Endpoints

#### `GET /api/public/safehouses`

| Property | Value |
|---|---|
| Auth | None |
| Roles | None |
| Called by | `DonatePage.tsx` — populates destination dropdown |
| Response 200 | Array or object containing safehouse id + name only |

Frontend uses this to build a dropdown. It reads `safehouseId` and `name` fields.

**Must preserve exactly:** No auth requirement. Response includes `safehouseId` and `name` for each safehouse.
**Can be internally reimplemented:** Filtering logic (e.g., only active safehouses).

---

### 4.5 Safehouses

All safehouse routes use integer `safehouseId` as the primary key.

#### `GET /api/safehouses`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `page` (int), `pageSize` (int), `limit` (alias for pageSize) |
| Response 200 | Pagination Shape A: `{ data: Safehouse[], total: number, pagination: {...} }` |

Safehouse object fields consumed by frontend:
```typescript
{
  safehouseId?: number | null;
  safehouseCode?: string | null;
  name?: string | null;
  region?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  status?: string | null;
  capacityGirls?: number | null;
  capacityStaff?: number | null;
  currentOccupancy?: number | null;
  openDate?: string | null;
  notes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  programAreas?: string[] | null;
}
```

**Known ambiguity / needs caution:** Frontend also aliases `id` and `location` and `capacity`. These are typed as optional and read defensively. The .NET backend should emit `safehouseId` as the primary identifier.

---

#### `POST /api/safehouses`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | admin, super_admin |
| Request body | Partial Safehouse object (no id) |
| Response 201 | Created safehouse object |
| Response 500 | `{ "error": string }` |

---

#### `PATCH /api/safehouses/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | admin, super_admin |
| Path param | `id` — integer safehouseId |
| Request body | Partial Safehouse fields to update |
| Response 200 | Updated safehouse object |
| Response 404 | `{ "error": "Not found" }` |

---

#### `DELETE /api/safehouses/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | admin, super_admin |
| Path param | `id` — integer safehouseId |
| Response 204 | Empty body |

---

#### `GET /api/safehouses/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Path param | `id` — integer safehouseId |
| Response 200 | Single safehouse object |
| Response 404 | `{ "error": "Not found" }` |

---

#### `GET /api/safehouses/:id/metrics`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Path param | `id` — integer safehouseId |
| Query params | `months` (int, default 12) |
| Response 200 | Monthly metrics array |
| Called by | Not found in frontend service files — may be used by a page component directly |

**Known ambiguity:** Not observed in any frontend service file. Likely used in a page-level call. Preserve the route.

---

### 4.6 Partners

#### `GET /api/partners`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `page`, `pageSize` |
| Response 200 | Pagination Shape A: `{ data: Partner[], total: number }` |

Partner fields consumed by frontend:
```typescript
{
  partnerId?: number | null;
  partnerName?: string | null;
  partnerType?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  programArea?: string | null;
  region?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}
```

---

#### `POST /api/partners`

| Auth | Roles | Body | Response |
|---|---|---|---|
| Required | admin, super_admin | Partial Partner fields | 201 + created partner |

---

#### `PATCH /api/partners/:id`

| Auth | Roles | Path | Body | Response |
|---|---|---|---|---|
| Required | admin, super_admin | `id` = partnerId | Partial Partner fields | 200 + updated partner |

---

#### `DELETE /api/partners/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

#### `GET /api/partner-assignments`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `partnerId` (int), `safehouseId` (int) |
| Response 200 | `{ data: PartnerAssignment[], total: number }` |

Fields consumed: `assignmentId`, `partnerId`, `safehouseId`, `programArea`, `assignmentStart`, `assignmentEnd`, `responsibilityNotes`, `isPrimary`, `status`, `safehouseName`.

---

#### `POST /api/partner-assignments`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 201 + created assignment |

---

#### `PATCH /api/partner-assignments/:id`

| Auth | Roles | Path | Response |
|---|---|---|---|
| Required | admin, super_admin | `id` = assignmentId | 200 + updated |

---

#### `DELETE /api/partner-assignments/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

### 4.7 Supporters

#### `GET /api/supporters/me`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Response 200 | Full supporter profile object |

Fields consumed by `DonorProfilePage`: `firstName`, `lastName`, `email`, `phone`, `organizationName`, `displayName`, and any other supporter profile fields.

---

#### `PATCH /api/supporters/me`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Request body | `{ firstName?, lastName?, phone?, organizationName? }` |
| Response 200 | Updated supporter profile |

**Must preserve exactly:** Accepted field names. Donor cannot update email or role via this endpoint.

---

#### `GET /api/supporters/me/recurring`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Response 200 | `{ "recurringEnabled": boolean }` |

**Must preserve exactly:** The `recurringEnabled` key name. Frontend reads it directly.

---

#### `PATCH /api/supporters/me/recurring`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Request body | `{ "recurringEnabled": boolean }` |
| Response 200 | Updated supporter object or `{ "recurringEnabled": boolean }` |

---

#### `GET /api/supporters/stats`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Aggregate stats object |

Fields consumed: `total`, `active`, `recurring`, `newThisMonth`, `lifetimeTotal`, `avgGift`, `channelBreakdown[]`, `typeMix[]` (all optional/nullable access).

---

#### `GET /api/supporters/:id/giving-stats`

| Auth | Roles | Path | Response |
|---|---|---|---|
| Required | Any | `id` = supporterId | Per-supporter giving stats |

Fields consumed: `total`, `count`, `avgGift`, `lastDonationDate`, `donationTypesMap`.

---

#### `GET /api/supporters`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `page`, `pageSize` |
| Response 200 | Pagination Shape A with joined aggregate fields |

Fields consumed: base supporter fields + `lifetimeGiving`, `donationCount`, `lastGiftDate`, `hasRecurring`.

---

#### `GET /api/supporters/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | Any | Single supporter object |

---

#### `PATCH /api/supporters/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Updated supporter |

---

#### `DELETE /api/supporters/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

### 4.8 Donations

#### `GET /api/donations/my-ledger`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Query params | `page`, `pageSize` |
| Response 200 | `{ data: Donation[], total: number }` |

`Donation` fields consumed:
```typescript
{
  donationId?: number | null;
  supporterId?: number | null;
  donationType?: string | null;
  donationDate?: string | null;        // "YYYY-MM-DD"
  isRecurring?: boolean | null;
  campaignName?: string | null;
  channelSource?: string | null;
  currencyCode?: string | null;
  amount?: number | null;              // JS float, NOT string
  estimatedValue?: number | null;
  impactUnit?: string | null;
  notes?: string | null;
  referralPostId?: number | null;
  safehouseId?: number | null;
  safehouseName?: string | null;
}
```

**Must preserve exactly:** `amount` as a JS float (not a string). The `safehouseName` joined field.

---

#### `GET /api/donations/trends`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `months` (int, default 12) |
| Response 200 | `{ data: DonationTrend[] }` |

`DonationTrend` shape consumed (frontend accepts aliases for both):
```typescript
{
  month: string;           // "YYYY-MM"
  period?: string;         // alias for month
  total?: number;          // total PHP amount
  totalAmount?: number;    // alias for total
  count?: number;
  donationCount?: number;  // alias for count
  avgAmount?: number;
}
```

**Must preserve exactly:** The `data` wrapper array. Both `month` and `total` fields (the frontend uses both names — emit both for safety).

---

#### `GET /api/donations`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `page`, `pageSize`, `fundType` (`general` \| `directed`) |
| Response 200 | Pagination Shape A |

Extra fields joined and consumed: `safehouseName`, `supporterName`, `totalAllocated` (float), `unallocated` (float), `isGeneralFund` (bool).

**Must preserve exactly:** The `fundType` query param name and allowed values. Safehouse scoping: admin/staff only see donations directed to their assigned safehouses. Monetary values as JS floats.

---

#### `POST /api/donations`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 201 + created donation |

---

#### `GET /api/donations/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | Any | Single donation with `supporterName` joined |

---

#### `PATCH /api/donations/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Updated donation |

---

#### `DELETE /api/donations/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

#### `POST /api/donations/give`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Request body | `{ amount: number, currencyCode?: string, channelSource?: string, notes?: string, isRecurring?: boolean, safehouseId?: number \| null }` |
| Response 201 | Donation object + `{ message: string }` thank-you string |
| Response 400 | `{ "error": string }` — invalid amount or no supporter profile |

**Must preserve exactly:** Request field names. The `message` field is shown in the donor UI. Status 201 on success, 400 for validation errors.

---

#### `POST /api/donations/public`

| Property | Value |
|---|---|
| Auth | None |
| Roles | None |
| Request body | `{ amount: number, name?: string, email?: string, notes?: string, isRecurring?: boolean, safehouseId?: number \| null, currencyCode?: string }` |
| Response 201 | `{ "donationId": number, "message": string }` |
| Response 400 | `{ "error": string }` |

**Must preserve exactly:** No auth requirement. The `donationId` and `message` fields in the response (the donate page shows the confirmation message).

---

### 4.9 Donation Allocations

#### `GET /api/donation-allocations`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `donationId` (int) |
| Response 200 | `{ data: DonationAllocation[], total: number }` |

Fields consumed: `allocationId`, `donationId`, `safehouseId`, `programArea`, `amountAllocated` (float), `allocationDate`, `allocationNotes`, `safehouseName`.

**Must preserve exactly:** The `donationId` query param. `amountAllocated` as a JS float.

---

#### `POST /api/donation-allocations`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Request body | `{ donationId: number, safehouseId?: number, programArea: string, amountAllocated: number, allocationNotes?: string }` |
| Response 201 | Created allocation with `amountAllocated` as float |
| Response 400 | `{ "error": string }` — missing required fields |

**Must preserve exactly:** Required fields: `donationId`, `programArea`, `amountAllocated > 0`. Status 400 if missing.

---

#### `DELETE /api/donation-allocations/:id`

| Auth | Roles | Path | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `id` = allocationId | 204 empty |

---

### 4.10 In-Kind Donation Items

#### `GET /api/in-kind-donation-items`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `donationId`, `itemCategory`, `page`, `pageSize` |
| Response 200 | Pagination Shape A |

`quantity` and `estimatedUnitValue` returned as JS floats.

**Known ambiguity:** No frontend service file was found that calls this endpoint directly. It exists in the backend and may be called by inline page code. Preserve the route.

---

#### `POST /api/in-kind-donation-items`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 201 + created item |

---

#### `GET /api/in-kind-donation-items/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Single item |

---

#### `DELETE /api/in-kind-donation-items/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

### 4.11 Campaigns

#### `GET /api/campaigns`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | Any authenticated |
| Response 200 | `{ data: Campaign[], total: number }` |

Role-scoped filtering: donors see only `status = "active"` campaigns ordered by deadline. Admin/staff/super_admin see all, ordered by `createdAt DESC`.

`Campaign` shape consumed:
```typescript
{
  campaignId: number;
  title: string;
  description: string | null;
  category: string | null;
  goal: number | null;           // JS float (stored as string in DB, converted before response)
  deadline: string | null;       // "YYYY-MM-DD"
  status: string;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  totalRaised: number;           // JS float — computed aggregate
  donorCount: number;            // computed aggregate
}
```

**Must preserve exactly:** `goal` as JS float. `totalRaised` and `donorCount` as computed fields on every campaign object. Role-based filtering of active vs all campaigns.

---

#### `GET /api/campaigns/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | Any | Single Campaign object with `totalRaised`, `donorCount` |

---

#### `POST /api/campaigns`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Request body | `{ title: string, description?, category?, goal?: number, deadline?, status? }` |
| Response 201 | Campaign with `totalRaised: 0, donorCount: 0` |
| Response 400 | `{ "error": string }` — title required |

---

#### `PATCH /api/campaigns/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | Updated campaign with `goal` as float |

---

#### `DELETE /api/campaigns/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | 204 empty |

---

#### `POST /api/campaigns/:id/donate`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Path param | `id` = campaignId |
| Request body | `{ amount: number, currencyCode?: string, channelSource?: string, notes?: string }` |
| Response 201 | `{ donationId: number, campaignId: number, campaignTitle: string, amount: number, message: string }` |
| Response 400 | `{ "error": string }` — invalid amount or no donor profile |
| Response 404 | `{ "error": string }` — campaign not found or not active |

**Must preserve exactly:** All response fields: `donationId`, `campaignId`, `campaignTitle`, `amount`, `message`. The frontend displays `message` in the UI. Campaign must be validated as active before accepting.

---

### 4.12 Residents

#### `GET /api/residents/stats`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Response 200 | Stats object |

Fields consumed: `totalActive`, `newAdmissions`, `casesNeedingUpdate`, `highRiskResidents`, `riskDistribution[]` (`{ level, count }`), `statusDistribution[]` (`{ status, count }`).

---

#### `GET /api/residents/:id/timeline`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Array of timeline events |

Timeline event fields consumed: `id`, `eventType`, `eventDate`, `title`, `description`, `severity`.

---

#### `GET /api/residents`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | staff, admin, super_admin |
| Query params | `page`, `pageSize` (also `limit`), `safehouseId`, `caseStatus` |
| Response 200 | Pagination Shape A |

The `formatResident()` transformation is applied — these normalised fields must be present:
```typescript
{
  residentId: number;
  id: number;                     // alias of residentId
  safehouseName: string;
  residentCode: string;           // caseControlNo ?? internalCode ?? "CASE-{id}"
  caseStatus: string | null;      // Title Case normalised
  currentRiskLevel: string | null;// Title Case normalised
  riskLevel: string | null;       // alias of currentRiskLevel
  reintegrationStatus: string | null;
  admissionDate: string | null;   // alias of dateOfAdmission
  dischargeDate: string | null;   // alias of dateClosed
  assignedWorkerName: string | null;
  presentAge: string | null;
  createdAt: string;              // ISO string
  // ... plus all raw DB fields
}
```

**Must preserve exactly:** The computed/aliased fields above. Pages that fetch `/api/residents?limit=200` (dropdown lists) or `/api/residents?limit=2000` (exports) must receive all matching records without artificial caps.
**Known ambiguity / needs caution:** The `limit` query param must be honoured up to at least 2000 (IncidentsPage fetches up to 2000 for export). Cap behaviour must not silently truncate.

---

#### `POST /api/residents`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 201 + formatted resident |

---

#### `GET /api/residents/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Single formatted resident with `safehouseName` |

---

#### `PATCH /api/residents/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Updated formatted resident |

---

#### `DELETE /api/residents/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

### 4.13 Case Management — Process Recordings

#### `GET /api/process-recordings`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `page`, `pageSize`, `residentId`, `safehouseId` | Pagination Shape A with `residentCode` join |

---

#### `POST /api/process-recordings`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 201 + created recording |

---

#### `GET /api/process-recordings/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Single recording |

---

#### `PATCH /api/process-recordings/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Updated recording |

---

#### `DELETE /api/process-recordings/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 204 empty |

---

### 4.14 Case Management — Home Visitations

#### `GET /api/home-visitations`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `page`, `pageSize`, `residentId` | Pagination Shape A with `residentCode` join |

POST / GET /:id / PATCH /:id / DELETE /:id follow the same auth/roles pattern (staff, admin, super_admin for all operations).

---

### 4.15 Case Management — Case Conferences

#### `GET /api/case-conferences`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `page`, `pageSize`, `residentId`, `status` | Pagination Shape A |

**Note:** The `status` query param filters by `conferenceType` field — not a status field. Preserve this mapping.

POST / GET /:id / PATCH /:id / DELETE /:id: same auth/roles as above.

---

### 4.16 Case Management — Intervention Plans

#### `GET /api/intervention-plans`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `page`, `pageSize`, `residentId`, `status` | Pagination Shape A; `targetValue` as float |

POST / GET /:id / PATCH /:id / DELETE /:id: same auth/roles.

---

### 4.17 Case Management — Incident Reports

#### `GET /api/incident-reports`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `page`, `pageSize`, `residentId`, `safehouseId`, `severity` | Pagination Shape A with `residentCode` + `safehouseName` joins; scoped by allowed safehouses |

**Must preserve exactly:** `limit` param respected up to at least 2000 (IncidentsPage exports full dataset with `?page=1&limit=2000`).

POST / GET /:id / PATCH /:id / DELETE /:id: same auth/roles.

---

### 4.18 Education Records

#### `GET /api/education-records`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `residentId`, `page`, `pageSize` (also `limit`) | Pagination Shape A; `attendanceRate`, `progressPercent` as floats |

Frontend fetches with `limit=100`. POST / PATCH /:id / DELETE /:id: same auth/roles.

---

### 4.19 Health Records

#### `GET /api/health-records`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `residentId`, `page`, `pageSize` (also `limit`) | Pagination Shape A; all score/measurement fields as floats |

Frontend fetches with `limit=100`. POST / PATCH /:id / DELETE /:id: same auth/roles.

---

### 4.20 Social Media Posts

#### `GET /api/social-media-posts`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor, staff, admin, super_admin |
| Query params | `page`, `pageSize`, `platform` |
| Response 200 | `{ data: SocialMediaPost[], total: number }` |

Fields consumed:
```typescript
{
  postId?: number | null;
  platform?: string | null;
  content?: string | null;
  caption?: string | null;
  createdAt?: string | null;       // ISO string
  postType?: string | null;
  likes?: number | null;
  shares?: number | null;
  comments?: number | null;
  reach?: number | null;
  engagementRate?: number | null;  // float
  donationReferrals?: number | null;
  estimatedDonationValuePhp?: number | null;
}
```

**Known ambiguity / needs caution:** `public.service.ts` calls this without a token — it is listed as a public call in the service file. However, the Express backend requires auth (donor, staff, admin, super_admin roles). Either the frontend always has a token when calling this (likely), or the .NET backend must make this endpoint truly public. Err on the side of requiring auth and confirm behaviour during integration testing.

---

#### `GET /api/social-media-posts/analytics`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Aggregate analytics by platform + top 5 posts |

---

#### `POST /api/social-media-posts`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 201 + created post |

---

#### `GET /api/social-media-posts/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Single post |

---

#### `PATCH /api/social-media-posts/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Updated post |

---

#### `DELETE /api/social-media-posts/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

### 4.21 Impact Snapshots

Two separate route groups with different auth.

#### `GET /api/impact-snapshots` (public)

| Property | Value |
|---|---|
| Auth | None |
| Roles | None |
| Query params | `pageSize` |
| Response 200 | `{ data: PublicImpactSnapshot[], total: number }` |
| Filter | Only published snapshots (`isPublished = true`) |

`PublicImpactSnapshot` fields consumed:
```typescript
{
  snapshotId?: number | null;
  snapshotDate?: string | null;
  headline?: string | null;
  summaryText?: string | null;
  metricPayloadJson?: Record<string, unknown> | null;
  isPublished?: boolean | null;
  publishedAt?: string | null;
}
```

**Must preserve exactly:** No auth requirement. Only published snapshots returned.

---

#### `GET /api/admin/impact-snapshots`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | All snapshots including drafts (paginated) |

**Must preserve exactly:** The `/api/admin/` path prefix. This is a distinct path from the public endpoint and is called by `ImpactSnapshotsManagementPage`.

---

#### `POST /api/impact-snapshots`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 201 + created snapshot with `isPublished: false` |

---

#### `PATCH /api/impact-snapshots/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | Updated snapshot |

---

#### `DELETE /api/impact-snapshots/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | 204 empty |

---

#### `POST /api/impact-snapshots/:id/publish`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | admin, super_admin |
| Response 200 | Snapshot with `isPublished: true`, `publishedAt` set to current time |

**Must preserve exactly:** Path `/publish` suffix. `publishedAt` timestamp set to current time on publish.

---

#### `POST /api/impact-snapshots/:id/unpublish`

| Auth | Roles | Response |
|---|---|---|
| Required | admin, super_admin | Snapshot with `isPublished: false` |

---

### 4.22 ML Predictions (Standard)

Used by staff/admin portal, not the super admin ML dashboard.

#### `GET /api/ml/pipelines`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Array of pipeline run records |

---

#### `GET /api/ml/predictions`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | staff, admin, super_admin | `page`, `pageSize`, `pipelineName`, `entityType`, `entityId`, `bandLabel` | Paginated ML prediction snapshots |

**Known ambiguity:** Frontend sends `bandLabel` as a filter param but the Express route only lists `pipelineName`, `entityId`, `entityType` as accepted params. `bandLabel` may be silently ignored. Preserve filtering behaviour.

---

#### `GET /api/ml/insights`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | `{ totalPredictions, activePipelines, avgConfidence, recentPredictions[], pipelines[] }` |

---

### 4.23 Program Updates

#### `GET /api/program-updates`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | Any authenticated |
| Response 200 | `{ data: ProgramUpdate[] }` or paginated |

Role-scoped: donors see only published updates, ordered by `publishedAt DESC`. Staff/admin/super_admin see all, ordered by `createdAt DESC`.

Fields consumed: `id` (or `updateId`), `title`, `content`, `isPublished`, `publishedAt`, `createdAt`.

---

#### `POST /api/program-updates`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | 201 + created update; `publishedAt` set if `isPublished: true` |

---

#### `PATCH /api/program-updates/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | staff, admin, super_admin | Updated update; `publishedAt` set on first publish |

---

#### `DELETE /api/program-updates/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | admin, super_admin |
| Response 204 | Empty body |
| Side effect | Must cascade-delete associated `donor_viewed_items` rows first |

---

### 4.24 Donor Notifications

#### `GET /api/donor/notifications`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Response 200 | Blended notification feed (max 20 items): unread published updates + unread active campaigns; includes unread counts |
| Called by | Not found in reviewed frontend service files — may be called from a page component |

**Known ambiguity:** This route exists in the backend but was not found in any frontend service file. Preserve the route — it may be called inline.

---

#### `POST /api/donor/viewed-items`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | donor |
| Request body | `{ "itemType": string, "itemIds": number[] }` |
| Response 200 | Success (idempotent — already-viewed ids ignored) |
| Called by | `UpdatesPage.tsx` — marks updates as read after viewing |

**Must preserve exactly:** Request field names `itemType` and `itemIds`. Must be idempotent.

---

### 4.25 Users

#### `GET /api/users`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin | `page`, `pageSize`, `role` | Pagination Shape A; `passwordHash` must NOT appear in response |

User fields consumed:
```typescript
{
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin?: string | null;
  mfaEnabled?: boolean | null;
  supporterId?: number | null;
  assignedSafehouses?: number[];
}
```

---

#### `POST /api/users`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Request body | `User fields + { password: string, assignedSafehouses?: number[] }` |
| Response 201 | Created user (no passwordHash) |
| Password rules | Min 12 chars, upper + lower + digit + special — enforced by backend |

---

#### `GET /api/users/:id`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | User with `assignedSafehouses[]` |

---

#### `PATCH /api/users/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Request body | Partial user fields; `assignedSafehouses?: number[]` replaces all assignments if present |
| Response 200 | Updated user |

---

#### `DELETE /api/users/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Response 204 | Empty |
| Constraint | Cannot delete own account → 400 |

---

#### `POST /api/users/:id/disable`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | User with `isActive: false` |

---

#### `POST /api/users/:id/enable`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | User with `isActive: true` |

---

#### `GET /api/audit-logs`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `page`, `pageSize`, `userId`, `action` |
| Response 200 | Pagination Shape A |
| Status | **MISSING FROM BACKEND** — no Express route was found for this path |

Fields consumed:
```typescript
{
  id?: number | null;
  userId?: number | null;
  action?: string | null;
  resource?: string | null;
  resourceId?: string | null;
  createdAt?: string | null;
  details?: Record<string, unknown> | null;
  actorName?: string | null;
  actorRole?: string | null;
}
```

**Known ambiguity / needs caution:** The frontend calls `GET /api/audit-logs` but no corresponding Express route exists. The .NET backend must implement this endpoint. The `actorName` and `actorRole` fields imply a JOIN to the users table.

---

### 4.26 Super Admin ML — Overview

All super admin ML routes return monetary PHP values as **numeric strings** (e.g. `"12345.67"`), not JS floats. The frontend TypeScript types confirm this — these fields are typed as `string`.

#### `GET /api/superadmin/overview/action-queue`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | `{ data: ActionQueueData }` |

```typescript
interface ActionQueueData {
  churnAlert: {
    atRiskCount: number;
    topThree: { supporterId: number; displayName: string; churnBand: string }[];
  };
  regressionAlert: { criticalOrHighCount: number };
  safehouseAlert: { atRiskOrCriticalCount: number; safehouseNames: string[] };
}
```

**Must preserve exactly:** All field names. The `data` wrapper. Wrapped in `{ data: ... }`.

---

#### `GET /api/superadmin/overview/funding-gap`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin | `{ data: FundingGapData }` |

```typescript
interface FundingGapData {
  latestSnapshot: {
    projectedGapPhp30d: string;     // numeric string
    fundingGapBand: string;
    fundingGapUpdatedAt: string;
    snapshotDate: string;
  } | null;
  sparkline: { month: string; totalDonationsPhp: string }[];   // numeric string
}
```

---

#### `GET /api/superadmin/overview/safehouse-health-mini`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin, admin | `{ data: SafehouseHealthMiniItem[] }` |

```typescript
interface SafehouseHealthMiniItem {
  safehouseId: number;
  safehouseName: string;
  compositeHealthScore: number | null;
  peerRank: number | null;
  healthBand: string | null;
  trendDirection: string | null;
  metricMonth: string | null;
}
```

---

### 4.27 Super Admin ML — Donor Intelligence

#### `GET /api/superadmin/donors/churn`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin, admin |
| Query params | `page`, `pageSize`, `churnBand`, `acquisitionChannel`, `region`, `recurringEnabled`, `safehousePreference`, `sortBy` |
| Response 200 | `{ data: DonorChurnItem[], meta: DonorChurnMeta }` |

```typescript
interface DonorChurnItem {
  supporterId: number;
  displayName: string;
  email: string;                    // redacted "***@***.***" for admin role
  totalDonationsPhp: string;        // numeric string
  lastDonationDate: string | null;
  daysSinceLastDonation: number | null;
  churnRiskScore: number | null;
  churnBand: string | null;
  churnTopDrivers: { label: string; weight: number }[] | null;
  churnRecommendedAction: string | null;
  churnScoreUpdatedAt: string | null;
}

interface DonorChurnMeta {
  page: number;
  pageSize: number;
  total: number;
  totalAtRisk: number;
  totalRestricted: number;
}
```

**Must preserve exactly:** `meta` wrapper (not `pagination`). Email redaction for admin role. `totalDonationsPhp` as numeric string.
**Known ambiguity / needs caution:** Frontend sends `dateRange` but backend does not filter by it. Silently ignore unknown params.

---

#### `GET /api/superadmin/donors/:id/donations-recent`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin, admin | `{ data: DonorDonationRecent[] }` |

```typescript
interface DonorDonationRecent {
  donationId: number;
  amount: string;                  // numeric string
  donationDate: string;
  channel: string | null;
  campaignTitle: string | null;
  attributedOutcomeScore: number | null;
}
```

**Must preserve exactly:** Admin IDOR guard — admin can only access donors within their allowed safehouses.

---

#### `GET /api/superadmin/donors/upgrade`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `page`, `pageSize`, `upgradeBand`, `minUpgradeScore`, `recurringEnabled`, `acquisitionChannel`, `minAvgQuarterlyAmount` |
| Response 200 | `{ data: DonorUpgradeItem[], meta: { page, pageSize, total } }` |

```typescript
interface DonorUpgradeItem {
  supporterId: number;
  displayName: string;
  email: string;
  totalDonationsPhp: string;       // numeric string
  avgDonationPhp: string;          // numeric string
  lastDonationDate: string | null;
  upgradeLikelihoodScore: number | null;
  upgradeBand: string | null;
  upgradeTopDrivers: { label: string; weight: number }[] | null;
  upgradeRecommendedAskBand: string | null;
  upgradeScoreUpdatedAt: string | null;
  donationAmountTrend?: string;    // "increasing" | "stable" | "decreasing"
}
```

**Known ambiguity / needs caution:** Frontend sends `safehouseId` and `sortBy`/`sortDir` params but backend does not document accepting them. Silently ignore unrecognised params.

---

### 4.28 Super Admin ML — Attribution

#### `GET /api/superadmin/attribution/sankey`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `dateRange`, `dateStart`, `dateEnd` |
| Response 200 | `{ data: { nodes: AttributionSankeyNode[], links: AttributionSankeyLink[] } }` |

```typescript
interface AttributionSankeyNode {
  id: string;
  label: string;
  type: "channel" | "campaign" | "safehouse" | "program";
}
interface AttributionSankeyLink {
  source: string;
  target: string;
  value: number;
  avgOutcomeScore: number | null;
}
```

**Known ambiguity / needs caution:** Frontend sends `safehouseId`, `campaignId`, `donationType` but backend only accepts `dateRange`, `dateStart`, `dateEnd`. Silently ignore extra params.

---

#### `GET /api/superadmin/attribution/programs`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `dateRange`, `dateStart`, `dateEnd`, `safehouseId`, `programArea` |
| Response 200 | `{ data: AttributionProgramItem[] }` |

```typescript
interface AttributionProgramItem {
  programArea: string;
  totalAllocatedPhp: string;           // numeric string
  avgAttributedOutcomeScore: number | null;
  safehouseCount: number;
  healthScoreDelta: number | null;
  educationProgressDelta: number | null;
}
```

**Known ambiguity:** Frontend also sends `campaignId` and `donationType` params. Backend accepts `safehouseId` and `programArea`. Silently ignore unrecognised params.

---

#### `GET /api/superadmin/attribution/export`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin | `dateRange`, `dateStart`, `dateEnd` | Up to 5000 rows of export data |

**Note:** Not called by any observed frontend hook. Preserve the route for use via direct navigation or future UI.

---

### 4.29 Super Admin ML — Campaigns & Social

#### `GET /api/superadmin/campaigns/effectiveness`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `dateRange`, `dateStart`, `dateEnd`, `category`, `status`, `isBoosted` |
| Response 200 | `{ data: CampaignEffectivenessItem[] }` |

```typescript
interface CampaignEffectivenessItem {
  campaignId: number;
  title: string;
  category: string;
  status: string;
  goal: string;               // numeric string
  totalRaisedPhp: string;     // numeric string
  uniqueDonors: number;
  avgEngagementRate: number | null;
  totalImpressions: number | null;
  conversionRatio: number | null;
  classificationBand: string | null;
  recommendedReplicate: boolean | null;
  deadline: string | null;
}
```

**Known ambiguity:** Frontend sends `platform` param but backend does not accept it.

---

#### `GET /api/superadmin/social/heatmap`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin, admin |
| Query params | `dateRange`, `dateStart`, `dateEnd`, `platform` |
| Response 200 | `{ data: { cells: SocialHeatmapCell[], minimumPostsForCell: number } \| null, insufficientData?: boolean }` |

```typescript
interface SocialHeatmapCell {
  dayOfWeek: string;
  postHour: number;
  avgDonationReferrals: number;
  postCount: number;
}
```

**Must preserve exactly:** `insufficientData: true` flag when fewer than 10 posts match — the frontend renders an empty-state based on this.

---

#### `GET /api/superadmin/social/recommendation`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin, admin | `dateRange`, `dateStart`, `dateEnd` | `{ data: SocialRecommendation \| null }` |

```typescript
interface SocialRecommendation {
  postId: number;
  caption: string | null;
  platform: string | null;
  mediaType: string | null;
  contentTopic: string | null;
  conversionPredictionScore: number | null;
  conversionBand: string | null;
  predictedReferralCount: number | null;
  predictedDonationValuePhp: string | null;  // numeric string
  postedAt: string | null;
}
```

---

#### `GET /api/superadmin/social/posts`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin, admin |
| Query params | `page`, `pageSize`, `dateRange`, `dateStart`, `dateEnd`, `platform`, `mediaType`, `postType`, `contentTopic`, `isBoosted`, `conversionBand`, `ids` |
| Response 200 | `{ data: SocialPostItem[], meta: { page, pageSize, total } }` |

```typescript
interface SocialPostItem {
  postId: number;
  caption: string | null;
  platform: string | null;
  mediaType: string | null;
  postType: string | null;
  contentTopic: string | null;
  isBoosted: boolean | null;
  postedAt: string | null;
  impressions: number | null;
  engagementRate: number | null;
  donationReferrals: number | null;
  conversionPredictionScore: number | null;
  conversionBand: string | null;
  predictedReferralCount: number | null;
  predictedDonationValuePhp: string | null;   // numeric string
  predictedVsActualDelta: number | null;
  conversionTopDrivers: { label: string; weight: number }[] | null;
  conversionComparablePostIds: number[] | null;
  conversionScoreUpdatedAt: string | null;
}
```

---

### 4.30 Super Admin ML — Resident Regression

#### `GET /api/superadmin/residents/regression/distribution`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin, admin | `{ data: RegressionDistributionItem[], meta: { totalRestricted: number } }` |

```typescript
interface RegressionDistributionItem {
  safehouseId: number;
  safehouseName: string;
  bands: { critical: number; high: number; moderate: number; low: number; stable: number };
  totalScored: number;
  totalRestricted: number;
}
```

**Must preserve exactly:** The `meta.totalRestricted` field. Admin scoping to allowed safehouses.

---

#### `GET /api/superadmin/residents/regression/watchlist`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin, admin |
| Query params | `page`, `pageSize`, `safehouseId`, `regressionRiskBand`, `minRegressionRiskScore`, `caseStatus`, `caseCategory` |
| Response 200 | `{ data: RegressionWatchlistItem[], meta: { page, pageSize, total, totalRestricted } }` |

```typescript
interface RegressionWatchlistItem {
  residentId: number;
  caseCode: string;
  caseCategory: string | null;
  safehouseName: string | null;
  regressionRiskScore: number | null;
  regressionRiskBand: string | null;
  regressionRiskDrivers: { label: string; weight: number }[] | null;
  regressionRecommendedAction: string | null;
  regressionScoreUpdatedAt: string | null;
  topDriverLabel: string | null;
}
```

**Must preserve exactly:** `ml_scores_restricted = true` residents must be excluded from results. `meta.totalRestricted` must report how many were excluded.

---

### 4.31 Super Admin ML — Reintegration

#### `GET /api/superadmin/residents/reintegration/funnel`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin, admin | `dateRange`, `dateStart`, `dateEnd` | `{ data: ReintegrationFunnelData }` |

```typescript
interface ReintegrationFunnelData {
  stages: { stage: string; count: number; label: string }[];
  totalRestricted: number;
}
```

**Known ambiguity:** Frontend also sends `safehouseId` but backend does not accept it.

---

#### `GET /api/superadmin/residents/reintegration/table`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin, admin |
| Query params | `page`, `pageSize`, `safehouseId`, `reintegrationReadinessBand`, `regressionRiskBand`, `minReadinessScore`, `reintegrationStatus`, `caseCategory`, `minLengthOfStay`, `maxLengthOfStay` |
| Response 200 | `{ data: ReintegrationTableItem[], meta: { page, pageSize, total, totalRestricted } }` |

```typescript
interface ReintegrationTableItem {
  residentId: number;
  caseCode: string;
  caseCategory: string | null;
  safehouseName: string | null;
  reintegrationStatus: string | null;
  reintegrationReadinessScore: number | null;
  reintegrationReadinessBand: string | null;
  reintegrationReadinessDrivers: { positive: { label: string }[]; barriers: { label: string }[] } | null;
  reintegrationRecommendedAction: string | null;
  reintegrationScoreUpdatedAt: string | null;
  topPositiveIndicator: string | null;
  topBarrier: string | null;
  regressionRiskBand: string | null;
  lengthOfStayDays: number | null;
}
```

---

### 4.32 Super Admin ML — Intervention Effectiveness

#### `GET /api/superadmin/interventions/effectiveness`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin, admin | `dateRange`, `dateStart`, `dateEnd`, `safehouseId`, `planCategory`, `effectivenessBand` | `{ data: InterventionEffectivenessItem[] }` |

```typescript
interface InterventionEffectivenessItem {
  planCategory: string;
  planCount: number;
  avgEffectivenessScore: number | null;
  avgHealthScoreDelta: number | null;
  avgEducationProgressDelta: number | null;
  avgSessionProgressRate: number | null;
  effectivenessBandDistribution: {
    "high-impact": number;
    moderate: number;
    "low-impact": number;
    "insufficient-data": number;
  };
}
```

**Must preserve exactly:** The `effectivenessBandDistribution` key names including hyphenated strings.

---

#### `GET /api/superadmin/interventions/effectiveness/:category/plans`

| Auth | Roles | Path | Response |
|---|---|---|---|
| Required | super_admin, admin | `category` = URL-encoded plan category string | `{ data: InterventionPlanDetail[] }` |

```typescript
interface InterventionPlanDetail {
  planId: number;
  planCategory: string;
  safehouseName: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  effectivenessOutcomeScore: number | null;
  effectivenessBand: string | null;
  effectivenessOutcomeDrivers: unknown | null;
  effectivenessScoreUpdatedAt: string | null;
}
```

**Must preserve exactly:** The URL-encoded `:category` path param. Frontend uses `encodeURIComponent(category)`.

---

### 4.33 Super Admin ML — Safehouse Health

#### `GET /api/superadmin/safehouses/health`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin, admin | `monthStart`, `status`, `region` | `{ data: SafehouseHealthItem[] }` |

```typescript
interface SafehouseHealthItem {
  safehouseId: number;
  safehouseName: string;
  region: string | null;
  compositeHealthScore: number | null;
  peerRank: number | null;          // null for admin role (privacy)
  healthBand: string | null;
  trendDirection: string | null;
  healthScoreDrivers: unknown | null;
  incidentSeverityDistribution: { critical: number; high: number; medium: number; low: number } | null;
  healthScoreComputedAt: string | null;
  metricMonth: string | null;
}
```

**Must preserve exactly:** `peerRank` must be null/omitted for the admin role — this is a privacy rule.

---

#### `GET /api/superadmin/safehouses/:id/health-history`

| Auth | Roles | Response |
|---|---|---|
| Required | super_admin, admin | `{ data: SafehouseHealthHistory[] }` — last 12 months |

```typescript
interface SafehouseHealthHistory {
  metricMonth: string;
  compositeHealthScore: number | null;
  healthBand: string | null;
  trendDirection: string | null;
  peerRank: number | null;
}
```

**Must preserve exactly:** Admin IDOR guard — admin can only access safehouses they are assigned to.

---

#### `GET /api/superadmin/safehouses/health/compare`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `safehouseIdA` (required), `safehouseIdB` (required), `monthStart` |
| Response 200 | `{ data: SafehouseHealthItem[] }` — 2 items |

**Known ambiguity / needs caution — HIGH RISK:** The frontend sends `safehouseIds` (a comma-separated or JSON array) via `useGetSafehouseHealthCompare({ safehouseIds: "1,2" })`. The backend expects `safehouseIdA` and `safehouseIdB` as separate params. **The frontend and backend param names do not match.** The .NET backend must accept `safehouseIds` as a comma-separated value and split it internally (or the frontend must be updated — but modifying frontend is out of scope for the backend replacement). This is the most significant param drift in the entire codebase.

---

### 4.34 Super Admin ML — Model Ops

#### `GET /api/superadmin/ml/pipelines`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Query params | `pipelineName`, `status`, `trainedAtStart`, `trainedAtEnd` |
| Response 200 | `{ data: MlPipelineStatus[] }` |

```typescript
interface MlPipelineStatus {
  pipelineName: string;
  displayName: string;
  lastRunId: number | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  scoredEntityCount: number | null;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  totalSnapshots: number;
  freshness: "ok" | "stale" | "never-run";
  daysSinceLastRun: number | null;
  featureImportanceJson: { feature: string; importance: number; label: string }[] | null;
  latestRunId: number | null;
}
```

**Known ambiguity:** Frontend sends `freshness` as a filter param. Backend does not document accepting it. Silently ignore unknown params.

---

#### `GET /api/superadmin/ml/score-distribution`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin | `pipelineName` (required) | `{ data: ScoreDistributionData \| null }` |

```typescript
interface ScoreDistributionData {
  pipelineName: string;
  runId: number;
  buckets: { bucket: number; count: number }[];  // 10 buckets 0.0–0.9
}
```

---

#### `GET /api/superadmin/ml/band-distribution`

| Auth | Roles | Query params | Response |
|---|---|---|---|
| Required | super_admin | `pipelineName` (required) | `{ data: BandDistributionData \| null }` |

```typescript
interface BandDistributionData {
  pipelineName: string;
  runId: number;
  bands: { bandLabel: string; count: number }[];
}
```

---

#### `GET /api/superadmin/ml/feature-importance/:runId`

| Auth | Roles | Path | Response |
|---|---|---|---|
| Required | super_admin | `runId` = integer pipeline run ID | `{ data: FeatureImportanceData \| null }` |

```typescript
interface FeatureImportanceData {
  runId: number;
  pipelineName: string;
  displayName: string;
  featureImportanceJson: { feature: string; importance: number; label: string }[];
}
```

---

### 4.35 Super Admin ML — PATCH Actions

#### `PATCH /api/superadmin/residents/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Request body | `{ regressionRecommendedAction?: string, reintegrationRecommendedAction?: string }` |
| Response 200 | Updated resident or success object |

**Must preserve exactly:** Only these two fields are allowed to be patched via this route.

---

#### `PATCH /api/superadmin/donors/:id`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Request body | `{ churnRecommendedAction?: string, upgradeBand?: string }` |
| Response 200 | Updated supporter or success object |

---

#### `PATCH /api/superadmin/campaigns/:id/ml-flags`

| Property | Value |
|---|---|
| Auth | Required |
| Roles | super_admin |
| Request body | `{ "recommendedAvoid": boolean }` |
| Response 200 | Updated or success object |

**Must preserve exactly:** The `/ml-flags` path suffix. The `recommendedAvoid` boolean field name.

---

## 5. Compatibility Analysis

### 5.1 Routes that must remain byte-for-byte compatible (zero tolerance for drift)

| Route | Reason |
|---|---|
| `POST /api/auth/login` response shape | `token` and `user` (with full AuthUser) are directly stored in React context. Any field rename breaks the entire auth system. |
| `AuthUser.role` string values | Hard-coded equality checks in routing: `role === "super_admin"`, etc. |
| `AuthUser.safehouses` array | Used for safehouse-scoped data access across all admin views. |
| `GET /api/campaigns` `totalRaised` and `donorCount` fields | Always rendered on every campaign card. |
| `GET /api/residents` format shape | `residentCode`, `riskLevel`, `admissionDate`, `assignedWorkerName` are computed aliases that pages depend on. |
| `POST /api/donations/give` response `message` | Shown directly in the donor thank-you UI. |
| `POST /api/campaigns/:id/donate` response fields | `donationId`, `campaignId`, `campaignTitle`, `amount`, `message` all rendered in the UI. |
| `GET /api/donations/my-ledger` `amount` as float | Frontend arithmetic and display depends on this being a JS number. |
| `GET /api/superadmin/overview/action-queue` shape | Rendered verbatim in the action queue widget. Any key rename breaks the widget. |
| `POST /api/impact-snapshots/:id/publish` `publishedAt` field | Set on publish; displayed in admin snapshot list. |
| `GET /api/donors/notifications` — `POST /api/donor/viewed-items` | Notification feed and mark-as-read flow. |
| `GET /api/supporters/me/recurring` `recurringEnabled` key | Donor toggle reads this key directly. |

---

### 5.2 Routes where the frontend uses only a subset of response fields

| Route | Frontend uses | Backend sends | Risk |
|---|---|---|---|
| `GET /api/safehouses` | `safehouseId`, `name`, `region`, `status`, `capacityGirls`, `currentOccupancy` | All DB columns | Low — extra fields ignored |
| `GET /api/partners` | Core contact + assignment fields | All DB columns | Low |
| `GET /api/residents/:id` | ~20 fields + computed aliases | All DB columns + formatResident() | Medium — computed aliases must exist |
| `GET /api/superadmin/ml/pipelines` | ~12 fields from MlPipelineStatus | Full pipeline row + stats | Low — extra fields ignored |
| `GET /api/dashboard/donor-summary` | ~10 top-level keys | Large composite object | Medium — missing optional fields render as empty, not errors |
| `GET /api/social-media-posts` | 10 fields | Full post row | Low |

---

### 5.3 Routes with response-shape drift risk

| Route | Drift detail | Severity |
|---|---|---|
| `GET /api/superadmin/safehouses/health/compare` | Frontend sends `safehouseIds=1,2`; backend expects `safehouseIdA` and `safehouseIdB` separately. **Currently broken.** | **Critical** |
| `GET /api/social-media-posts` (public access) | `public.service.ts` calls without token but backend requires auth | High — confirm whether token is always present at call time |
| `GET /api/dashboard/public-impact` | No backend route exists — frontend call 404s | High — must be implemented |
| `GET /api/audit-logs` | No backend route exists — frontend call 404s | High — must be implemented |
| `GET /api/donations/trends` | Frontend accepts both `month`/`total` and `period`/`totalAmount`/`donationCount` aliases | Medium — emit all aliases |
| `GET /api/superadmin/attribution/sankey` | Frontend sends `safehouseId`, `campaignId`, `donationType`; backend ignores them | Low — silent ignore is safe |
| `GET /api/superadmin/donors/upgrade` | Frontend sends `safehouseId`, `sortBy`, `sortDir`; backend ignores them | Low |
| `GET /api/superadmin/donors/churn` | Frontend sends `dateRange`; backend ignores it | Low |
| `GET /api/superadmin/ml/pipelines` | Frontend sends `freshness`; backend ignores it | Low |
| `GET /api/superadmin/interventions/effectiveness/:category/plans` | Category is URL-encoded by frontend | Low — standard URL decoding handles this |

---

### 5.4 Routes with auth drift risk

| Route | Risk detail |
|---|---|
| `GET /api/social-media-posts` | Possibly called without token from public page — needs verification |
| `GET /api/superadmin/safehouses/health` | `peerRank` must be null for admin role — role-conditional response |
| `GET /api/superadmin/donors/churn` | Admin email must be redacted to `***@***.***` — role-conditional field |
| `GET /api/superadmin/residents/regression/watchlist` | `ml_scores_restricted = true` residents must be excluded — privacy rule enforced in query |
| `GET /api/superadmin/residents/reintegration/table` | Same restricted-resident exclusion rule |
| `GET /api/superadmin/donors/:id/donations-recent` | Admin IDOR guard — must verify donor is within admin's safehouses |
| `GET /api/superadmin/safehouses/:id/health-history` | Admin IDOR guard — must verify safehouse is in admin's assignments |
| `GET /api/donors/churn` | Admin scoped to their assigned safehouses — must enforce this in query |
| `DELETE /api/users/:id` | Cannot delete own account — must check `id !== currentUser.id` |
| `GET /api/residents` | Admin/staff scoped to their allowed safehouses |
| `GET /api/donations` | Admin/staff scoped to their allowed safehouses |
| `GET /api/incident-reports` | Scoped by allowed safehouses |

---

## 6. .NET Migration Non-Negotiables

These are the rules the .NET backend must satisfy so the React frontend works without modification.

### 6.1 Protocol

1. Every route must be served under the `/api/` path prefix — no exceptions.
2. All responses must be `application/json` except 204 which must have an empty body.
3. Error responses must use the shape `{ "error": string }` — the frontend's `ApiError` extracts `body.error`. Any other error key name is lost.
4. HTTP status codes must match: 200/201 on success, 204 on empty success, 400 on validation failure, 401 on auth failure, 403 on role failure, 404 on not found, 500 on server error. Do not substitute 422 for 400 — the frontend does not special-case 422.

### 6.2 Authentication

5. Auth must use `Authorization: Bearer <token>` header — no cookies, no custom headers.
6. A 401 response triggers the global `beacon:unauthorized` event which logs the user out. Return 401 only for genuinely invalid/expired tokens, never for missing tokens on optional-auth routes.
7. A 403 response causes immediate client redirect to `/forbidden`. Never return 403 for a missing token on a protected route — return 401 instead.
8. The login response must include both `token` (string) and `user` (AuthUser object) at the top level.
9. The `AuthUser.role` field must be one of exactly: `"public"`, `"donor"`, `"staff"`, `"admin"`, `"super_admin"` (snake_case, lowercase).
10. The `AuthUser.safehouses` field must be an array of integer safehouse IDs. An empty array means no safehouses assigned.

### 6.3 Pagination

11. Standard paginated routes must accept `pageSize` as the query param name. Also accept `limit` as an alias.
12. Standard paginated responses must use `{ data: [...], total: number }` shape. Include a `pagination` object with `page`, `pageSize`, `totalPages`, `hasNext`, `hasPrev`.
13. Super admin ML paginated routes must use `{ data: [...], meta: { page, pageSize, total, ...extras } }` shape. Do NOT use `pagination` for these.
14. The `limit` param must be honoured up to at least 2000 — pages like IncidentsPage fetch up to 2000 records for client-side export. Do not silently cap below 2000.

### 6.4 Numeric types

15. Standard routes must return monetary and score values as JS floats (not strings). This applies to: `amount`, `estimatedValue`, `amountAllocated`, `totalAllocated`, `unallocated`, `goal`, `totalRaised`, `lifetimeGiving`, `attendanceRate`, `progressPercent`, `targetValue`, etc.
16. Super admin ML routes must return PHP monetary values as numeric strings (e.g. `"12345.67"`) — not JS floats. The frontend TypeScript types for these fields are `string`. This includes: `totalDonationsPhp`, `avgDonationPhp`, `totalRaisedPhp`, `totalAllocatedPhp`, `projectedGapPhp30d`, `totalDonationsPhp` (sparkline), `predictedDonationValuePhp`, `amount` in `DonorDonationRecent`.

### 6.5 Role-conditional response behaviour

17. `GET /api/campaigns` — donors must see only `status = "active"` campaigns, admin/staff/super_admin see all.
18. `GET /api/program-updates` — donors see only published updates, staff/admin/super_admin see all.
19. `GET /api/superadmin/safehouses/health` — `peerRank` must be null/omitted for the admin role (privacy).
20. `GET /api/superadmin/donors/churn` — `email` must be redacted to `***@***.***` for the admin role.
21. All admin/staff routes that return residents, donations, or incidents must scope results to the user's `assignedSafehouses`. Super admins are unscoped.

### 6.6 Privacy / security rules

22. `ml_scores_restricted = true` residents must be excluded from all super admin ML row-level endpoints (watchlist, reintegration table). The count of excluded residents must be returned in `meta.totalRestricted`.
23. `passwordHash` must never appear in any user API response.
24. Admin IDOR guards: admin calling `GET /api/superadmin/donors/:id/donations-recent` or `GET /api/superadmin/safehouses/:id/health-history` must only be allowed if the resource is within their allowed safehouses.
25. `DELETE /api/users/:id` must return 400 if the caller is deleting their own account.

### 6.7 Missing backend routes to implement

26. **`GET /api/dashboard/public-impact`** — no auth, returns public impact aggregate stats. This must be implemented before launch; the frontend calls it.
27. **`GET /api/audit-logs`** — requires super_admin auth; accepts `page`, `pageSize`, `userId`, `action`; returns paginated audit records with `actorName` and `actorRole` joined from users. Must be implemented.

### 6.8 Known param drift to resolve

28. **`GET /api/superadmin/safehouses/health/compare`** — the frontend sends `safehouseIds` as a single comma-separated string (e.g. `safehouseIds=1,2`). The Express backend expects `safehouseIdA` and `safehouseIdB`. The .NET backend must accept `safehouseIds` (comma-separated) since the frontend cannot be changed. Split on commas internally.

### 6.9 Computed/aliased fields

29. `GET /api/residents` and `GET /api/residents/:id` responses must include the computed fields produced by `formatResident()`: `id` (alias of `residentId`), `residentCode`, `caseStatus` (Title Case), `currentRiskLevel` (Title Case), `riskLevel` (alias), `reintegrationStatus` (Title Case), `admissionDate` (alias of `dateOfAdmission`), `dischargeDate` (alias of `dateClosed`), `assignedWorkerName`, `presentAge`, `createdAt` as ISO string.
30. `GET /api/donations/trends` must emit both `month`/`total`/`count` and their aliases `period`/`totalAmount`/`donationCount` — the frontend DonationTrend interface accepts both sets.
31. `GET /api/donations` list must include computed fields: `totalAllocated` (float), `unallocated` (float), `isGeneralFund` (bool), `supporterName` (joined).

### 6.10 Route paths

32. No route paths may be changed. The frontend has no baseURL abstraction that allows path rewriting — every path is hardcoded in service files and page components.
33. The `/api/admin/impact-snapshots` path must be preserved exactly. It is distinct from `/api/impact-snapshots` and is called by a different page with different auth.
34. The `/api/public/safehouses` path must be preserved exactly. It is the no-auth safehouse list for the donate page.
35. All super admin ML paths under `/api/superadmin/*` must be preserved exactly.

---

*This document supersedes any other API documentation. When the Express implementation and this document conflict, this document's conservative interpretation of actual frontend behaviour takes precedence.*

---

## 7. Cross-Origin Deployment Notes (Vercel + Azure + Supabase)

This section documents the specific contract concerns that arise from deploying the React SPA on Vercel and the backend API on Azure App Service with Supabase as the database. None of the contracts in §4–§6 change — these notes explain the infrastructure configuration that makes those contracts work across separate origins.

---

### 7.1 Frontend ↔ Backend communication

In the current Replit setup, the frontend and backend share the same origin. In the target architecture, they are on **separate domains** (e.g., `beacon.vercel.app` and `beacon-api.azurewebsites.net`). This changes nothing about the API contract itself, but requires two things to be set:

| Config | Where set | Required value |
|---|---|---|
| `VITE_API_BASE_URL` | Vercel dashboard (build-time env var) | Full Azure backend URL, e.g. `https://beacon-api.azurewebsites.net` |
| `CORS_ALLOWED_ORIGINS` | Azure App Settings (runtime env var) | Must include the Vercel production URL, e.g. `https://beacon.vercel.app` |

Every `fetch()` call in the frontend is constructed as:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
fetch(`${API_BASE}/api/auth/login`, ...)
```

When `VITE_API_BASE_URL` is empty (the Replit default), calls use relative paths — they hit the same server. When set to the Azure URL, calls go cross-origin. The `Authorization: Bearer` header is included in every call. Since `credentials: false` (no cookies), no preflight `OPTIONS` cookies-related complexity applies, but CORS preflight is still sent for non-simple requests (all requests with `Authorization` header).

**The .NET Azure backend must respond to `OPTIONS` preflight requests correctly**, including:
- `Access-Control-Allow-Origin`: the requesting frontend origin
- `Access-Control-Allow-Headers`: `Content-Type, Authorization`
- `Access-Control-Allow-Methods`: `GET, POST, PATCH, PUT, DELETE, OPTIONS`

---

### 7.2 Auth contract — no changes, no cookies

The stateless JWT design is **ideal** for cross-domain deployment:

- Tokens live in React context (in-memory) — not cookies, not `localStorage`.
- `Authorization: Bearer <token>` works identically whether same-origin or cross-origin.
- No `SameSite` cookie restrictions apply.
- No `Access-Control-Allow-Credentials: true` is required.
- No session affinity is required on Azure — multiple app instances can serve any request.

The token payload shape (§2), role values, and `safehouses[]` array must be identical in the .NET backend. See §6.2 and §6.4 for the non-negotiables.

---

### 7.3 Database contract — Supabase PostgreSQL

The API contract is database-agnostic — the frontend knows nothing about the database. However, the following Supabase-specific behaviors may affect .NET implementation:

| Concern | Detail |
|---|---|
| **Connection pooling** | Use Supabase's pgBouncer pooler (port 6543, `?pgbouncer=true`) for the app runtime. This disables named prepared statements — avoid them in the .NET Dapper/EF queries. |
| **Direct connection for migrations** | Run Drizzle or EF Core migrations against the direct Supabase URL (port 5432), not the pooler. |
| **SSL** | Supabase enforces SSL. Connection strings must include SSL config. `TrustServerCertificate=true` in .NET's Npgsql connection string is the equivalent of `rejectUnauthorized: false`. |
| **JSONB columns** | Several tables store JSONB (`context_json`, `metric_payload_json`, `feature_payload_json`). The .NET backend must read and write these as `JsonDocument` or `string` via Npgsql's JSONB support. |
| **Row-level security (RLS)** | Supabase enables RLS by default. If the backend connects as the `postgres` service role, RLS is bypassed. If connecting as a limited role, permissive policies must be defined for all tables. |

---

### 7.4 SPA routing on Vercel

The React app uses `wouter` for client-side routing. All route rendering happens in the browser — the server only needs to serve `index.html` for any URL that isn't a static asset. Without a Vercel rewrite rule, deep links (e.g., `/admin/residents/42`) return 404 from Vercel's CDN.

**Required `vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

This does not affect the API contract — all `/api/*` paths are handled by the Azure backend, not Vercel.

---

### 7.5 HTTPS and security headers

**HTTPS enforcement:** The Express backend includes an HTTP→HTTPS redirect middleware that checks `req.headers["x-forwarded-proto"] === "http"`. Azure App Service sets this header correctly when TLS termination happens at the load balancer level. This middleware works as-is on Azure and should be reproduced in the .NET backend.

**Security headers:** The Express backend sets `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and a `Content-Security-Policy` via the `security.ts` middleware. The .NET replacement should implement equivalent headers via ASP.NET Core's middleware pipeline.

**CSP `connect-src`:** The current backend reads `VITE_API_BASE_URL` to add the backend origin to the CSP `connect-src` directive. On Azure + Vercel, the frontend and backend are on different origins, so the CSP issued by the backend should include:
- `'self'` (the Azure backend origin)
- The Vercel frontend origin (so the Vercel page can connect to the Azure API)

Use a dedicated config variable (e.g., `ALLOWED_FRONTEND_ORIGIN`) rather than re-using `VITE_API_BASE_URL` in the .NET backend.

---

### 7.6 Vercel preview deployments

Vercel automatically creates preview deployment URLs for every branch (e.g., `https://beacon-git-feature-xyz-orgname.vercel.app`). These URLs are different for every deployment. The Azure backend's CORS exact-match allowlist (based on `CORS_ALLOWED_ORIGINS`) will reject requests from these preview URLs unless they are explicitly listed.

**Impact on .NET contract:** None — the API contract itself does not change. This is a configuration/operations concern. Options:
1. Set `CORS_ALLOWED_ORIGINS` to include specific preview URLs as needed.
2. Implement wildcard/regex CORS matching in the .NET backend for `*.vercel.app` origins in non-production configurations.
3. Restrict preview deployments to always point at a development-mode backend that allows all origins.

The current Express CORS implementation does not support wildcards. The .NET ASP.NET Core CORS policy does support patterns — this is an improvement opportunity during migration.
