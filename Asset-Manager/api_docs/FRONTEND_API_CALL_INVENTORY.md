# Frontend API Call Inventory

Complete reference of every HTTP endpoint called by the Beacon React SPA, organized by source file.

---

## API Client Architecture

Two parallel HTTP clients exist in the frontend. All service hooks and page-level calls use the **custom client**.

### Custom Client — `services/api.ts`

| Export | Purpose |
|---|---|
| `apiFetch(url, tokenOrInit?)` | GET (or custom method via `init`) |
| `apiPost(url, body, token?)` | POST with JSON body |
| `apiPatch(url, body, token?)` | PATCH with JSON body |
| `apiDelete(url, token?)` | DELETE |

**Auth behaviour**
- Every request attaches `Authorization: Bearer <token>` when a token is present.
- **401** → dispatches `beacon:unauthorized` DOM event → `AuthContext` logs the user out.
- **403** → `navigate("/forbidden")`.

### Generated Client — `vendor/api-client-react` (orval)

Only used at app bootstrap (`main.tsx`) to call `setBaseUrl()` and in `AuthContext.tsx` to call `setAuthTokenGetter()`. No pages call its hooks directly; all runtime data fetching goes through the custom client above.

---

## Service Files (Reusable React Query Hooks)

### `services/auth.service.ts`

| Method | Endpoint | Hook |
|---|---|---|
| POST | `/api/auth/login` | `useLogin()` |
| POST | `/api/auth/change-password` | `useChangePassword()` |

---

### `services/public.service.ts`

| Method | Endpoint | Hook | Auth |
|---|---|---|---|
| GET | `/api/dashboard/public-impact` | `usePublicImpact()` | None |
| GET | `/api/impact-snapshots` | `useListImpactSnapshots()` | None |
| GET | `/api/social-media-posts` | `useListSocialMediaPosts()` | None |

---

### `services/donor.service.ts`

| Method | Endpoint | Hook |
|---|---|---|
| GET | `/api/dashboard/donor-summary` | `useDonorDashboard()` |
| GET | `/api/supporters/me` | `useGetMyProfile()` |
| GET | `/api/donations/my-ledger` | `useGetMyDonationLedger()` |
| GET | `/api/impact-snapshots` | `useListImpactSnapshots()` |
| GET | `/api/social-media-posts` | `useListSocialMediaPosts()` |
| PATCH | `/api/supporters/me` | `useUpdateMyProfile()` |

---

### `services/admin.service.ts`

| Method | Endpoint | Hook |
|---|---|---|
| GET | `/api/dashboard/admin-summary` | `useAdminDashboard()` |
| GET | `/api/incident-reports` | (summary list for dashboard) |
| GET | `/api/process-recordings` | (summary list for dashboard) |
| GET | `/api/home-visitations` | (summary list for dashboard) |
| GET | `/api/case-conferences` | (summary list for dashboard) |
| GET | `/api/intervention-plans` | (summary list for dashboard) |
| GET | `/api/donations/trends` | `useAdminDonationTrends()` |
| GET | `/api/impact-snapshots` | `useAdminImpactSnapshots()` |
| GET | `/api/residents/stats` | `useAdminResidentStats()` |

---

### `services/residents.service.ts`

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/residents` | `useListResidents()` | `page`, `pageSize`, `safehouseId`, `caseStatus` |
| GET | `/api/residents/stats` | `useGetResidentStats()` | — |
| GET | `/api/residents/:id` | `useGetResident(id)` | — |
| GET | `/api/residents/:id/timeline` | `useGetResidentTimeline(id)` | — |
| GET | `/api/education-records` | `useListEducationRecords(residentId)` | `residentId`, `limit=100` |
| GET | `/api/health-records` | `useListHealthRecords(residentId)` | `residentId`, `limit=100` |

---

### `services/supporters.service.ts`

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/supporters` | `useListSupporters()` | `page`, `pageSize` |
| GET | `/api/supporters/stats` | `useGetSupporterStats()` | — |
| GET | `/api/supporters/:id` | `useGetSupporter(id)` | — |
| GET | `/api/supporters/:id/giving-stats` | `useGetSupporterGivingStats(id)` | — |

---

### `services/donations.service.ts`

| Method | Endpoint | Hook | Query Params / Body |
|---|---|---|---|
| GET | `/api/donations` | `useListDonations()` | `page`, `pageSize` |
| GET | `/api/donations/trends` | `useGetDonationTrends()` | `months` |
| GET | `/api/donations/:id` | `useGetDonation(id)` | — |
| GET | `/api/donations/my-ledger` | `useGetMyDonationLedger()` | `page`, `pageSize` |
| POST | `/api/donations/give` | `useGiveDonation()` | `{ amount, currencyCode?, channelSource?, notes?, isRecurring?, safehouseId? }` |
| GET | `/api/supporters/me/recurring` | `useGetRecurringStatus()` | — |
| PATCH | `/api/supporters/me/recurring` | `useToggleRecurring()` | `{ recurringEnabled: boolean }` |

---

### `services/campaigns.service.ts`

| Method | Endpoint | Hook | Body |
|---|---|---|---|
| GET | `/api/campaigns` | `useListCampaigns()` | — |
| GET | `/api/campaigns/:id` | `useGetCampaign(id)` | — |
| POST | `/api/campaigns` | `useCreateCampaign()` | Campaign fields (no id/totalRaised/donorCount) |
| PATCH | `/api/campaigns/:id` | `useUpdateCampaign()` | Partial Campaign fields |
| DELETE | `/api/campaigns/:id` | `useDeleteCampaign()` | — |
| POST | `/api/campaigns/:campaignId/donate` | `useDonateToCampaign()` | `{ amount, currencyCode?, channelSource?, notes? }` |

---

### `services/ml.service.ts`

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/ml/pipelines` | `useListMlPipelines()` | — |
| GET | `/api/ml/predictions` | `useListMlPredictions()` | `page`, `pageSize`, `pipelineName`, `entityType`, `entityId`, `bandLabel` |
| GET | `/api/ml/insights` | `useListMlInsights()` | — |

---

### `services/superadmin.service.ts`

| Method | Endpoint | Hook / Action | Notes |
|---|---|---|---|
| GET | `/api/dashboard/executive-summary` | `useExecutiveSummary()` | — |
| GET | `/api/safehouses` | `useListSafehouses()` | `page`, `pageSize` |
| POST | `/api/safehouses` | `useCreateSafehouse()` | — |
| PATCH | `/api/safehouses/:id` | `useUpdateSafehouse()` | — |
| DELETE | `/api/safehouses/:id` | `useDeleteSafehouse()` | — |
| GET | `/api/partners` | `useListPartners()` | `page`, `pageSize` |
| POST | `/api/partners` | `useCreatePartner()` | — |
| PATCH | `/api/partners/:id` | `useUpdatePartner()` | — |
| DELETE | `/api/partners/:id` | `useDeletePartner()` | — |
| GET | `/api/users` | `useListUsers()` | `page`, `pageSize` |
| POST | `/api/users` | `useCreateUser()` | — |
| PATCH | `/api/users/:id` | `useUpdateUser()` | — |
| POST | `/api/users/:id/disable` | `useDisableUser()` | — |
| POST | `/api/users/:id/enable` | `useEnableUser()` | — |
| GET | `/api/audit-logs` | `useListAuditLogs()` | `page`, `pageSize`, `userId`, `action` |

---

### `services/superadminMl.service.ts`

#### Overview

| Method | Endpoint | Hook |
|---|---|---|
| GET | `/api/superadmin/overview/action-queue` | `useGetActionQueue()` |
| GET | `/api/superadmin/overview/funding-gap` | `useGetFundingGap()` |
| GET | `/api/superadmin/overview/safehouse-health-mini` | `useGetSafehouseHealthMini()` |

#### Donor Intelligence

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/donors/churn` | `useGetDonorChurn()` | `page`, `pageSize`, `dateRange`, `churnBand`, `safehouseId`, `sortBy`, `sortDir` |
| GET | `/api/superadmin/donors/:id/donations-recent` | `useGetDonorDonationsRecent(id)` | — |
| PATCH | `/api/superadmin/donors/:id` | `usePatchDonorAction()` | `{ churnRecommendedAction?, ... }` |
| GET | `/api/superadmin/donors/upgrade` | `useGetDonorUpgrade()` | `page`, `pageSize`, `dateRange`, `upgradeBand`, `safehouseId`, `sortBy`, `sortDir` |

#### Attribution

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/attribution/sankey` | `useGetAttributionSankey()` | `dateRange`, `safehouseId`, `campaignId`, `donationType` |
| GET | `/api/superadmin/attribution/programs` | `useGetAttributionPrograms()` | `dateRange`, `safehouseId`, `campaignId`, `donationType` |

#### Campaigns

| Method | Endpoint | Hook | Query Params / Body |
|---|---|---|---|
| GET | `/api/superadmin/campaigns/effectiveness` | `useGetCampaignEffectiveness()` | `category`, `status`, `isBoosted`, `platform`, `dateRange` |
| PATCH | `/api/superadmin/campaigns/:id/ml-flags` | `usePatchCampaignMlFlags()` | `{ recommendedAvoid: boolean }` |

#### Social Media

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/social/heatmap` | `useGetSocialHeatmap()` | `platform`, `dateRange` |
| GET | `/api/superadmin/social/recommendation` | `useGetSocialRecommendation()` | `dateRange` |
| GET | `/api/superadmin/social/posts` | `useGetSocialPosts()` | `page`, `pageSize`, `platform`, `mediaType`, `postType`, `contentTopic`, `isBoosted`, `conversionBand`, `dateRange`, `ids` |

#### Resident Regression

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/residents/regression/distribution` | `useGetRegressionDistribution()` | `safehouseId` |
| GET | `/api/superadmin/residents/regression/watchlist` | `useGetRegressionWatchlist()` | `page`, `pageSize`, `safehouseId`, `regressionRiskBand`, `minRegressionRiskScore`, `caseStatus`, `caseCategory` |
| PATCH | `/api/superadmin/residents/:id` | `usePatchResidentAction()` | `{ regressionRecommendedAction?, ... }` |

#### Reintegration

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/residents/reintegration/funnel` | `useGetReintegrationFunnel()` | `safehouseId`, `dateRange` |
| GET | `/api/superadmin/residents/reintegration/table` | `useGetReintegrationTable()` | `page`, `pageSize`, `safehouseId`, `reintegrationReadinessBand`, `regressionRiskBand`, `minReadinessScore`, `reintegrationStatus`, `caseCategory`, `minLengthOfStay`, `maxLengthOfStay` |

#### Interventions

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/interventions/effectiveness` | `useGetInterventionEffectiveness()` | `planCategory`, `safehouseId`, `dateRange`, `effectivenessBand` |
| GET | `/api/superadmin/interventions/effectiveness/:category/plans` | `useGetInterventionPlans(category)` | — |

#### Safehouse Health

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/safehouses/health` | `useGetSafehouseHealth()` | `monthStart`, `status`, `region` |
| GET | `/api/superadmin/safehouses/:id/health-history` | `useGetSafehouseHealthHistory(id)` | — |
| GET | `/api/superadmin/safehouses/health/compare` | `useGetSafehouseHealthCompare()` | `safehouseIds`, `monthStart` |

#### ML Model Ops

| Method | Endpoint | Hook | Query Params |
|---|---|---|---|
| GET | `/api/superadmin/ml/pipelines` | `useGetMlPipelines()` | `pipelineName`, `status`, `freshness` |
| GET | `/api/superadmin/ml/score-distribution` | `useGetScoreDistribution(pipelineName)` | `pipelineName` |
| GET | `/api/superadmin/ml/band-distribution` | `useGetBandDistribution(pipelineName)` | `pipelineName` |
| GET | `/api/superadmin/ml/feature-importance/:runId` | `useGetFeatureImportance(runId)` | — |

---

## Page-Level Direct Calls

These pages call `apiFetch`/`apiPost`/etc. inline rather than through a service hook.

### `pages/DonatePage.tsx` — Public Donate Page

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/public/safehouses` | None | Populate destination dropdown |
| POST | `/api/donations/public` | None | Anonymous donation submission |

---

### `pages/admin/CaseloadPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/residents` | Full resident list for kanban board |

---

### `pages/admin/CaseConferencesPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/case-conferences?page=&limit=20` | Paginated list |
| GET | `/api/residents?limit=200` | Resident dropdown |
| POST | `/api/case-conferences` | Create record |
| PATCH | `/api/case-conferences/:id` | Update record |
| DELETE | `/api/case-conferences/:id` | Delete record |

---

### `pages/admin/HomeVisitationsPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/home-visitations?page=&limit=20` | Paginated list |
| GET | `/api/residents?limit=200` | Resident dropdown |
| POST | `/api/home-visitations` | Create record |
| PATCH | `/api/home-visitations/:id` | Update record |
| DELETE | `/api/home-visitations/:id` | Delete record |

---

### `pages/admin/IncidentsPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/incident-reports?page=&limit=20` | Paginated list |
| GET | `/api/incident-reports?page=1&limit=2000` | Full export fetch |
| GET | `/api/residents?limit=200` | Resident dropdown |
| GET | `/api/safehouses?limit=100` | Safehouse dropdown |
| POST | `/api/incident-reports` | Create record |
| PATCH | `/api/incident-reports/:id` | Update record |
| DELETE | `/api/incident-reports/:id` | Delete record |

---

### `pages/admin/InterventionPlansPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/intervention-plans?page=&limit=20` | Paginated list |
| GET | `/api/residents?limit=200` | Resident dropdown |
| POST | `/api/intervention-plans` | Create record |
| PATCH | `/api/intervention-plans/:id` | Update record |
| DELETE | `/api/intervention-plans/:id` | Delete record |

---

### `pages/admin/ProcessRecordingsPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/process-recordings?page=&limit=20` | Paginated list |
| GET | `/api/residents?limit=200` | Resident dropdown |
| POST | `/api/process-recordings` | Create record |
| PATCH | `/api/process-recordings/:id` | Update record |
| DELETE | `/api/process-recordings/:id` | Delete record |

---

### `pages/admin/DonationsPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/donations` | Full donation list |
| GET | `/api/donation-allocations?donationId=` | Per-donation allocations panel |
| POST | `/api/donation-allocations` | `{ donationId, safehouseId, programArea, amountAllocated, allocationNotes? }` |
| DELETE | `/api/donation-allocations/:id` | Remove allocation |

---

### `pages/admin/DonorsPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/donations` | Donation list (donor-centric view) |
| GET | `/api/donation-allocations?donationId=` | Per-donation allocations panel |
| POST | `/api/donation-allocations` | Create allocation |
| DELETE | `/api/donation-allocations/:id` | Remove allocation |

---

### `pages/admin/PartnersPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/partners?page=&limit=20` | Paginated partner list |
| GET | `/api/partner-assignments?partnerId=` | Assignments for selected partner |
| GET | `/api/safehouses?limit=100` | Safehouse dropdown |
| POST | `/api/partners` | Create partner |
| PATCH | `/api/partners/:id` | Update partner |
| DELETE | `/api/partners/:id` | Delete partner |
| POST | `/api/partner-assignments` | Create assignment |
| PATCH | `/api/partner-assignments/:id` | Update assignment |
| DELETE | `/api/partner-assignments/:id` | Delete assignment |

---

### `pages/superadmin/SafehousesPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/safehouses?limit=100` | Full list |
| POST | `/api/safehouses` | Create safehouse |
| PATCH | `/api/safehouses/:id` | Update safehouse |
| DELETE | `/api/safehouses/:id` | Delete safehouse |

---

### `pages/superadmin/DonationsOverviewPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/donations` | With filter query params |
| GET | `/api/safehouses` | Filter dropdown |
| GET | `/api/donation-allocations?donationId=` | Per-donation allocations panel |
| POST | `/api/donation-allocations` | Create allocation |
| DELETE | `/api/donation-allocations/:id` | Remove allocation |

---

### `pages/superadmin/ImpactSnapshotsManagementPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/admin/impact-snapshots` | Admin-only snapshot list (includes drafts) |
| POST | `/api/impact-snapshots` | Create new snapshot |
| POST | `/api/impact-snapshots/:id/publish` | Publish snapshot |
| POST | `/api/impact-snapshots/:id/unpublish` | Unpublish snapshot |

---

### `pages/superadmin/ProgramUpdatesManagementPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/program-updates` | List all updates |
| POST | `/api/program-updates` | Create update |
| PATCH | `/api/program-updates/:id` | Edit update |
| DELETE | `/api/program-updates/:id` | Delete update |

---

### `pages/donor/UpdatesPage.tsx`

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/program-updates` | List updates visible to donor |
| POST | `/api/donor/viewed-items` | `{ itemType: "update", itemIds: number[] }` — mark as read |

---

## Endpoint Summary (Alphabetical)

| Endpoint | Methods Used | Caller(s) |
|---|---|---|
| `/api/admin/impact-snapshots` | GET | ImpactSnapshotsManagementPage |
| `/api/audit-logs` | GET | superadmin.service |
| `/api/auth/change-password` | POST | auth.service |
| `/api/auth/login` | POST | auth.service |
| `/api/campaigns` | GET, POST | campaigns.service |
| `/api/campaigns/:id` | GET, PATCH, DELETE | campaigns.service |
| `/api/campaigns/:id/donate` | POST | campaigns.service |
| `/api/case-conferences` | GET, POST | admin.service, CaseConferencesPage |
| `/api/case-conferences/:id` | PATCH, DELETE | CaseConferencesPage |
| `/api/dashboard/admin-summary` | GET | admin.service |
| `/api/dashboard/donor-summary` | GET | donor.service |
| `/api/dashboard/executive-summary` | GET | superadmin.service |
| `/api/dashboard/public-impact` | GET | public.service |
| `/api/donation-allocations` | GET, POST, DELETE | DonationsPage, DonorsPage, DonationsOverviewPage |
| `/api/donations` | GET | donations.service, DonationsPage, DonorsPage, DonationsOverviewPage |
| `/api/donations/:id` | GET | donations.service |
| `/api/donations/give` | POST | donations.service |
| `/api/donations/my-ledger` | GET | donations.service, donor.service |
| `/api/donations/public` | POST | DonatePage (public, no auth) |
| `/api/donations/trends` | GET | donations.service, admin.service |
| `/api/donor/viewed-items` | POST | UpdatesPage |
| `/api/education-records` | GET | residents.service |
| `/api/health-records` | GET | residents.service |
| `/api/home-visitations` | GET, POST | admin.service, HomeVisitationsPage |
| `/api/home-visitations/:id` | PATCH, DELETE | HomeVisitationsPage |
| `/api/impact-snapshots` | GET, POST | public.service, admin.service, donor.service, ImpactSnapshotsManagementPage |
| `/api/impact-snapshots/:id/publish` | POST | ImpactSnapshotsManagementPage |
| `/api/impact-snapshots/:id/unpublish` | POST | ImpactSnapshotsManagementPage |
| `/api/incident-reports` | GET, POST | admin.service, IncidentsPage |
| `/api/incident-reports/:id` | PATCH, DELETE | IncidentsPage |
| `/api/intervention-plans` | GET, POST | admin.service, InterventionPlansPage |
| `/api/intervention-plans/:id` | PATCH, DELETE | InterventionPlansPage |
| `/api/ml/insights` | GET | ml.service |
| `/api/ml/pipelines` | GET | ml.service |
| `/api/ml/predictions` | GET | ml.service |
| `/api/partner-assignments` | GET, POST | PartnersPage |
| `/api/partner-assignments/:id` | PATCH, DELETE | PartnersPage |
| `/api/partners` | GET, POST | superadmin.service, PartnersPage |
| `/api/partners/:id` | PATCH, DELETE | superadmin.service, PartnersPage |
| `/api/process-recordings` | GET, POST | admin.service, ProcessRecordingsPage |
| `/api/process-recordings/:id` | PATCH, DELETE | ProcessRecordingsPage |
| `/api/program-updates` | GET, POST | ProgramUpdatesManagementPage, UpdatesPage |
| `/api/program-updates/:id` | PATCH, DELETE | ProgramUpdatesManagementPage |
| `/api/public/safehouses` | GET | DonatePage (no auth) |
| `/api/residents` | GET | residents.service, CaseloadPage, CaseConferencesPage, IncidentsPage, InterventionPlansPage, HomeVisitationsPage, ProcessRecordingsPage |
| `/api/residents/:id` | GET | residents.service |
| `/api/residents/:id/timeline` | GET | residents.service |
| `/api/residents/stats` | GET | residents.service, admin.service |
| `/api/safehouses` | GET, POST | superadmin.service, SafehousesPage, DonationsOverviewPage |
| `/api/safehouses/:id` | PATCH, DELETE | superadmin.service, SafehousesPage |
| `/api/social-media-posts` | GET | public.service, donor.service |
| `/api/superadmin/attribution/programs` | GET | superadminMl.service |
| `/api/superadmin/attribution/sankey` | GET | superadminMl.service |
| `/api/superadmin/campaigns/effectiveness` | GET | superadminMl.service |
| `/api/superadmin/campaigns/:id/ml-flags` | PATCH | superadminMl.service |
| `/api/superadmin/donors/churn` | GET | superadminMl.service |
| `/api/superadmin/donors/upgrade` | GET | superadminMl.service |
| `/api/superadmin/donors/:id` | PATCH | superadminMl.service |
| `/api/superadmin/donors/:id/donations-recent` | GET | superadminMl.service |
| `/api/superadmin/interventions/effectiveness` | GET | superadminMl.service |
| `/api/superadmin/interventions/effectiveness/:category/plans` | GET | superadminMl.service |
| `/api/superadmin/ml/band-distribution` | GET | superadminMl.service |
| `/api/superadmin/ml/feature-importance/:runId` | GET | superadminMl.service |
| `/api/superadmin/ml/pipelines` | GET | superadminMl.service |
| `/api/superadmin/ml/score-distribution` | GET | superadminMl.service |
| `/api/superadmin/overview/action-queue` | GET | superadminMl.service |
| `/api/superadmin/overview/funding-gap` | GET | superadminMl.service |
| `/api/superadmin/overview/safehouse-health-mini` | GET | superadminMl.service |
| `/api/superadmin/residents/:id` | PATCH | superadminMl.service |
| `/api/superadmin/residents/regression/distribution` | GET | superadminMl.service |
| `/api/superadmin/residents/regression/watchlist` | GET | superadminMl.service |
| `/api/superadmin/residents/reintegration/funnel` | GET | superadminMl.service |
| `/api/superadmin/residents/reintegration/table` | GET | superadminMl.service |
| `/api/superadmin/safehouses/:id/health-history` | GET | superadminMl.service |
| `/api/superadmin/safehouses/health` | GET | superadminMl.service |
| `/api/superadmin/safehouses/health/compare` | GET | superadminMl.service |
| `/api/superadmin/social/heatmap` | GET | superadminMl.service |
| `/api/superadmin/social/posts` | GET | superadminMl.service |
| `/api/superadmin/social/recommendation` | GET | superadminMl.service |
| `/api/supporters` | GET | supporters.service |
| `/api/supporters/:id` | GET | supporters.service |
| `/api/supporters/:id/giving-stats` | GET | supporters.service |
| `/api/supporters/me` | GET, PATCH | donor.service |
| `/api/supporters/me/recurring` | GET, PATCH | donations.service |
| `/api/supporters/stats` | GET | supporters.service |
| `/api/users` | GET, POST | superadmin.service |
| `/api/users/:id` | PATCH | superadmin.service |
| `/api/users/:id/disable` | POST | superadmin.service |
| `/api/users/:id/enable` | POST | superadmin.service |

---

## Deployment Notes — Vercel + Azure + Supabase Target Architecture

These notes describe how the frontend API call patterns behave when deployed to the target architecture. No frontend code changes are needed for migration — all concerns are configuration.

### API base URL — the single most important config item

All 73 endpoints listed in this document are called using the custom client in `services/api.ts`:

```typescript
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
fetch(`${API_BASE}/api/auth/login`, ...)
```

When `VITE_API_BASE_URL` is empty (the default in Replit), all calls use relative paths (e.g., `/api/auth/login`). These work because Vite's dev proxy forwards them to the local Express server.

On Vercel, there is no dev proxy. If `VITE_API_BASE_URL` is not set:
- Calls go to `https://beacon.vercel.app/api/...` — a path on the Vercel CDN that does not exist
- Every API call returns 404
- The app appears broken on login

**Fix:** Set `VITE_API_BASE_URL=https://beacon-api.azurewebsites.net` as an Environment Variable in the Vercel project dashboard before building. This value is baked into the static JS bundle at build time. A Vercel redeploy is required if the Azure backend URL changes.

### No API calls go to Vercel — only the Azure backend

All 73 endpoints in this document are served by the Azure backend. Vercel only serves the static React bundle (HTML, JS, CSS). There are no Vercel serverless functions, Edge functions, or API routes in this project.

### Auth token lifecycle across separate domains

The frontend stores the JWT in React context (memory-only). On Vercel + Azure:

- The token is attached to every request as `Authorization: Bearer <token>` — this works identically on cross-origin requests.
- **No cookies are used.** `credentials: false` is set on the `cors` middleware. `fetch` calls do not include `credentials: "include"`. The cross-domain split does not affect auth in any way.
- A page refresh clears the in-memory token — the user is effectively logged out. This is the same behavior as on Replit and is not a regression.
- The 8-hour JWT expiry applies globally — after 8 hours, the backend returns 401, the `beacon:unauthorized` event fires, and the client clears its token.

### Public endpoints (no auth) — unchanged

These endpoints are called without an `Authorization` header and must have no auth requirement:

| Endpoint | Called by |
|---|---|
| `GET /api/dashboard/public-impact` | `public.service.ts` |
| `GET /api/impact-snapshots` | `public.service.ts` |
| `GET /api/social-media-posts` | `public.service.ts` |
| `GET /api/public/safehouses` | `DonatePage.tsx` |
| `GET /api/healthz` | Health check |

These calls are cross-origin on Vercel + Azure. The Azure backend must not require `Authorization` for these routes and must include the correct CORS headers in the response. No cookies, no credentials, no special handling needed.

### Orval-generated client — minimal role

The generated client in `vendor/api-client-react` is only used at app bootstrap to call `setBaseUrl()` and `setAuthTokenGetter()`. All actual data fetching goes through the custom `api.ts` client. On Vercel, `setBaseUrl()` must receive the Azure backend URL — this is set from `VITE_API_BASE_URL` in `main.tsx`.

### File uploads — none

No endpoint in this inventory uploads files. No `multipart/form-data` requests are made. No `Content-Type: multipart/form-data` headers appear in any service file. This simplifies the Azure CORS and storage configuration.
