# Super Admin ML Dashboard — Frontend Map

**Date:** 2026-04-09  
**Backend reference:** `SUPER_ADMIN_ML_BACKEND_ENDPOINTS.md`  
**Role:** `super_admin` only (all ML pages are ProtectedRoute with `roles={["super_admin"]}`)

---

## Routes & Pages

### 1. `/superadmin` — Executive Dashboard with AI Overview

**Page component:** `SuperAdminDashboard.tsx` (existing) + `MLOverviewWidgets.tsx` (new ML section)  
**Purpose:** Organization-wide executive snapshot with AI action queue, funding gap KPI, and safehouse health leaderboard embedded at the bottom.

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| AI Action Queue Card | `ActionQueueCard` (in `MLOverviewWidgets.tsx`) | `GET /api/superadmin/overview/action-queue` | super_admin |
| Funding Gap KPI + Sparkline | `FundingGapCard` (in `MLOverviewWidgets.tsx`) | `GET /api/superadmin/overview/funding-gap` | super_admin |
| Safehouse Health Leaderboard Mini | `SafehouseHealthMiniCard` (in `MLOverviewWidgets.tsx`) | `GET /api/superadmin/overview/safehouse-health-mini` | super_admin |

**Role visibility:** `super_admin` only  
**Unresolved placeholders:** None

---

### 2. `/superadmin/donors` — Supporter Intelligence (ML)

**Page component:** `MLDonorsPage.tsx` (new, replaces admin DonorsPage for super_admin)  
**Purpose:** AI-powered churn risk, upgrade potential, and donation-to-impact attribution for all supporters.

#### Tab: Churn Risk

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Churn Table (sortable, filterable) | `ChurnTab` | `GET /api/superadmin/donors/churn` | super_admin |
| Donor Detail Drawer (with recent donations) | `ChurnDrawer` | `GET /api/superadmin/donors/:id/donations-recent` | super_admin |
| Action Buttons (Email / Schedule Call) | `ChurnDrawer` + `ChurnTab` | `PATCH /api/superadmin/donors/:id` | super_admin |

**Filters:** `dateRange`, `churnBand`  
**Sort:** `displayName`, `churnRiskScore`, `daysSinceLastDonation`, `totalDonationsPhp`  
**Privacy:** `totalRestricted` shown as privacy banner above table

#### Tab: Upgrade Potential

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Upgrade Board / Table | `UpgradeTab` | `GET /api/superadmin/donors/upgrade` | super_admin |
| Donor Detail Drawer (upgrade signals) | Side drawer in `UpgradeTab` | (inline from list data) | super_admin |
| Mark Not Ready Action | Side drawer | `PATCH /api/superadmin/donors/:id` | super_admin |

**Filters:** `dateRange`, `upgradeBand`

#### Tab: Donation Attribution

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Attribution by Program Bar Chart | `AttributionTab` | `GET /api/superadmin/attribution/programs` | super_admin |
| Program Breakdown Table | `AttributionTab` | `GET /api/superadmin/attribution/programs` | super_admin |
| CSV Export Button | `AttributionTab` | `GET /api/superadmin/attribution/export` | super_admin |

**Filters:** `dateRange`  
**Role visibility:** `super_admin` only (admin must NOT access)  
**Unresolved placeholders:**
- Sankey diagram (`/api/superadmin/attribution/sankey`) fetched but not rendered as Sankey (bar chart used as attribution view instead — Recharts lacks built-in Sankey)

---

### 3. `/superadmin/campaigns` — Campaign Intelligence (ML)

**Page component:** `MLCampaignsPage.tsx` (new, replaces CampaignsManagementPage for super_admin)  
**Purpose:** ML-scored campaign effectiveness and social post conversion planning.

#### Tab: Campaign Effectiveness

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Conversion Ratio Bar Chart (movement vs. noise) | `CampaignEffectivenessTab` | `GET /api/superadmin/campaigns/effectiveness` | super_admin |
| Campaign Table (sortable) | `CampaignEffectivenessTab` | `GET /api/superadmin/campaigns/effectiveness` | super_admin |
| Campaign Detail Drawer | Side drawer | (inline from list) | super_admin |
| Flag Avoid Replicating | Drawer action | `PATCH /api/superadmin/campaigns/:id/ml-flags` | super_admin |

**Filters:** `dateRange`, `category`, `status`

#### Tab: Social Post Planner

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Best Posting Times Heatmap | `SocialPlannerTab` | `GET /api/superadmin/social/heatmap` | super_admin / admin |
| Top Recommendation Card | `SocialPlannerTab` | `GET /api/superadmin/social/recommendation` | super_admin / admin |
| Post-Level Table | `SocialPlannerTab` | `GET /api/superadmin/social/posts` | super_admin / admin |
| Post Detail Drawer (with conversion drivers) | Side drawer | (inline from list) | super_admin / admin |

**Filters:** `dateRange`, `platform`, `conversionBand`  
**Role visibility:** `super_admin` only at the route level  
**Unresolved placeholders:**
- Heatmap uses 8 representative hours (6am–8pm in 2h increments) — all 24h are in data but grid is limited for readability

---

### 4. `/superadmin/residents` — Resident Intelligence (ML)

**Page component:** `MLResidentsPage.tsx` (new, replaces admin ResidentsPage for super_admin)  
**Purpose:** Regression risk, reintegration readiness, intervention effectiveness, and safehouse health with compare mode.

**Privacy banner** displayed at page level — all tabs that show row-level data exclude `ml_scores_restricted = true` residents.

#### Tab: Regression Risk

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Distribution Stacked Bar (per safehouse) | `RegressionTab` | `GET /api/superadmin/residents/regression/distribution` | super_admin / admin |
| Regression Watchlist Table | `RegressionTab` | `GET /api/superadmin/residents/regression/watchlist` | super_admin / admin |
| Resident Detail Drawer | Side drawer | (inline from list) | super_admin |
| Flag Urgent Action | Watchlist row + drawer | `PATCH /api/superadmin/residents/:id` | super_admin |

**Filters:** `safehouseId`, `regressionRiskBand`  
**Privacy:** Restricted residents excluded from watchlist; `totalRestricted` shown in banner

#### Tab: Reintegration Readiness

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Funnel Chart | `ReintegrationTab` | `GET /api/superadmin/residents/reintegration/funnel` | super_admin / admin |
| Readiness Distribution Panel | `ReintegrationTab` | (same as funnel) | super_admin / admin |
| Ranked Readiness Table | `ReintegrationTab` | `GET /api/superadmin/residents/reintegration/table` | super_admin / admin |
| Resident Detail Drawer (drivers + barriers) | Side drawer | (inline from list) | super_admin |
| Reintegration Action Buttons | Drawer | `PATCH /api/superadmin/residents/:id` | super_admin |

**Filters:** `dateRange`, `reintegrationReadinessBand`  
**Privacy:** Restricted residents excluded from table; `totalRestricted` shown in banner

#### Tab: Intervention Effectiveness

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Effectiveness Matrix Table (per category) | `InterventionTab` | `GET /api/superadmin/interventions/effectiveness` | super_admin / admin |
| Plan Drilldown (click-to-expand row) | `InterventionTab` | `GET /api/superadmin/interventions/effectiveness/:category/plans` | super_admin / admin |

**Filters:** None at UI level (endpoint supports `planCategory`, `safehouseId`, `dateRange`, `effectivenessBand`)  
**Unresolved placeholders:** Advanced filters for interventions tab (UI filter controls not yet built; can be added)

#### Tab: Safehouse Health

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Safehouse Health Cards (leaderboard) | `SafehousesTab` | `GET /api/superadmin/safehouses/health` | super_admin / admin |
| Health History Trend Chart | `SafehousesTab` | `GET /api/superadmin/safehouses/:id/health-history` | super_admin / admin |
| Compare Mode (multi-select, side-by-side table) | `SafehousesTab` | `GET /api/superadmin/safehouses/health/compare` | super_admin / admin |

**Role visibility:** `super_admin` only at the route level  
**Compare mode:** Select up to 3 safehouses; compare button toggles mode

---

### 5. `/superadmin/ml` — ML Control Center (Model Ops)

**Page component:** `MLModelOpsPage.tsx` (new, replaces legacy MLDashboard.tsx)  
**Purpose:** Pipeline health, freshness monitoring, score/band distributions, and feature importance.

| Widget | Component | Endpoint | Role |
|---|---|---|---|
| Pipeline KPI Row (Total, Fresh, Stale, Scored) | `MLModelOpsPage` | `GET /api/superadmin/ml/pipelines` | super_admin |
| Pipeline Status Table (click to inspect) | `PipelineStatusPanel` | `GET /api/superadmin/ml/pipelines` | super_admin |
| Freshness Monitor | `FreshnessMonitor` | (same as above) | super_admin |
| Score Distribution Histogram | `ScoreDistributionPanel` | `GET /api/superadmin/ml/score-distribution?pipelineName=` | super_admin |
| Band Label Distribution | `BandDistributionPanel` | `GET /api/superadmin/ml/band-distribution?pipelineName=` | super_admin |
| Feature Importance Panel | `FeatureImportancePanel` | `GET /api/superadmin/ml/feature-importance/:runId` | super_admin |

**Filters:** `freshness` (pipeline filter)  
**Interaction:** Click a pipeline row to reveal Score Distribution, Band Distribution, and Feature Importance panels below  
**Role visibility:** `super_admin` only  
**Unresolved placeholders:**
- "Trigger Pipeline Run" button not implemented (action workflow out of scope)
- Real-time streaming pipeline status not implemented (polling with `staleTime: 30_000`)

---

## Files Created

| File | Purpose |
|---|---|
| `artifacts/beacon/src/services/superadminMl.service.ts` | All TanStack Query hooks and TypeScript interfaces for 30+ ML endpoints |
| `artifacts/beacon/src/pages/superadmin/ml/Shared.tsx` | Shared components: BandBadge, ScoreBar, LoadingState, ErrorState, EmptyState, PrivacyBanner, SectionHeader, Card, TabBar, DateRangeSelector, FilterSelect, SideDrawer, Pagination, ActionButton |
| `artifacts/beacon/src/pages/superadmin/MLOverviewWidgets.tsx` | Three ML overview widgets: ActionQueueCard, FundingGapCard, SafehouseHealthMiniCard, MLOverviewSection |
| `artifacts/beacon/src/pages/superadmin/MLDonorsPage.tsx` | Donor Intelligence page — Churn Risk, Upgrade Potential, Attribution tabs |
| `artifacts/beacon/src/pages/superadmin/MLCampaignsPage.tsx` | Campaign Intelligence page — Effectiveness and Social Planner tabs |
| `artifacts/beacon/src/pages/superadmin/MLResidentsPage.tsx` | Resident Intelligence page — Regression, Reintegration, Interventions, Safehouses tabs |
| `artifacts/beacon/src/pages/superadmin/MLModelOpsPage.tsx` | ML Control Center — Pipeline status, freshness, score/band distribution, feature importance |
| `SUPER_ADMIN_ML_FRONTEND_MAP.md` | This document |

## Files Modified

| File | Change |
|---|---|
| `artifacts/beacon/src/App.tsx` | Added imports for 4 new ML pages; updated routes for `/superadmin/ml`, `/superadmin/donors`, `/superadmin/campaigns`, `/superadmin/residents` |
| `artifacts/beacon/src/pages/superadmin/SuperAdminDashboard.tsx` | Added `MLOverviewSection` import and render at bottom of executive dashboard |

## Route Guards

All super admin ML routes use:
```tsx
<ProtectedRoute roles={["super_admin"]}>
```

Admin-role users are redirected to `/forbidden`. Donors are redirected to `/donor`. The ML service endpoints independently enforce role-based access on the backend (returning 403 for non-super_admin requests on sensitive endpoints).

## Unresolved Placeholders Summary

| Placeholder | Reason |
|---|---|
| Sankey flow diagram for donation attribution | Recharts has no built-in Sankey; would require a third-party library (e.g. d3-sankey) |
| Campaign management CRUD (create/edit/delete) | CampaignsManagementPage now replaced for super_admin — accessible at its original import path if needed |
| "Trigger Pipeline Run" action | Email/workflow action system out of scope per task spec |
| Post sharing / social scheduling | Out of scope per task spec |
| Advanced intervention filters (category, safehouse, date) | UI filter controls not wired; endpoint supports them |
| Export buttons for residents and campaigns | Only attribution export wired; others are UI stubs |
