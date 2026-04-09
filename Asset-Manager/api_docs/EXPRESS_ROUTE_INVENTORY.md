# Express Route Inventory — Beacon API Server

**Generated from source reading of all 18 route modules.**
All routes are mounted under the `/api` prefix via `artifacts/api-server/src/routes/index.ts`.

---

## Global Middleware (applied before every route)

| Middleware | Purpose |
|---|---|
| HTTP→HTTPS redirect | Forces HTTPS in production |
| `securityHeaders` | Adds security-related HTTP headers |
| `rateLimiter(500 req / 60 s)` | Global rate limiting |
| `pino-http` | Structured HTTP request logging |
| `cors` | Cross-origin resource sharing |
| `express.json({ limit: "10mb" })` | Parses JSON bodies |
| `express.urlencoded` | Parses URL-encoded bodies |
| `sanitizeInput` | Sanitizes request body fields |

## Auth Middleware

| Middleware | Behaviour |
|---|---|
| `requireAuth` | Verifies JWT Bearer token; checks `isActive` flag on user; returns `401` on failure |
| `requireRoles(...roles)` | Checks `req.user.role` is in allowed set; returns `403` on failure |
| `optionalAuth` | Attaches user from token if present; no-op if no token |

---

## 1. Health (`routes/health.ts`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/healthz` | None | — | Returns `{ status: "ok" }` health check |

---

## 2. Auth (`routes/auth.ts`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/auth/login` | None | — | Authenticates username+password; returns JWT + user payload with `safehouses[]` array |
| POST | `/api/auth/logout` | None | — | Stateless logout; returns success message |
| POST | `/api/auth/change-password` | `requireAuth` | Any | Changes own password; validates 12-char minimum, upper, lower, digit, special |
| GET | `/api/auth/me` | `optionalAuth` | Any | Returns current user with safehouse assignments; `{ user: null }` if unauthenticated |

---

## 3. Dashboard (`routes/dashboard.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/dashboard/admin-summary` | `requireAuth` | staff, admin, super_admin | — | Scoped KPIs: active residents, high-risk count, open incidents, upcoming conferences, donation totals, donation trend (6 mo), residents-by-risk per safehouse, reintegration breakdown, process recordings this week, active intervention plans, priority alerts, ML alerts |
| GET | `/api/dashboard/donor-summary` | `requireAuth` | donor | — | Donor-scoped: lifetime giving, giving this year, donation count, giving trend (12 mo), allocation breakdown by program, recent 5 donations, impact stats, published snapshots, ML reintegration predictions |
| GET | `/api/dashboard/executive-summary` | `requireAuth` | admin, super_admin | `safehouseId`, `months` (1–24, default 12) | Full executive report: all KPIs, donation trend, risk distribution, reintegration pipeline, per-safehouse breakdown, recent incidents, upcoming conferences, ML alerts, allocation by program, donor channel breakdown |

---

## 4. Safehouses (`routes/safehouses.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/public/safehouses` | None | — | — | Public list: safehouse IDs and names only (for donate page) |
| GET | `/api/safehouses` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize` | Paginated list of all safehouses |
| POST | `/api/safehouses` | `requireAuth` | admin, super_admin | — | Create a new safehouse |
| GET | `/api/safehouses/:id` | `requireAuth` | staff, admin, super_admin | — | Get single safehouse |
| PATCH | `/api/safehouses/:id` | `requireAuth` | admin, super_admin | — | Update safehouse fields |
| DELETE | `/api/safehouses/:id` | `requireAuth` | admin, super_admin | — | Delete safehouse |
| GET | `/api/safehouses/:id/metrics` | `requireAuth` | staff, admin, super_admin | `months` (default 12) | Monthly metrics history for a safehouse (avgHealthScore, avgEducationProgress, etc.) |

---

## 5. Partners (`routes/partners.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/partners` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize` | Paginated list of partner organisations |
| POST | `/api/partners` | `requireAuth` | admin, super_admin | — | Create partner |
| GET | `/api/partners/:id` | `requireAuth` | staff, admin, super_admin | — | Get single partner |
| PATCH | `/api/partners/:id` | `requireAuth` | admin, super_admin | — | Update partner |
| DELETE | `/api/partners/:id` | `requireAuth` | admin, super_admin | — | Delete partner |
| GET | `/api/partner-assignments` | `requireAuth` | staff, admin, super_admin | `safehouseId`, `partnerId` | List partner assignments; filterable by safehouse or partner; includes joined safehouse name |
| POST | `/api/partner-assignments` | `requireAuth` | admin, super_admin | — | Create assignment |
| PATCH | `/api/partner-assignments/:id` | `requireAuth` | admin, super_admin | — | Update assignment |
| DELETE | `/api/partner-assignments/:id` | `requireAuth` | admin, super_admin | — | Delete assignment |

---

## 6. Supporters (`routes/supporters.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/supporters/me` | `requireAuth` | donor | — | Get own supporter profile |
| PATCH | `/api/supporters/me` | `requireAuth` | donor | — | Update own profile (firstName, lastName, phone, organizationName) |
| GET | `/api/supporters/me/recurring` | `requireAuth` | donor | — | Get `recurringEnabled` status |
| PATCH | `/api/supporters/me/recurring` | `requireAuth` | donor | — | Toggle `recurringEnabled` |
| GET | `/api/supporters/stats` | `requireAuth` | staff, admin, super_admin | — | Aggregate stats: total, active, recurring, new this month, lifetime total, avg gift, channel breakdown, type mix |
| GET | `/api/supporters/:id/giving-stats` | `requireAuth` | Any | — | Per-supporter giving stats: total, count, avg gift, last donation date, donation types map |
| GET | `/api/supporters` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize` | Paginated list with LEFT JOIN aggregates: lifetimeGiving, donationCount, lastGiftDate, hasRecurring |
| POST | `/api/supporters` | `requireAuth` | staff, admin, super_admin | — | Create supporter |
| GET | `/api/supporters/:id` | `requireAuth` | Any | — | Get single supporter |
| PATCH | `/api/supporters/:id` | `requireAuth` | staff, admin, super_admin | — | Update supporter |
| DELETE | `/api/supporters/:id` | `requireAuth` | admin, super_admin | — | Delete supporter |

---

## 7. Donations (`routes/donations.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/donations/my-ledger` | `requireAuth` | donor | `page`, `limit`/`pageSize` | Donor's own donation history with safehouse name join |
| GET | `/api/donations/trends` | `requireAuth` | staff, admin, super_admin | `months` (default 12) | Monthly donation totals, counts, and averages |
| GET | `/api/donations` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `fundType` (general\|directed) | All donations with supporter+safehouse joins, allocation totals, unallocated amount; scoped to allowed safehouses for non-super_admin |
| POST | `/api/donations` | `requireAuth` | staff, admin, super_admin | — | Create donation record |
| GET | `/api/donations/:id` | `requireAuth` | Any | — | Get single donation with supporter name |
| PATCH | `/api/donations/:id` | `requireAuth` | staff, admin, super_admin | — | Update donation |
| DELETE | `/api/donations/:id` | `requireAuth` | admin, super_admin | — | Delete donation |
| POST | `/api/donations/give` | `requireAuth` | donor | — | Donor self-service give: records monetary donation with optional safehouseId; returns human-readable thank-you message |
| POST | `/api/donations/public` | None | — | — | Anonymous/public donate from landing page; name+email stored in notes field |
| GET | `/api/donation-allocations` | `requireAuth` | staff, admin, super_admin | `donationId` | List allocations with safehouse name; filterable by donationId |
| POST | `/api/donation-allocations` | `requireAuth` | staff, admin, super_admin | — | Create allocation (donationId, programArea, amountAllocated required) |
| DELETE | `/api/donation-allocations/:id` | `requireAuth` | staff, admin, super_admin | — | Delete allocation |

---

## 8. In-Kind Donation Items (`routes/inKindDonationItems.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/in-kind-donation-items` | `requireAuth` | staff, admin, super_admin | `donationId`, `itemCategory`, `page`, `pageSize` | Paginated list of in-kind items; quantity and estimatedUnitValue returned as floats |
| POST | `/api/in-kind-donation-items` | `requireAuth` | staff, admin, super_admin | — | Create in-kind item |
| GET | `/api/in-kind-donation-items/:id` | `requireAuth` | staff, admin, super_admin | — | Get single item |
| DELETE | `/api/in-kind-donation-items/:id` | `requireAuth` | admin, super_admin | — | Delete item |

---

## 9. Campaigns (`routes/campaigns.ts`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/campaigns` | `requireAuth` | Any | Donors see only active campaigns (ordered by deadline); admin/staff/super_admin see all. Enriched with totalRaised and donorCount aggregates from donations table |
| GET | `/api/campaigns/:id` | `requireAuth` | Any | Single campaign with totalRaised and donorCount |
| POST | `/api/campaigns` | `requireAuth` | super_admin | Create campaign (title required; goal stored as string numeric) |
| PATCH | `/api/campaigns/:id` | `requireAuth` | super_admin | Partial update of campaign fields |
| DELETE | `/api/campaigns/:id` | `requireAuth` | super_admin | Delete campaign |
| POST | `/api/campaigns/:id/donate` | `requireAuth` | donor | Donor donates to specific campaign; validates campaign is active; records donation with campaignId and campaignName |

---

## 10. Residents (`routes/residents.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/residents/stats` | `requireAuth` | staff, admin, super_admin | — | Aggregate stats: totalActive, newAdmissions (30d), highRisk, riskDistribution, statusDistribution |
| GET | `/api/residents/:id/timeline` | `requireAuth` | staff, admin, super_admin | — | Chronological event timeline: sessions, home visits, case conferences, intervention plans, incidents |
| GET | `/api/residents` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `safehouseId`, `caseStatus` | Paginated residents list; scoped to allowed safehouses; formatted via `formatResident()` (adds age, residentCode, normalised enums) |
| POST | `/api/residents` | `requireAuth` | staff, admin, super_admin | — | Create resident |
| GET | `/api/residents/:id` | `requireAuth` | staff, admin, super_admin | — | Get single resident with safehouse name |
| PATCH | `/api/residents/:id` | `requireAuth` | staff, admin, super_admin | — | Update resident |
| DELETE | `/api/residents/:id` | `requireAuth` | admin, super_admin | — | Delete resident |

---

## 11. Case Management (`routes/caseManagement.ts`)

> All routes scoped by allowed safehouse assignments for non-super_admin users.

### Process Recordings

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/process-recordings` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `residentId`, `safehouseId` | Paginated recordings with residentCode join |
| POST | `/api/process-recordings` | `requireAuth` | staff, admin, super_admin | — | Create recording |
| GET | `/api/process-recordings/:id` | `requireAuth` | staff, admin, super_admin | — | Get single recording |
| PATCH | `/api/process-recordings/:id` | `requireAuth` | staff, admin, super_admin | — | Update recording |
| DELETE | `/api/process-recordings/:id` | `requireAuth` | staff, admin, super_admin | — | Delete recording |

### Home Visitations

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/home-visitations` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `residentId` | Paginated visitations with residentCode join |
| POST | `/api/home-visitations` | `requireAuth` | staff, admin, super_admin | — | Create visitation |
| GET | `/api/home-visitations/:id` | `requireAuth` | staff, admin, super_admin | — | Get single visitation |
| PATCH | `/api/home-visitations/:id` | `requireAuth` | staff, admin, super_admin | — | Update visitation |
| DELETE | `/api/home-visitations/:id` | `requireAuth` | staff, admin, super_admin | — | Delete visitation |

### Case Conferences

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/case-conferences` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `residentId`, `status` | Paginated conferences; status filter matches conferenceType |
| POST | `/api/case-conferences` | `requireAuth` | staff, admin, super_admin | — | Create conference |
| GET | `/api/case-conferences/:id` | `requireAuth` | staff, admin, super_admin | — | Get single conference |
| PATCH | `/api/case-conferences/:id` | `requireAuth` | staff, admin, super_admin | — | Update conference |
| DELETE | `/api/case-conferences/:id` | `requireAuth` | staff, admin, super_admin | — | Delete conference |

### Intervention Plans

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/intervention-plans` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `residentId`, `status` | Paginated plans; targetValue returned as float |
| POST | `/api/intervention-plans` | `requireAuth` | staff, admin, super_admin | — | Create plan |
| GET | `/api/intervention-plans/:id` | `requireAuth` | staff, admin, super_admin | — | Get single plan |
| PATCH | `/api/intervention-plans/:id` | `requireAuth` | staff, admin, super_admin | — | Update plan |
| DELETE | `/api/intervention-plans/:id` | `requireAuth` | staff, admin, super_admin | — | Delete plan |

### Incident Reports

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/incident-reports` | `requireAuth` | staff, admin, super_admin | `page`, `limit`/`pageSize`, `residentId`, `safehouseId`, `severity` | Paginated reports with residentCode + safehouseName joins; scoped by allowed safehouses |
| POST | `/api/incident-reports` | `requireAuth` | staff, admin, super_admin | — | Create report |
| GET | `/api/incident-reports/:id` | `requireAuth` | staff, admin, super_admin | — | Get single report |
| PATCH | `/api/incident-reports/:id` | `requireAuth` | staff, admin, super_admin | — | Update report |
| DELETE | `/api/incident-reports/:id` | `requireAuth` | staff, admin, super_admin | — | Delete report |

---

## 12. Records (`routes/records.ts`)

### Education Records

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/education-records` | `requireAuth` | staff, admin, super_admin | `residentId`, `page`, `limit`/`pageSize` | Paginated education records; attendanceRate and progressPercent as floats |
| POST | `/api/education-records` | `requireAuth` | staff, admin, super_admin | — | Create record |
| PATCH | `/api/education-records/:id` | `requireAuth` | staff, admin, super_admin | — | Update record |
| DELETE | `/api/education-records/:id` | `requireAuth` | staff, admin, super_admin | — | Delete record |

### Health / Wellbeing Records

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/health-records` | `requireAuth` | staff, admin, super_admin | `residentId`, `page`, `limit`/`pageSize` | Paginated health records; all score/measurement fields returned as floats |
| POST | `/api/health-records` | `requireAuth` | staff, admin, super_admin | — | Create record |
| PATCH | `/api/health-records/:id` | `requireAuth` | staff, admin, super_admin | — | Update record |
| DELETE | `/api/health-records/:id` | `requireAuth` | staff, admin, super_admin | — | Delete record |

---

## 13. Social Media (`routes/socialMedia.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/social-media-posts` | `requireAuth` | donor, staff, admin, super_admin | `page`, `limit`/`pageSize`, `platform` | Paginated posts; all numeric fields (engagementRate, boostBudgetPhp, etc.) returned as floats; createdAt as ISO string |
| POST | `/api/social-media-posts` | `requireAuth` | staff, admin, super_admin | — | Create post |
| GET | `/api/social-media-posts/analytics` | `requireAuth` | staff, admin, super_admin | — | Aggregate analytics by platform (posts, likes, shares, reach, donationReferrals) + top 5 posts by donationReferrals |
| GET | `/api/social-media-posts/:id` | `requireAuth` | staff, admin, super_admin | — | Get single post |
| PATCH | `/api/social-media-posts/:id` | `requireAuth` | staff, admin, super_admin | — | Update post |
| DELETE | `/api/social-media-posts/:id` | `requireAuth` | admin, super_admin | — | Delete post |

---

## 14. Impact Snapshots (`routes/impactSnapshots.ts`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/impact-snapshots` | None | — | Public: returns only published snapshots (`isPublished = true`) |
| GET | `/api/impact-snapshots/:id` | None | — | Public: returns single snapshot only if published; 404 otherwise |
| GET | `/api/admin/impact-snapshots` | `requireAuth` | admin, super_admin | Admin: returns ALL snapshots (published and drafts), paginated |
| GET | `/api/admin/impact-snapshots/:id` | `requireAuth` | admin, super_admin | Admin: single snapshot regardless of published status |
| POST | `/api/impact-snapshots` | `requireAuth` | admin, super_admin | Create snapshot (always starts as `isPublished: false`) |
| PATCH | `/api/impact-snapshots/:id` | `requireAuth` | admin, super_admin | Update snapshot fields |
| DELETE | `/api/impact-snapshots/:id` | `requireAuth` | admin, super_admin | Delete snapshot |
| POST | `/api/impact-snapshots/:id/publish` | `requireAuth` | admin, super_admin | Set `isPublished: true`, sets `publishedAt` to now |
| POST | `/api/impact-snapshots/:id/unpublish` | `requireAuth` | admin, super_admin | Set `isPublished: false` |

---

## 15. ML Predictions (Standard) (`routes/ml.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/ml/predictions` | `requireAuth` | staff, admin, super_admin | `pipelineName`, `entityId`, `entityType`, `page`, `limit`/`pageSize` | Paginated ML prediction snapshots |
| GET | `/api/ml/pipelines` | `requireAuth` | staff, admin, super_admin | — | All pipeline run records |
| GET | `/api/ml/predictions/:entityType/:entityId` | `requireAuth` | staff, admin, super_admin | — | All predictions for a given entity |
| GET | `/api/ml/insights` | `requireAuth` | staff, admin, super_admin | — | Aggregate: totalPredictions, activePipelines, avgConfidence, recent 5 predictions, all pipelines |

---

## 16. Program Updates & Donor Notifications (`routes/programUpdates.ts`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/program-updates` | `requireAuth` | Any | Donors see only published (ordered by publishedAt desc); staff/admin/super_admin see all (ordered by createdAt desc) |
| POST | `/api/program-updates` | `requireAuth` | staff, admin, super_admin | Create update (title required; publishedAt auto-set if isPublished=true) |
| PATCH | `/api/program-updates/:id` | `requireAuth` | staff, admin, super_admin | Partial update; publishedAt set on first publish |
| DELETE | `/api/program-updates/:id` | `requireAuth` | admin, super_admin | Cascades: deletes associated donor_viewed_items rows first |
| GET | `/api/donor/notifications` | `requireAuth` | donor | Unread notification feed: blended unread published updates + unread active campaigns sorted by date (max 20 items); returns unread counts |
| POST | `/api/donor/viewed-items` | `requireAuth` | donor | Mark items as viewed (body: `{ itemType: string, itemIds: number[] }`); idempotent — ignores already-viewed ids |

---

## 17. Users (`routes/users.ts`)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/users` | `requireAuth` | super_admin | `page`, `limit`/`pageSize`, `role` | Paginated user list (passwordHash excluded from response) |
| POST | `/api/users` | `requireAuth` | super_admin | — | Create user; validates password strength (≥12 chars, upper, lower, digit, special); handles `assignedSafehouses[]` array |
| GET | `/api/users/:id` | `requireAuth` | super_admin | — | Get user with safehouse assignments |
| PATCH | `/api/users/:id` | `requireAuth` | super_admin | — | Update user; replaces safehouse assignments if `assignedSafehouses` is in body |
| DELETE | `/api/users/:id` | `requireAuth` | super_admin | — | Delete user; cannot delete own account (400) |
| POST | `/api/users/:id/disable` | `requireAuth` | super_admin | — | Set `isActive: false` |
| POST | `/api/users/:id/enable` | `requireAuth` | super_admin | — | Set `isActive: true` |

---

## 18. Super Admin ML Dashboard (`routes/superadminMl.ts`)

> 2544-line file implementing W01–W13 widgets from the ML UI Data Contract.
> Privacy rules: `ml_scores_restricted = true` residents excluded from row-level endpoints; donor emails redacted to `***@***.***` for admin role; monetary values as NUMERIC strings; timestamps as ISO 8601.
> Date filtering: `dateRange` param accepts `30d`, `90d` (default), `6mo`, `12mo`, `custom` (with `dateStart`+`dateEnd`).

### W01 — Action Queue (Overview)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/superadmin/overview/action-queue` | `requireAuth` | super_admin | Returns churn alert (at-risk donor count + top 3), regression alert (critical/high band resident count), safehouse alert (at-risk/critical health band count + names) |

### W02 — Funding Gap KPI (Overview)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/superadmin/overview/funding-gap` | `requireAuth` | super_admin | Latest snapshot funding gap (projectedGapPhp30d, fundingGapBand, updatedAt) + trailing 12-month donation sparkline |

### W03 — Safehouse Health Mini Leaderboard (Overview)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/superadmin/overview/safehouse-health-mini` | `requireAuth` | super_admin, admin | Top 5 safehouses by peerRank from latest monthly metrics; admins scoped to their assigned safehouses |

### W04 — Donor Churn (Donors Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/donors/churn` | `requireAuth` | super_admin, admin | `page`, `pageSize`/`limit`, `churnBand`, `acquisitionChannel`, `region`, `recurringEnabled`, `safehousePreference`, `sortBy` | Paginated donor churn table; admin email redacted; scoped to allowed safehouses for admin |
| GET | `/api/superadmin/donors/:id/donations-recent` | `requireAuth` | super_admin, admin | — | Last 5 donations for a supporter (used as drilldown); admin IDOR-guarded by safehouse check |

### W05 — Donor Upgrade Board (Donors Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/donors/upgrade` | `requireAuth` | super_admin | `page`, `pageSize`/`limit`, `upgradeBand`, `minUpgradeScore`, `recurringEnabled`, `acquisitionChannel`, `minAvgQuarterlyAmount` | Paginated upgrade board with computed donationAmountTrend (increasing/stable/decreasing based on quarter-over-quarter change) |

### W06 — Attribution (Donors Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/attribution/sankey` | `requireAuth` | super_admin | `dateRange`, `dateStart`, `dateEnd` | Sankey flow nodes and links: supporter → programArea → safehouse; max 200 flow rows; includes disclaimer and quarter label |
| GET | `/api/superadmin/attribution/programs` | `requireAuth` | super_admin | `dateRange`, `dateStart`, `dateEnd`, `safehouseId`, `programArea` | Program-area KPI cards: totalAllocatedPhp, avgAttributedOutcomeScore, safehouseCount |
| GET | `/api/superadmin/attribution/export` | `requireAuth` | super_admin | `dateRange`, `dateStart`, `dateEnd` | Export dataset (max 5000 rows): donationId, date, amount, attributedOutcomeScore, donorName, programArea, safehouseName |

### W07 — Campaign Effectiveness (Campaigns & Social Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/campaigns/effectiveness` | `requireAuth` | super_admin | `dateRange`, `dateStart`, `dateEnd`, `category`, `status`, `isBoosted` | Campaign movement vs noise: joins donation aggregates, social media engagement stats, and latest ML prediction per campaign; returns conversionRatio and classificationBand |

### W08 — Social Post Conversion (Campaigns & Social Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/social/heatmap` | `requireAuth` | super_admin, admin | `dateRange`, `dateStart`, `dateEnd`, `platform` | Day-of-week × post-hour heatmap of avg donation referrals; returns `insufficientData: true` if fewer than 10 posts match |
| GET | `/api/superadmin/social/recommendation` | `requireAuth` | super_admin, admin | `dateRange`, `dateStart`, `dateEnd` | Single best-performing post with `conversion_band = high-converter` by conversion score |
| GET | `/api/superadmin/social/posts` | `requireAuth` | super_admin, admin | `page`, `pageSize`/`limit`, `dateRange`, `dateStart`, `dateEnd`, `platform`, `mediaType`, `postType`, `contentTopic`, `isBoosted`, `conversionBand`, `ids` | Paginated ML-enriched post table; includes predictedVsActualDelta, conversionTopDrivers, conversionComparablePostIds |

### W09 — Resident Regression (Residents & Safehouses Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/residents/regression/distribution` | `requireAuth` | super_admin, admin | — | Stacked bar: band counts per safehouse; restricted residents counted separately; scoped by allowed safehouses for admin |
| GET | `/api/superadmin/residents/regression/watchlist` | `requireAuth` | super_admin, admin | `page`, `pageSize`/`limit`, `safehouseId`, `caseCategory`, `regressionRiskBand`, `minRegressionRiskScore`, `caseStatus` | Paginated watchlist excluding `ml_scores_restricted = true`; includes topDriverLabel; meta.totalRestricted |

### W10 — Reintegration (Residents & Safehouses Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/residents/reintegration/funnel` | `requireAuth` | super_admin, admin | `dateRange`, `dateStart`, `dateEnd` | 4-stage funnel: Assessed → Eligible → In Planning → Reintegrated; per-safehouse breakdown; totalRestricted count |
| GET | `/api/superadmin/residents/reintegration/table` | `requireAuth` | super_admin, admin | `page`, `pageSize`/`limit`, `safehouseId`, `reintegrationType`, `reintegrationReadinessBand`, `regressionRiskBand`, `minReadinessScore`, `reintegrationStatus`, `caseCategory` | Paginated reintegration ranked table; excludes restricted; topPositiveIndicator and topBarrier from drivers JSON |

### W11 — Intervention Effectiveness (Residents & Safehouses Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/interventions/effectiveness` | `requireAuth` | super_admin, admin | `dateRange`, `dateStart`, `dateEnd`, `safehouseId`, `planCategory`, `effectivenessBand` | Effectiveness matrix grouped by planCategory; computes avgHealthScoreDelta, avgEducationProgressDelta, avgSessionProgressRate from driversAgg; effectivenessBandDistribution |
| GET | `/api/superadmin/interventions/effectiveness/:category/plans` | `requireAuth` | super_admin, admin | — | Drilldown: completed plans within a category with effectivenessOutcomeScore and topDriverLabel |

### W12 — Safehouse Health (Residents & Safehouses Page)

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/safehouses/health` | `requireAuth` | super_admin, admin | `monthStart`, `status`, `region` | Full leaderboard from latest monthly metrics; peerRank hidden for admin role; includes all health sub-metrics |
| GET | `/api/superadmin/safehouses/health/compare` | `requireAuth` | super_admin | `safehouseIdA` (req), `safehouseIdB` (req), `monthStart` | Radar chart compare mode: 5 axes (avgHealthScore, avgEducationProgress, incidentCountInverted, processRecordingCount, homeVisitationCount) for two safehouses |
| GET | `/api/superadmin/safehouses/:id/health-history` | `requireAuth` | super_admin, admin | — | Last 12 months of monthly metrics for one safehouse (admin: IDOR-guarded by allowed safehouses) |

### W13 — ML Model Operations

| Method | Path | Auth | Roles | Query Params | Description |
|---|---|---|---|---|---|
| GET | `/api/superadmin/ml/pipelines` | `requireAuth` | super_admin | `pipelineName`, `status`, `trainedAtStart`, `trainedAtEnd` | Pipeline status table: joins latest prediction stats (count, avg/min/max score, lastPredictionAt); computes daysSinceLastRun, freshness status, metricsF1/Precision/Recall/Rmse |
| GET | `/api/superadmin/ml/score-distribution` | `requireAuth` | super_admin | `pipelineName` (required) | Score histogram (10 buckets 0.0–0.9) for latest completed run of a pipeline |
| GET | `/api/superadmin/ml/band-distribution` | `requireAuth` | super_admin | `pipelineName` (required) | Band label distribution for latest completed run |
| GET | `/api/superadmin/ml/feature-importance/:runId` | `requireAuth` | super_admin | — | Top 10 features by importance for a specific pipeline run |

### PATCH Action Endpoints

| Method | Path | Auth | Roles | Allowed Body Fields | Description |
|---|---|---|---|---|---|
| PATCH | `/api/superadmin/residents/:id` | `requireAuth` | super_admin | `regressionRecommendedAction`, `reintegrationRecommendedAction` | Update resident ML action override fields |
| PATCH | `/api/superadmin/donors/:id` | `requireAuth` | super_admin | `churnRecommendedAction`, `upgradeBand` | Update supporter ML action override fields |
| PATCH | `/api/superadmin/campaigns/:id/ml-flags` | `requireAuth` | super_admin | `recommendedAvoid` (boolean) | Merges `{ recommendedAvoid }` into `context_json` of the latest campaign_effectiveness snapshot |

---

## Summary Counts

| Module | Route Count |
|---|---|
| Health | 1 |
| Auth | 4 |
| Dashboard | 3 |
| Safehouses | 7 |
| Partners | 9 |
| Supporters | 11 |
| Donations (incl. allocations) | 12 |
| In-Kind Donation Items | 4 |
| Campaigns | 6 |
| Residents | 7 |
| Case Management | 25 |
| Records | 8 |
| Social Media | 6 |
| Impact Snapshots | 9 |
| ML Predictions (standard) | 4 |
| Program Updates & Notifications | 6 |
| Users | 7 |
| Super Admin ML (W01–W13 + PATCH) | 25 |
| **TOTAL** | **154** |

---

## Notes

- **No file upload routes exist** anywhere in the backend.
- **No dead or commented-out routes** were found in any module.
- The `super_admin` ML routes at `/api/superadmin/*` completely supersede the basic `/api/ml/*` routes for super admin use cases — the basic ML routes remain for staff/admin portal use.
- The `safehouse_monthly_metrics` table is read-only from the API — no write routes exist for it; it is assumed to be populated by a batch job.
- All pagination responses follow the shape `{ data, total, pagination: { page, pageSize, totalPages, hasNext, hasPrev } }`.
- PHP monetary values in superadmin ML routes are returned as `NUMERIC` strings (e.g. `"12345.67"`); all other routes convert to JS floats.

---

## Deployment Notes — Vercel + Azure + Supabase Target Architecture

These notes apply to the full route inventory when deploying to the target architecture. No route paths change. These are infrastructure and middleware concerns.

### CORS middleware — critical for cross-origin deployment

In the current Express implementation, CORS is configured via the `cors` npm package with an origin callback in `app.ts`. On Vercel + Azure, the frontend (`beacon.vercel.app`) and backend (`beacon-api.azurewebsites.net`) are on separate domains. **Every browser request is cross-origin.**

- The `CORS_ALLOWED_ORIGINS` environment variable (Azure App Settings) **must** include the Vercel production URL.
- The `OPTIONS` preflight is sent for all non-simple requests — any request with an `Authorization` header triggers a preflight. The Express `cors` middleware handles this correctly, but the `.NET` replacement must also respond to `OPTIONS` requests.
- The current CORS implementation uses an exact-match string allowlist and does not support wildcards. Vercel preview deployment URLs change per branch — they will be CORS-rejected unless explicitly added.
- `credentials: false` is set — auth uses `Authorization: Bearer`, not cookies. `Access-Control-Allow-Credentials` is not required.

### HTTP→HTTPS redirect middleware

The `securityHeaders` middleware enforces HTTPS via `x-forwarded-proto` check. On Azure App Service, TLS termination happens at the Azure infrastructure layer and this header is set correctly. This middleware is safe to retain as-is on Azure.

### Rate limiting middleware

The current rate limiter (`500 req / 60 s` global) is in-memory. On Azure App Service with multiple instances or deployment slots, the rate limit state is not shared across instances — each instance has its own counter. For accurate rate limiting on Azure, a distributed store (Redis via Azure Cache for Redis) would be required. For the current demo scale, this is acceptable.

### No file upload routes

There are no multipart or file upload routes in the entire inventory. If file uploads are added during the .NET migration, Azure Blob Storage is the natural backend choice. New routes and environment variables will be required.

### Route paths — no changes permitted

All 154 routes must be exposed at the same paths on the Azure backend. The frontend has no configurable API prefix — all paths are hardcoded in service files. The `.NET` backend must serve all routes under `/api/`. See `API_CONTRACT_SOURCE_OF_TRUTH.md §6.10` for the non-negotiable route path list.
