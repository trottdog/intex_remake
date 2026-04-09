# Beacon — Super Admin ML Feature Plan

**Platform:** Beacon Nonprofit Management System  
**Context:** Philippines-based safehouse network for survivors of trafficking, abuse, child labor, and neglect  
**Audience for this document:** IS 413 (Information Systems), IS 414 (Security), IS 455 (Machine Learning) course requirements  
**Status:** Planning only — no code, migrations, or schema changes are produced here  
**Date:** April 2026

---

## Table of Contents

1. [Super Admin ML Feature Inventory](#1-super-admin-ml-feature-inventory)
2. [Super Admin Dashboard Information Architecture](#2-super-admin-dashboard-information-architecture)
3. [Visualization Plan](#3-visualization-plan)
4. [Pipeline-by-Pipeline Technical Planning](#4-pipeline-by-pipeline-technical-planning)
5. [Role-Aware Display and Privacy Matrix](#5-role-aware-display-and-privacy-matrix)
6. [Recommended Future Additive Columns](#6-recommended-future-additive-columns)
7. [Implementation Order](#7-implementation-order)
8. [Risks and Validation Plan](#8-risks-and-validation-plan)

[Recommended First 3 Features to Build Now](#recommended-first-3-super-admin-ml-features-to-build-now)

---

## 1. Super Admin ML Feature Inventory

### 1.1 Donor Churn Risk

| Field | Detail |
|---|---|
| **Feature name** | Donor Churn Risk |
| **Business problem solved** | The organization has no early warning when a previously active donor is drifting toward lapsing. Without intervention, donors silently stop giving and are expensive to re-acquire. |
| **Primary user decision enabled** | Which donors should receive a personalized re-engagement message this week — before they lapse — and through which channel? |
| **Main source tables** | `supporters` (status, firstDonationDate, acquisitionChannel, recurringEnabled), `donations` (donationDate, amount, isRecurring, channelSource, campaignId), `donation_allocations` (programArea) |
| **ML type** | Predictive (binary classification: will this donor make no donation in the next 90 days?) |
| **Appears at safehouse admin level?** | No — admins do not manage donors. Super admin only. |

---

### 1.2 Donor Upgrade Likelihood

| Field | Detail |
|---|---|
| **Feature name** | Donor Upgrade Likelihood |
| **Business problem solved** | The organization treats all active donors the same, leaving revenue on the table from mid-tier donors who are ready to give more but never asked. |
| **Primary user decision enabled** | Which donors should receive a targeted upgrade ask (e.g., increase recurring amount, or convert one-time to recurring), and what amount is a realistic target? |
| **Main source tables** | `supporters` (supporterType, recurringEnabled, acquisitionChannel, region), `donations` (amount, isRecurring, donationDate, donationType, channelSource, campaignId), `donation_allocations` (programArea, amountAllocated) |
| **ML type** | Ranking + Predictive (score each active donor on probability of upgrading if asked) |
| **Appears at safehouse admin level?** | No — donor strategy is a super-admin function. |

---

### 1.3 Campaign Effectiveness / Movement vs. Noise

| Field | Detail |
|---|---|
| **Feature name** | Campaign Effectiveness — Movement vs. Noise |
| **Business problem solved** | Some fundraising campaigns generate high social engagement (likes, shares) but minimal actual donations. Super admin needs to distinguish signal from noise to allocate future campaign budget. |
| **Primary user decision enabled** | Which campaigns drove measurable donation lift, and which should not be repeated? Which campaign type, channel, and content mix produces the best ROI? |
| **Main source tables** | `campaigns` (title, category, goal, deadline, status), `donations` (campaignId, campaignName, amount, donationDate, channelSource, referralPostId), `social_media_posts` (campaignName, impressions, reach, engagementRate, donationReferrals, estimatedDonationValuePhp, isBoosted, boostBudgetPhp) |
| **ML type** | Attribution + Explanatory |
| **Appears at safehouse admin level?** | Partially — admin can see which campaigns raised funds for their specific safehouse (via `donations.safehouseId`), but cross-campaign comparison and budget attribution is super admin only. |

---

### 1.4 Social Post Conversion Prediction

| Field | Detail |
|---|---|
| **Feature name** | Social Post Conversion Prediction |
| **Business problem solved** | The social media manager has no guidance on what to post, when to post it, and whether it will generate donations vs. only vanity engagement. |
| **Primary user decision enabled** | Before publishing a post, predict whether its content format, timing, and platform combination is likely to produce donation referrals. Recommend the highest-converting combination for the current campaign. |
| **Main source tables** | `social_media_posts` (platform, dayOfWeek, postHour, postType, mediaType, contentTopic, sentimentTone, captionLength, hasCallToAction, callToActionType, featuresResidentStory, isBoosted, boostBudgetPhp, impressions, reach, likes, shares, saves, clickThroughs, engagementRate, donationReferrals, estimatedDonationValuePhp), `donations` (referralPostId, amount) |
| **ML type** | Predictive (regression on `donationReferrals` and `estimatedDonationValuePhp` as target; classification on "will this post produce at least 1 referral?") |
| **Appears at safehouse admin level?** | No — social media strategy is run at the super admin level. Admins do not manage social channels. |

---

### 1.5 Donation-to-Impact Attribution

| Field | Detail |
|---|---|
| **Feature name** | Donation-to-Impact Attribution |
| **Business problem solved** | Donors cannot see how their generosity actually affects residents. Without this story, mid-to-long-term donor retention drops. The organization also cannot justify continuing to fund specific program areas without showing outcome evidence. |
| **Primary user decision enabled** | For each major donor or cohort, show which program areas their funds went to and correlate those allocations with measurable resident outcomes — enabling both donor reporting and internal program evaluation. |
| **Main source tables** | `donations` (supporterId, amount, donationDate, safehouseId, campaignId, referralPostId), `donation_allocations` (donationId, safehouseId, programArea, amountAllocated, allocationDate), `residents` (safehouseId, caseStatus, currentRiskLevel, reintegrationStatus), `health_wellbeing_records` (generalHealthScore, nutritionScore, psychologicalCheckupDone), `education_records` (progressPercent, attendanceRate, completionStatus), `process_recordings` (progressNoted, concernsFlagged), `public_impact_snapshots` (snapshotDate, headline, metricPayloadJson) |
| **ML type** | Attribution (causal-style: connect program area funding amounts to measurable outcome changes in that safehouse over aligned time windows) |
| **Appears at safehouse admin level?** | Partially — admins see the attribution for their own safehouse only. Cross-safehouse comparison is super admin only. |

---

### 1.6 Resident Regression Risk

| Field | Detail |
|---|---|
| **Feature name** | Resident Regression Risk |
| **Business problem solved** | Social workers and super admin need to identify which residents are showing signs of regression (emotional deterioration, health decline, increased incidents) before they reach a crisis point. Manual observation is inconsistent across a network of safehouses. |
| **Primary user decision enabled** | Which residents should be prioritized for intervention review in the next case conference? Which safehouse has the highest concentration of at-risk residents right now? |
| **Main source tables** | `residents` (caseStatus, currentRiskLevel, initialRiskLevel, dateOfAdmission, caseCategory, subCatOrphaned, subCatTrafficked, subCatChildLabor, subCatPhysicalAbuse, subCatSexualAbuse, subCatOsaec, subCatCicl, subCatAtRisk, subCatStreetChild, subCatChildWithHiv, isPwd, hasSpecialNeeds), `process_recordings` (emotionalStateObserved, emotionalStateEnd, progressNoted, concernsFlagged, sessionType), `health_wellbeing_records` (generalHealthScore, nutritionScore, sleepQualityScore, energyLevelScore, psychologicalCheckupDone), `education_records` (attendanceRate, progressPercent, enrollmentStatus), `incident_reports` (incidentType, severity, status, followUpRequired), `intervention_plans` (status, planCategory, targetDate) |
| **ML type** | Predictive (classification: elevated regression risk within 30 days) |
| **Appears at safehouse admin level?** | Yes — admin and staff see their own safehouse's at-risk residents. Super admin sees org-wide aggregated and per-safehouse drilldown. |

---

### 1.7 Reintegration Readiness

| Field | Detail |
|---|---|
| **Feature name** | Reintegration Readiness |
| **Business problem solved** | Deciding when a resident is ready to leave the safehouse and reintegrate with family or community is a high-stakes judgment made by social workers, but it is inconsistent and influenced by caseload pressures. An ML signal can surface objective readiness indicators to support (not replace) that judgment. |
| **Primary user decision enabled** | Which residents have objective indicators aligned with past successful reintegrations? Which residents should be scheduled for reintegration planning in the next case conference? |
| **Main source tables** | `residents` (reintegrationType, reintegrationStatus, currentRiskLevel, dateOfAdmission, lengthOfStay, caseCategory, subCatOrphaned, subCatTrafficked, subCatChildLabor, subCatPhysicalAbuse, subCatSexualAbuse, subCatOsaec, subCatCicl, subCatAtRisk, subCatStreetChild, subCatChildWithHiv, isPwd, hasSpecialNeeds), `process_recordings` (progressNoted, concernsFlagged, emotionalStateEnd, sessionType), `health_wellbeing_records` (generalHealthScore, nutritionScore, sleepQualityScore, psychologicalCheckupDone), `education_records` (progressPercent, attendanceRate, completionStatus, enrollmentStatus), `home_visitations` (familyCooperationLevel, safetyConcernsNoted, visitOutcome, followUpNeeded), `intervention_plans` (status, planCategory, servicesProvided) |
| **ML type** | Predictive (classification: likelihood of meeting reintegration criteria within 60 days, trained on historical residents who successfully reintegrated) |
| **Appears at safehouse admin level?** | Yes — admins and social workers use this for case conference planning in their safehouse. Super admin sees org-wide readiness concentration. |

---

### 1.8 Intervention Effectiveness

| Field | Detail |
|---|---|
| **Feature name** | Intervention Effectiveness |
| **Business problem solved** | The organization deploys multiple types of interventions (psychological, educational, health, family-based) but has no systematic way to know which ones actually move residents toward positive outcomes. |
| **Primary user decision enabled** | Which plan categories and services provided have the strongest statistical association with improvements in health scores, emotional state, and reintegration success? Which interventions should be standardized across all safehouses? |
| **Main source tables** | `intervention_plans` (planCategory, planDescription, servicesProvided, status, targetDate, createdAt, updatedAt), `process_recordings` (interventionsApplied, progressNoted, concernsFlagged, emotionalStateObserved, emotionalStateEnd), `health_wellbeing_records` (generalHealthScore, nutritionScore, sleepQualityScore, energyLevelScore, recordDate), `education_records` (progressPercent, attendanceRate, completionStatus, recordDate), `residents` (caseStatus, reintegrationStatus, currentRiskLevel) |
| **ML type** | Explanatory + Ranking (which `planCategory` × `servicesProvided` combinations predict positive `progressNoted` and health/education score improvement?) |
| **Appears at safehouse admin level?** | Yes — admins benefit from knowing which intervention types are most effective for residents in their safehouse. Super admin sees cross-safehouse effectiveness rankings. |

---

### 1.9 Safehouse Health Score and Risk Comparison

| Field | Detail |
|---|---|
| **Feature name** | Safehouse Health Score and Risk Comparison |
| **Business problem solved** | Super admin has no systematic way to compare safehouse performance across the network, identify safehouses that are trending in the wrong direction, or allocate oversight resources appropriately. |
| **Primary user decision enabled** | Which safehouses need urgent attention from leadership? Which safehouses are models of good practice that should be benchmarked? How should next quarter's operational and financial resources be allocated across the network? |
| **Main source tables** | `safehouse_monthly_metrics` (safehouseId, monthStart, activeResidents, avgEducationProgress, avgHealthScore, processRecordingCount, homeVisitationCount, incidentCount), `residents` (safehouseId, caseStatus, currentRiskLevel), `incident_reports` (safehouseId, severity, status), `intervention_plans` (residentId, status), `ml_prediction_snapshots` (safehouseId, pipelineName, predictionScore) |
| **ML type** | Ranking + Forecasting (composite health score per safehouse, trend forecast) |
| **Appears at safehouse admin level?** | No — admins see their own safehouse metrics but do not see the comparative ranking. Cross-safehouse comparison is super admin only. |

---

### 1.10 Org-wide Funding Pressure / Donation Gap Forecasting

| Field | Detail |
|---|---|
| **Feature name** | Org-wide Funding Pressure and Donation Gap Forecasting |
| **Business problem solved** | The organization cannot see upcoming funding gaps before they become operational crises. Campaign planning and donor outreach are reactive rather than proactive. |
| **Primary user decision enabled** | Is the organization on track to meet funding targets for the next 30/60/90 days? If not, which donor segments or campaign types should be activated now to close the gap? |
| **Main source tables** | `donations` (donationDate, amount, isRecurring, safehouseId, campaignId), `supporters` (status, recurringEnabled, firstDonationDate, acquisitionChannel), `campaigns` (goal, deadline, status, category), `donation_allocations` (programArea, amountAllocated, allocationDate), `safehouse_monthly_metrics` (monthStart, activeResidents) |
| **ML type** | Forecasting (time-series: predicted donation volume for the next 3 months based on historical patterns, recurring commitments, and campaign pipeline) |
| **Appears at safehouse admin level?** | No — org-wide funding is a super admin responsibility. Admins see only their safehouse's allocated funds. |

---

## 2. Super Admin Dashboard Information Architecture

### 2.1 Top-Level Navigation

The super admin portal has six top-level sections, accessible from the persistent left sidebar:

1. **Overview** — Executive dashboard (landing page)
2. **Donors** — Donor intelligence, churn, upgrade, attribution
3. **Campaigns & Social** — Campaign effectiveness, social conversion
4. **Residents & Safehouses** — Resident risk, readiness, safehouse health
5. **Model Operations** — Pipeline health, prediction freshness
6. **Settings & Admin** — User management, safehouse config, role assignments

### 2.2 Global Filters (Persistent Across All Sections)

- **Safehouse selector** — "All Safehouses" (default) or single safehouse drill-in
- **Date range** — Last 30 / 90 / 6 months / 12 months / custom
- **Compare toggle** — Period-over-period comparison (e.g., Q1 2026 vs Q1 2025)

### 2.3 Main Landing Page (Overview)

The super admin lands on a single-screen executive overview. Modules load in order of urgency:

| Row | Module | Data source |
|---|---|---|
| Row 1 — Alerts | Action queue: donors at churn risk (count + top 3), residents flagged as regression risk (count), safehouses rated "at risk" (count) | `ml_prediction_snapshots` |
| Row 2 — Funding | Funding gap KPI: projected vs. target for next 60 days; trend sparkline for last 12 months | `donations`, `campaigns` |
| Row 3 — Donors | Donor health summary: active, at-risk of churn, upgraded this period | `supporters`, `donations` |
| Row 4 — Residents | Org-wide resident risk distribution (pie: low / medium / high), reintegration pipeline count | `residents`, `ml_prediction_snapshots` |
| Row 5 — Safehouses | Safehouse health leaderboard (ranked list of all safehouses, color-coded by composite score) | `safehouse_monthly_metrics` |
| Row 6 — Social | Best-performing post this month + predicted top content format for next campaign | `social_media_posts` |

### 2.4 Donor Analytics Page

**Sections:**
- Churn Risk Action Queue — ranked table of at-risk donors with risk score, last donation date, and "Send outreach" action
- Upgrade Likelihood Panel — ranked donor list with upgrade score and suggested ask amount
- Donor Cohort Trends — area chart of new, active, lapsed, and reactivated donors over 12 months
- Attribution Explorer — which donors funded which program areas; Sankey flow from supporter → donation_allocations → programArea → resident outcomes
- Donor Profile Side Drawer — click any donor row to open a panel showing their full history (all donations, allocation trail, ML score + explanation)

**Drilldowns:** Donor profile → individual donation history → campaign linkage → social referral linkage

**Filters:** Donor type (individual / corporate / partner), acquisition channel, region, donation frequency, safehouse preference, risk band

### 2.5 Campaign and Social Media Analytics Page

**Sections:**
- Campaign Leaderboard — table of all campaigns sorted by donation conversion ratio (total raised / goal), with "movement vs. noise" badge
- Campaign vs. Social Overlay — dual-axis chart: campaign donation inflow (bar) overlaid with social engagement rate (line) per campaign period
- Social Post Conversion Heatmap — heatmap of day_of_week × post_hour vs. average donationReferrals
- Platform Comparison — side-by-side KPI cards per platform: total referrals, estimated donation value, engagement-to-conversion ratio
- Post-Level Drilldown Table — sortable list of all posts with conversion prediction score, actual donationReferrals, and recommended re-use / avoid flags

**Drilldowns:** Campaign → post-level → individual donation records linked via `donations.referralPostId`

**Filters:** Platform, postType, mediaType, contentTopic, isBoosted, campaignName

### 2.6 Resident and Safehouse Intelligence Page

**Sections:**
- Resident Risk Overview — org-wide risk distribution (stacked bar per safehouse); click to drill into safehouse
- Regression Risk Watchlist — ranked table of highest-risk residents (anonymized at org level; named within safehouse drilldown), with top risk drivers
- Reintegration Pipeline — funnel: Assessed → Eligible → In Planning → Reintegrated, per safehouse
- Intervention Effectiveness Matrix — table of planCategory × servicesProvided ranked by average outcome improvement score
- Safehouse Health Leaderboard — ranked list of all safehouses with composite score, trend arrow, and incident count

**Drilldowns:** Safehouse row → safehouse detail page (metrics, residents, interventions) → resident profile (admin/super admin only)

**Filters:** Safehouse, caseCategory, currentRiskLevel, reintegrationStatus, planCategory

**Compare view:** Select two safehouses → side-by-side metric comparison panel

### 2.7 Model Operations / Model Health Page

**Sections:**
- Pipeline Status Table — one row per `ml_pipeline_runs.pipelineName`: last run time, status, model name, data source, and model metrics (from `metricsJson`)
- Prediction Freshness Monitor — for each pipeline, days since last successful `ml_prediction_snapshots` insert; red flag if > threshold
- Score Distribution Charts — histogram of `predictionScore` by `entityType` for each pipeline (to detect model drift or score collapse)
- Model Manifest Viewer — expandable JSON view of `manifestJson` for any pipeline run

**Filters:** pipelineName, status, trainedAt date range

### 2.8 Saved Views

Super admin can save any filter combination (safehouse + date + feature filters) as a named view accessible from a dropdown. Saved views persist to `localStorage` in Phase 1. In Phase 2, persistence would require an additive `user_saved_views` column or a new table — that is a future schema decision outside this planning document's scope.

### 2.9 Cross-Safehouse Comparison Behavior

- Default mode is **aggregate** (all safehouses combined)
- Selecting one safehouse from the global filter switches to **per-safehouse** mode; all charts, KPIs, and tables update to that safehouse's data
- A **compare** toggle allows selecting two safehouses and rendering a split-panel comparison on any page
- Org-wide ML scores (churn risk, safehouse health) always derive from the full dataset; per-safehouse scores derive from the subset filtered to that `safehouseId`

---

## 3. Visualization Plan

### 3.1 Donor Churn Risk

| Attribute | Specification |
|---|---|
| **Widget type** | Ranked action-queue table + summary KPI card |
| **Why this type** | Churn risk requires immediate triage. A ranked table surfaces the most urgent donors first and is directly actionable. A KPI card communicates the magnitude of the problem. |
| **5-second read** | "12 donors are at high churn risk this week. The top 3 have not donated in over 6 months." |
| **On click** | Opens side drawer with: last 5 donations (amounts, dates, channels), churn score (0–1), top 3 risk drivers (e.g., "no Q4 donation", "campaign engagement dropped 80%", "recurring lapsed"), and "Send outreach" button |
| **Available drilldowns** | Donor full history, donation timeline, campaign participation, social referral linkage |
| **Filters** | Risk band (high/medium/low), acquisition channel, region, donor type, safehouse preference, date of last donation |
| **Direct actions** | "Send outreach email", "Flag for personal call", "Mark as handled this week" |

---

### 3.2 Donor Upgrade Likelihood

| Attribute | Specification |
|---|---|
| **Widget type** | Ranked table with upgrade score and suggested ask band |
| **Why this type** | Upgrade decisions are one-to-one; a ranked list with suggested next action is more useful than an aggregate chart. |
| **5-second read** | "8 donors have an upgrade score above 0.75. The top candidate last gave ₱2,000 and their model suggests asking for ₱3,500." |
| **On click** | Drawer with full donation history, top upgrade drivers (e.g., "3 consecutive on-time recurring donations", "clicked through 2 campaigns"), suggested ask script |
| **Available drilldowns** | Individual donation history, peer comparison (similar donors who upgraded) |
| **Filters** | Score threshold slider, minimum donation amount, donor type, acquisition channel |
| **Direct actions** | "Generate upgrade ask email", "Schedule call", "Mark as not a candidate" |

---

### 3.3 Campaign Effectiveness / Movement vs. Noise

| Attribute | Specification |
|---|---|
| **Widget type** | Scatter plot (engagement rate on X, donation conversion rate on Y) + campaign leaderboard table |
| **Why this type** | A scatter plot immediately separates campaigns that generate both engagement and donations (top-right) from "noise" campaigns (high engagement, low conversion, top-left). The quadrant framing is intuitive to non-technical managers. |
| **5-second read** | "Campaign X is in the top-right quadrant — it drove both engagement and donations. Campaign Y drove high impressions but zero donation conversion." |
| **On click** | Campaign detail panel: timeline of social posts, donation inflow curve, top referral posts, goal vs. actual raised, conversion rate breakdown by channel |
| **Available drilldowns** | Individual post performance within campaign, donor records linked to campaign donations |
| **Filters** | Campaign category, status, date range, platform, isBoosted |
| **Direct actions** | "Replicate this campaign", "Archive campaign", "Create follow-on campaign" |

---

### 3.4 Social Post Conversion Prediction

| Attribute | Specification |
|---|---|
| **Widget type** | Heatmap (day_of_week × post_hour, colored by average donationReferrals) + "best next post" recommendation card |
| **Why this type** | A heatmap reveals the optimal posting window at a glance without requiring the user to read a table. The recommendation card translates the model's output into a single actionable suggestion. |
| **5-second read** | "Tuesday and Thursday at 8–10 PM produce 3× more donation referrals than any other time. Reels with a call-to-action outperform static posts by 5×." |
| **On click** | Opens post composition advisor: select platform, contentTopic, and mediaType; model returns predicted conversion score and historical comparables |
| **Available drilldowns** | Individual post record → actual vs. predicted referrals, linked donation records |
| **Filters** | Platform, mediaType, postType, contentTopic, isBoosted, date range |
| **Direct actions** | "Schedule post for recommended time", "Boost recommended post", "Export posting calendar" |

---

### 3.5 Donation-to-Impact Attribution

| Attribute | Specification |
|---|---|
| **Widget type** | Sankey diagram (donor cohort → campaign → programArea → safehouse → outcome metric) + KPI cards per program area |
| **Why this type** | A Sankey shows the full money flow from source to impact in one view without losing the proportional magnitude. KPI cards give the quantitative outcome for each endpoint. |
| **5-second read** | "₱850,000 raised this quarter flowed to three program areas. 'Education' funding correlates with a 12% improvement in average attendance rate across the funded safehouses." |
| **On click** | Clicking a flow segment filters the view to show only that donor cohort → program area pair, with matched outcome timelines |
| **Available drilldowns** | Program area → safehouse → individual allocation record; Outcome metric → resident aggregate (anonymized for donor-facing, named for super admin) |
| **Filters** | Program area, safehouse, campaign, date window, donation type |
| **Direct actions** | "Generate donor impact report", "Export for annual report", "Schedule automated donor email with this summary" |

---

### 3.6 Resident Regression Risk

| Attribute | Specification |
|---|---|
| **Widget type** | Risk distribution stacked bar (per safehouse) + ranked watchlist table (inside safehouse drilldown) |
| **Why this type** | At org level, the stacked bar shows which safehouses have the highest concentration of risk. Inside a safehouse, a ranked list gives social workers and admins the prioritized view they need for case conferences. |
| **5-second read** | "Safehouse B has 4 residents flagged as high regression risk this month, up from 1 last month." |
| **On click** | Opens safehouse regression detail: risk score trend per resident (anonymized ID only at super admin level), top driving signals (e.g., "3 consecutive sessions with concernsFlagged=true", "health score dropped 20 points over 6 weeks") |
| **Available drilldowns** | Safehouse → resident risk timeline (named only within admin/super admin safehouse context) → individual session records |
| **Filters** | Safehouse, caseCategory, currentRiskLevel, risk score threshold, date window |
| **Direct actions** | "Flag for urgent case conference", "Assign additional social worker", "Export risk watchlist for review" |

---

### 3.7 Reintegration Readiness

| Attribute | Specification |
|---|---|
| **Widget type** | Funnel chart (Assessed → Eligible → In Planning → Reintegrated) + ranked readiness table inside safehouse view |
| **Why this type** | A funnel shows where the bottleneck is in the reintegration pipeline across the org. The ranked table helps social workers use the score as a discussion aid in case conferences. |
| **5-second read** | "14 residents are assessed as eligible for reintegration. Only 3 are currently in an active reintegration plan. There is a planning bottleneck." |
| **On click** | Opens resident readiness panel (code only at org level): readiness score, key positive indicators (e.g., "family cooperation level = high on last 3 visits", "no incidents in 90 days", "education completionStatus = completed"), and key barriers |
| **Available drilldowns** | Safehouse funnel stage → individual resident (admin/super admin) → home visitation and intervention plan history |
| **Filters** | Safehouse, reintegrationType, currentRiskLevel, lengthOfStay, date window |
| **Direct actions** | "Schedule reintegration case conference", "Assign reintegration social worker", "Mark readiness reviewed" |

---

### 3.8 Intervention Effectiveness

| Attribute | Specification |
|---|---|
| **Widget type** | Ranked heatmap table (planCategory × servicesProvided) colored by average outcome improvement score |
| **Why this type** | A heatmap table reveals which combinations of intervention category and services produce the best results across multiple outcome dimensions simultaneously. A bar chart would show only one outcome at a time. |
| **5-second read** | "Psychological + trauma-informed care interventions correlate with a 28% improvement in general health scores. Educational + vocational interventions correlate with a 35% improvement in attendance rate." |
| **On click** | Opens intervention detail: list of residents who received that intervention type, before/after outcome scores (anonymized IDs), completion rate, and average time to target |
| **Available drilldowns** | Intervention type → safehouse breakdown → individual plan records |
| **Filters** | planCategory, servicesProvided keyword, status, safehouse, date range |
| **Direct actions** | "Mark as standard practice", "Share with all safehouse admins", "Create new intervention plan template" |

---

### 3.9 Safehouse Health Score and Risk Comparison

| Attribute | Specification |
|---|---|
| **Widget type** | Ranked leaderboard table with trend arrows + radar chart for selected safehouse comparison |
| **Why this type** | The leaderboard gives an immediate ranked view. The radar chart enables two-safehouse comparison across multiple dimensions simultaneously (health, education, incidents, process engagement, reintegration rate) without needing five separate charts. |
| **5-second read** | "Safehouse A ranks 1st across the network on all metrics. Safehouse C has declined 3 positions since last quarter — incident count is the primary driver." |
| **On click** | Opens safehouse detail: 12-month metric trends for each safehouse_monthly_metrics dimension, resident roster summary (counts only), ML health score history, top drivers of score change |
| **Available drilldowns** | Safehouse → monthly metrics timeline → incident breakdown → resident risk distribution |
| **Filters** | Date range, metric dimension, status (active/closed safehouses) |
| **Direct actions** | "Flag for leadership review", "Compare with another safehouse", "Export quarterly safehouse report" |

---

### 3.10 Org-wide Funding Pressure / Donation Gap Forecasting

| Attribute | Specification |
|---|---|
| **Widget type** | Gauge chart (current vs. projected 90-day target) + trend line forecast (actual donations + 3-month projection with confidence band) |
| **Why this type** | A gauge communicates urgency immediately. The forecast line with confidence band sets realistic expectations and shows the uncertainty range for planning purposes. |
| **5-second read** | "You are projected to reach 67% of your 90-day funding target. The gap is ₱320,000. Activating 3 lapsed recurring donors and running one additional campaign could close it." |
| **On click** | Opens funding pressure detail: breakdown by donation type (recurring vs. one-time), campaign pipeline, at-risk recurring donors whose lapse would worsen the gap |
| **Available drilldowns** | Projection breakdown by safehouse, by campaign, by donor cohort |
| **Filters** | Date window, safehouse, donation type, campaign |
| **Direct actions** | "Generate emergency outreach list", "Launch quick campaign", "Export funding forecast for board report" |

---

## 4. Pipeline-by-Pipeline Technical Planning

### Central Inference Architecture

Both `ml_pipeline_runs` and `ml_prediction_snapshots` are already present and designed to serve as the universal inference store.

**How they work together:**
- Every ML pipeline run writes one row to `ml_pipeline_runs` with metadata (pipelineName, modelName, metricsJson, manifestJson, trainedAt)
- After each run, the pipeline writes one row per scored entity to `ml_prediction_snapshots` (entityType, entityId, entityKey, predictionScore, rankOrder, contextJson)
- The UI reads from `ml_prediction_snapshots` filtered by `pipelineName` and joins to the appropriate entity table (supporters, residents, campaigns, etc.) using `entityId`
- `contextJson` stores explanation fields (top drivers, feature values, confidence bands) as structured JSON, readable by the UI without additional joins
- `safehouseId` in `ml_prediction_snapshots` allows safehouse-filtered queries at the API layer without joining the entity table first

All 10 pipelines write to this shared store. The `pipelineName` column distinguishes their predictions.

---

### 4.1 Donor Churn Risk Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Probability score (0–1) that supporter will make no donation in the next 90 days |
| **Business framing** | "Will this donor lapse in the next quarter if we do not contact them?" |
| **Grain** | One row per active `supporters` record |
| **Label / target variable** | Binary: did the supporter make zero donations in the 90 days following the training cutoff date? Derived from `donations.donationDate` relative to a rolling cutoff. |
| **Source features** | `supporters`: status, acquisitionChannel, recurringEnabled, firstDonationDate, region; `donations` (aggregated per supporter): count of donations in last 30/60/90/180 days, total amount, days since last donation, average inter-donation gap, isRecurring flag, channelSource distribution, number of distinct campaigns donated to |
| **Refresh cadence** | Weekly (every Monday) |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="donor_churn_risk", entityType="supporter", entityId=supporterId). `contextJson` stores: top 3 risk driver names and values, days_since_last_donation, count_last_90d, avg_amount |
| **UI explanation fields** | "Last donation: 143 days ago", "Recurring lapsed 60 days ago", "Engagement with last 2 campaigns: 0%" |
| **Confidence / caveats** | Class imbalance likely (most donors are not churning). Must use class-weight balancing or SMOTE. Sparse data for new donors (< 3 donations) — cap confidence for supporters created within 90 days. Model should not score inactive/closed supporters. |

---

### 4.2 Donor Upgrade Likelihood Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Probability score (0–1) that supporter will increase donation amount if targeted with an upgrade ask |
| **Business framing** | "Which donors are ready to give more, and how much?" |
| **Grain** | One row per active `supporters` record with at least 2 historical donations |
| **Label / target variable** | Binary: did the supporter's average donation amount increase by ≥25% in the 90 days following a targeted campaign? (Requires historical campaign tagging.) Alternatively, label = did they move from one-time to recurring within 6 months? |
| **Source features** | `supporters`: recurringEnabled, acquisitionChannel, supporterType; `donations` (aggregated): average amount per quarter, trend in amount (increasing/flat/decreasing), frequency of giving, number of distinct programAreas donated to, response rate to campaigns, time since last amount increase |
| **Refresh cadence** | Monthly |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="donor_upgrade_likelihood", entityType="supporter"). `contextJson`: upgrade_score, suggested_ask_band (e.g., "₱3,000–₱4,500"), top_upgrade_drivers |
| **UI explanation fields** | "3 consecutive on-time recurring donations", "Donation amount grew 40% over 12 months", "Responded to 2 of last 3 campaign emails" |
| **Confidence / caveats** | Label leakage risk if upgrade campaigns are not consistently tagged. Small population of verifiable upgrades — model may need conservative decision threshold. Should not surface donors marked as "inactive" or "lapsed". |

---

### 4.3 Campaign Effectiveness Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Donation conversion ratio per campaign (total donations attributable / goal) and "movement" classification (high-conversion vs. noise) |
| **Business framing** | "Did this campaign actually move money, or just engagement metrics?" |
| **Grain** | One row per `campaigns` record |
| **Label / target variable** | Continuous: sum(`donations.amount`) where `donations.campaignId = campaigns.campaignId` divided by `campaigns.goal`. Classification band: low (<30%), medium (30–70%), high (>70%) |
| **Source features** | `campaigns`: category, goal, deadline duration; `social_media_posts` (matched by campaignName): sum of impressions, avg engagementRate, sum of donationReferrals, sum of estimatedDonationValuePhp, platform mix, isBoosted count, sum of boostBudgetPhp; `donations` (matched by campaignId or campaignName): count, sum amount, distinct supporterIds |
| **Refresh cadence** | Per campaign close (triggered when `campaigns.status` changes to "closed") + weekly refresh for active campaigns |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="campaign_effectiveness", entityType="campaign"). `contextJson`: conversion_ratio, classification_band, engagement_to_conversion_ratio, top_referral_platform, recommended_replicate (boolean) |
| **UI explanation fields** | "Donation referrals from social: 47", "Organic vs. boosted conversion ratio: 3.2×", "Top converting platform: Facebook" |
| **Confidence / caveats** | Campaign attribution is imprecise — some donations linked by campaignName (text match) rather than campaignId FK. Text-matching campaigns across `donations.campaignName` and `campaigns.title` may have inconsistencies. |

---

### 4.4 Social Post Conversion Prediction Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Predicted `donationReferrals` count and `estimatedDonationValuePhp` for a given post's feature combination |
| **Business framing** | "Will this post type, at this time, on this platform, generate donation referrals?" |
| **Grain** | One row per `social_media_posts` record |
| **Label / target variable** | `donationReferrals` (regression) and binary: donationReferrals > 0 (classification) |
| **Source features** | `social_media_posts`: platform, dayOfWeek, postHour, postType, mediaType, contentTopic, sentimentTone, captionLength, numHashtags, hasCallToAction, callToActionType, featuresResidentStory, isBoosted, boostBudgetPhp, followerCountAtPost |
| **Refresh cadence** | Weekly model retraining; real-time scoring of new posts at insert time via API hook |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="social_post_conversion", entityType="social_media_post"). `contextJson`: predicted_referrals, predicted_donation_value_php, top_positive_drivers, top_negative_drivers, comparable_post_ids |
| **UI explanation fields** | "Reels at 8 PM on Tuesday historically produce 4× the referrals of static posts", "CTA type 'donate now' outperforms 'learn more' by 2.3×" |
| **Confidence / caveats** | Low absolute referral counts make label distribution very skewed (most posts generate 0 referrals). Zero-inflated regression or two-stage model (classify whether any referral, then regress on amount) is recommended. Posts boosted with budget may confound organic performance signals. |

---

### 4.5 Donation-to-Impact Attribution Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Program-area-to-outcome correlation coefficient per safehouse per quarter |
| **Business framing** | "How much did funding in a specific program area move resident outcomes in that safehouse?" |
| **Grain** | One row per (`safehouseId`, `programArea`, `quarter`) combination |
| **Label / target variable** | Outcome score delta: change in `safehouse_monthly_metrics.avgHealthScore` and `avgEducationProgress` in the months following the allocation date, relative to the quarter before |
| **Source features** | `donation_allocations`: sum(amountAllocated) grouped by safehouseId + programArea + quarter; `safehouse_monthly_metrics`: avgHealthScore, avgEducationProgress, processRecordingCount, homeVisitationCount, incidentCount (lagged by 1 and 2 quarters) |
| **Refresh cadence** | Quarterly |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="donation_impact_attribution", entityType="safehouse_program_area"). `contextJson`: program_area, quarter, amount_allocated, outcome_score_delta, correlation_coefficient, confidence_note |
| **UI explanation fields** | "Education funding ₱120,000 → avg education progress +8.3 points over next quarter", "Confidence: moderate (2-year data window, 1 safehouse)" |
| **Confidence / caveats** | This is correlational, not causal. Confounders (staff turnover, intake of higher-risk residents) are not observed. UI must display a clear disclaimer: "Correlation shown — not evidence of direct causation." Small N per safehouse/program-area/quarter means high variance. |

---

### 4.6 Resident Regression Risk Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Probability (0–1) that a resident's condition will measurably decline within 30 days |
| **Business framing** | "Which residents should be prioritized for urgent intervention at the next case conference?" |
| **Grain** | One row per active `residents` record |
| **Label / target variable** | Binary: within 30 days of scoring date, did the resident's `currentRiskLevel` increase, OR did an `incident_reports` record with severity = "critical" or "high" appear, OR did `health_wellbeing_records.generalHealthScore` decrease by > 15 points? |
| **Source features** | `residents`: currentRiskLevel, initialRiskLevel, caseCategory, subCatOrphaned, subCatTrafficked, subCatChildLabor, subCatPhysicalAbuse, subCatSexualAbuse, subCatOsaec, subCatCicl, subCatAtRisk, subCatStreetChild, subCatChildWithHiv, isPwd, hasSpecialNeeds, dateOfAdmission (tenure), lengthOfStay; `process_recordings` (recent 90 days, per resident): count of concernsFlagged=true, count of progressNoted=false, emotionalStateObserved distribution, sessionType mix; `health_wellbeing_records` (trend): slope of generalHealthScore over last 3 records, nutritionScore, sleepQualityScore; `education_records` (trend): slope of progressPercent, attendanceRate; `incident_reports` (recent 90 days): count, max severity; `intervention_plans`: count of overdue plans (targetDate < now and status != "completed") |
| **Refresh cadence** | Weekly |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="resident_regression_risk", entityType="resident", safehouseId populated). `contextJson`: risk_score, risk_band, top_3_drivers, last_session_concern_flag, health_trend, incident_count_90d |
| **UI explanation fields** | "3 sessions with concerns flagged in last 30 days", "Health score declined 18 points over 6 weeks", "1 critical incident in the past 14 days" |
| **Confidence / caveats** | Resident data involves minors and trauma survivors — output must NEVER be shown to donors or the public. Score must always include a "This is a discussion aid — clinical judgment of the social worker overrides this score" disclaimer. Class imbalance expected. Missing data for residents with few records should reduce score confidence. |

---

### 4.7 Reintegration Readiness Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Probability (0–1) that a resident meets readiness criteria for reintegration planning within 60 days |
| **Business framing** | "Which residents have indicators consistent with past successful reintegrations?" |
| **Grain** | One row per active `residents` record with `reintegrationStatus` not "reintegrated" |
| **Label / target variable** | Binary: was a reintegration plan successfully completed (`intervention_plans.planCategory` = "reintegration" and status = "completed") within 90 days of the scoring date? Train on historical residents who have already been reintegrated (use `residents.dateClosed` and `reintegrationStatus`). |
| **Source features** | `residents`: lengthOfStay, currentRiskLevel, reintegrationType, dateOfAdmission, caseCategory, subCatOrphaned, subCatTrafficked, subCatChildLabor, subCatPhysicalAbuse, subCatSexualAbuse, subCatOsaec, subCatCicl, subCatAtRisk, subCatStreetChild, subCatChildWithHiv, isPwd, hasSpecialNeeds; `process_recordings` (recent 90 days): fraction of sessions with progressNoted=true, fraction with concernsFlagged=false; `home_visitations` (recent 90 days): familyCooperationLevel distribution, safetyConcernsNoted=false count, visitOutcome distribution; `health_wellbeing_records` (most recent): generalHealthScore, psychologicalCheckupDone; `education_records` (most recent): completionStatus, progressPercent, enrollmentStatus; `intervention_plans`: count of completed plans, count of overdue plans |
| **Refresh cadence** | Monthly |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="reintegration_readiness", entityType="resident", safehouseId populated). `contextJson`: readiness_score, positive_indicators, barrier_indicators, similar_successful_cases_count |
| **UI explanation fields** | "Family cooperation: high on last 3 visits", "No safety concerns in 90 days", "Education: completed", "0 overdue intervention plans" |
| **Confidence / caveats** | Historical reintegration cases may be few per safehouse — model may need pooling across safehouses. Training set is biased toward cases that were considered eligible — model should not score residents in caseStatus = "emergency" or "crisis". |

---

### 4.8 Intervention Effectiveness Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Average outcome improvement score per (planCategory, servicesProvided) combination |
| **Business framing** | "Which interventions produce the best measurable improvements across the resident population?" |
| **Grain** | One row per (`planCategory`, `servicesProvided` keyword cluster) combination |
| **Label / target variable** | Composite outcome score: normalized average of (health score improvement + education progress improvement + fraction of sessions with progressNoted=true) in the 90 days following the intervention plan creation date |
| **Source features** | `intervention_plans`: planCategory, servicesProvided (text feature, requires keyword extraction or clustering), status, duration (updatedAt − createdAt); `process_recordings` (matched by residentId, post-plan): progressNoted rate, concernsFlagged rate; `health_wellbeing_records` (matched by residentId, pre/post): generalHealthScore delta; `education_records` (matched by residentId, pre/post): progressPercent delta |
| **Refresh cadence** | Monthly |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="intervention_effectiveness", entityType="intervention_category"). `contextJson`: plan_category, services_cluster, avg_outcome_score, sample_count, safehouse_breakdown, top_outcome_driver |
| **UI explanation fields** | "Trauma-informed psychological care: avg health score +14.2 points across 23 residents in 4 safehouses" |
| **Confidence / caveats** | Confounding by resident severity: harder cases receive more intensive interventions and may improve less. Must control for `initialRiskLevel` and `currentRiskLevel` at plan start. `servicesProvided` is free-text — NLP clustering or keyword extraction required before features are useful. |

---

### 4.9 Safehouse Health Score Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Composite health score (0–100) per safehouse per month, with trend direction |
| **Business framing** | "Which safehouses are thriving, which are stable, and which need urgent attention from leadership?" |
| **Grain** | One row per (`safehouseId`, `monthStart`) in `safehouse_monthly_metrics` |
| **Label / target variable** | For supervised framing: did the safehouse show improvement or decline in the following quarter (requires labeling historical months by expert reviewers)? For unsupervised: composite weighted index of standardized metric dimensions. |
| **Source features** | `safehouse_monthly_metrics`: avgHealthScore, avgEducationProgress, processRecordingCount, homeVisitationCount, incidentCount, activeResidents (all normalized and trend-adjusted); `residents` (counts per safehouse): fraction at high risk, fraction in active intervention, fraction reintegrated this quarter; `incident_reports` (per safehouse, month): count of critical incidents |
| **Refresh cadence** | Monthly (after monthly metrics are entered) |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="safehouse_health_score", entityType="safehouse", entityId=safehouseId, recordTimestamp=monthStart). `contextJson`: composite_score, score_components, trend_direction, peer_rank, top_risk_driver |
| **UI explanation fields** | "Incident count rose 40% vs. prior quarter", "Process recording frequency dropped below network average", "Health score: 62/100 (down from 71 last month)" |
| **Confidence / caveats** | `safehouse_monthly_metrics` requires consistent manual data entry. Missing months or incomplete records will produce unreliable scores. Model should flag data completeness issues alongside the score. |

---

### 4.10 Org-wide Funding Gap Forecasting Pipeline

| Field | Detail |
|---|---|
| **Target / output** | Projected total donation volume for the next 30/60/90 days, compared against campaign targets and operational cost baseline |
| **Business framing** | "Will we have enough funding to sustain operations across all safehouses in the next quarter?" |
| **Grain** | One row per month (org-level aggregate) |
| **Label / target variable** | Actual total donation amount received in a given month. Train on 24+ months of historical `donations.donationDate` + `amount` aggregated by month. |
| **Source features** | Historical monthly donation totals (from `donations`), recurring donation commitments (`supporters.recurringEnabled = true` count, average monthly recurring contribution), campaign pipeline (`campaigns.goal` × predicted conversion rate for active campaigns from pipeline 4.3), seasonal patterns (month-of-year indicators), active resident count (`safehouse_monthly_metrics.activeResidents` as a proxy for operational cost pressure) |
| **Refresh cadence** | Weekly |
| **Inference storage** | `ml_prediction_snapshots` (pipelineName="funding_gap_forecast", entityType="org_month"). `contextJson`: forecast_30d, forecast_60d, forecast_90d, confidence_low, confidence_high, gap_vs_target, top_risk_scenarios, top_opportunity_levers |
| **UI explanation fields** | "Recurring base: ₱180,000/month. Active campaign contribution: ₱40,000–₱90,000. Gap to target: ₱80,000–₱130,000." |
| **Confidence / caveats** | Only 2–3 years of data available — seasonal patterns may not be well-established. Confidence bands must be displayed prominently. One-time large donations introduce variance that a simple time-series model handles poorly — flag outlier donation effects. |

---

## 5. Role-Aware Display and Privacy Matrix

**Legend:** Y = Yes, N = No, A = Aggregate only, P = Partial (some fields hidden), — = Not applicable

| ML Feature | Super Admin: Can See | Super Admin: Entity Level | Super Admin: Explanations | Super Admin: Actions | Super Admin: Anonymization |
|---|---|---|---|---|---|
| Donor Churn Risk | Y | Y (named donors) | Y | Y | N (donors are not minors) |
| Donor Upgrade Likelihood | Y | Y (named donors) | Y | Y | N |
| Campaign Effectiveness | Y | Y (campaigns) | Y | Y | N |
| Social Post Conversion | Y | Y (posts) | Y | Y | N |
| Donation-to-Impact Attribution | Y | Y (safehouses + program areas) | Y | Y | P (residents aggregated only) |
| Resident Regression Risk | Y | Y (named resident w/ code, per safehouse) | Y | Y | P (no full name at org-level view; code only) |
| Reintegration Readiness | Y | Y (named resident w/ code, per safehouse) | Y | Y | P (code only at org-level; named in safehouse drilldown) |
| Intervention Effectiveness | Y | A (by plan category) | Y | Y | Y (no individual resident IDs) |
| Safehouse Health Score | Y | Y (per safehouse) | Y | Y | N (safehouses are not individuals) |
| Funding Gap Forecast | Y | Y (org-level) | Y | Y | N |

| ML Feature | Admin: Can See | Admin: Entity Level | Admin: Explanations | Admin: Actions | Admin: Anonymization |
|---|---|---|---|---|---|
| Donor Churn Risk | N | — | — | — | — |
| Donor Upgrade Likelihood | N | — | — | — | — |
| Campaign Effectiveness | P (own safehouse donations only) | A (by campaign, own safehouse) | P | N | N |
| Social Post Conversion | N | — | — | — | — |
| Donation-to-Impact Attribution | P (own safehouse) | A (own safehouse program areas) | P | N | Y |
| Resident Regression Risk | Y (own safehouse residents) | Y (named resident) | Y | Y | N (within own safehouse context) |
| Reintegration Readiness | Y (own safehouse) | Y (named resident) | Y | Y | N |
| Intervention Effectiveness | Y (own safehouse) | A (plan category) | P | P | Y |
| Safehouse Health Score | P (own safehouse score only, no ranking) | Y (own safehouse) | P | N | — |
| Funding Gap Forecast | N | — | — | — | — |

| ML Feature | Donor: Can See | Donor: Entity Level | Donor: Explanations | Donor: Actions | Donor: Anonymization |
|---|---|---|---|---|---|
| Donor Churn Risk | N | — | — | — | — |
| Donor Upgrade Likelihood | N | — | — | — | — |
| Campaign Effectiveness | P (public campaign progress only) | A (campaign-level totals) | N | N | N |
| Social Post Conversion | N | — | — | — | — |
| Donation-to-Impact Attribution | P (own donations → program areas → aggregate outcomes) | A (aggregate org outcomes only) | N | N | Y (residents fully anonymized) |
| Resident Regression Risk | N | — | — | — | — |
| Reintegration Readiness | N | — | — | — | — |
| Intervention Effectiveness | N | — | — | — | — |
| Safehouse Health Score | N | — | — | — | — |
| Funding Gap Forecast | N | — | — | — | — |

| ML Feature | Public/Unauth: Can See | Public/Unauth: Level | Public/Unauth: Explanations | Public/Unauth: Actions | Public/Unauth: Anonymization |
|---|---|---|---|---|---|
| Donor Churn Risk | N | — | — | — | — |
| Donor Upgrade Likelihood | N | — | — | — | — |
| Campaign Effectiveness | P (% of goal raised only, via campaign pages) | A (aggregate total only) | N | N | N |
| Social Post Conversion | N | — | — | — | — |
| Donation-to-Impact Attribution | P (via published `public_impact_snapshots` only) | A (org-level aggregate) | N | N | Y (residents fully anonymized; no individual data) |
| Resident Regression Risk | N | — | — | — | — |
| Reintegration Readiness | N | — | — | — | — |
| Intervention Effectiveness | N | — | — | — | — |
| Safehouse Health Score | N | — | — | — | — |
| Funding Gap Forecast | N | — | — | — | — |

### Privacy Rules Summary

1. **Resident data is never exposed** to donors or the public in any identifiable form. Internal codes used in admin/super admin views are rotated identifiers — not legal names.
2. **ML scores for residents** are labeled "clinical decision support tools" and carry a mandatory disclaimer at the point of display.
3. **Donor data** is never shown to admins or staff (non-admin roles). Donors can see their own giving history and aggregate impact, but not ML scores.
4. **All role checks** must be enforced server-side on the API. Frontend role gating is UI-only and is not a security control.
5. **`notesRestricted`** fields on `residents` and `process_recordings` are never included in ML features or returned in API responses to any role other than super admin and the assigned social worker.

---

## 6. Recommended Future Additive Columns

All columns listed below are planning-level recommendations only. No SQL is produced. These columns would be added to existing tables using Drizzle schema `addColumn` patterns and pushed via `drizzle-kit push`. No existing columns are renamed or removed.

### 6.1 `supporters` Table

**Score fields:**
- `churn_risk_score` (DOUBLE PRECISION) — probability of lapsing in next 90 days
- `upgrade_likelihood_score` (DOUBLE PRECISION) — probability of upgrade if asked

**Band / label fields:**
- `churn_band` (TEXT) — "at-risk" | "watching" | "stable" | "growing"
- `upgrade_band` (TEXT) — "high-potential" | "medium" | "low" | "not-ready"

**Top-driver explanation fields:**
- `churn_top_drivers` (JSONB) — array of up to 3 driver objects with name and value
- `upgrade_top_drivers` (JSONB) — array of up to 3 upgrade signal objects

**Recommended action fields:**
- `churn_recommended_action` (TEXT) — "send-email" | "schedule-call" | "send-impact-report" | "none"
- `upgrade_recommended_ask_band` (TEXT) — "₱1,000–₱2,000" | "₱2,000–₱5,000" etc.

**Model freshness fields:**
- `churn_score_updated_at` (TIMESTAMP WITH TIME ZONE)
- `upgrade_score_updated_at` (TIMESTAMP WITH TIME ZONE)

---

### 6.2 `donations` Table

**Cached summary fields:**
- `attributed_outcome_score` (DOUBLE PRECISION) — the outcome improvement score attributed to this donation's program area in the following quarter (populated by the attribution pipeline)

**Model freshness fields:**
- `attribution_run_id` (BIGINT) — FK to `ml_pipeline_runs.runId` of the attribution run that computed this value

---

### 6.3 `campaigns` Table

**Score fields:**
- `effectiveness_score` (DOUBLE PRECISION) — composite campaign effectiveness index (0–1)
- `conversion_ratio` (DOUBLE PRECISION) — actual donations raised / goal

**Band / label fields:**
- `effectiveness_band` (TEXT) — "high-movement" | "moderate" | "noise" | "pending"

**Top-driver explanation fields:**
- `effectiveness_top_drivers` (JSONB) — e.g., ["organic referrals from reels", "Tuesday evening timing", "donate-now CTA"]

**Recommended action fields:**
- `recommended_replicate` (BOOLEAN) — should this campaign format be used again?
- `recommended_avoid` (BOOLEAN) — should this campaign format be avoided?

**Model freshness fields:**
- `effectiveness_score_updated_at` (TIMESTAMP WITH TIME ZONE)

---

### 6.4 `social_media_posts` Table

**Score fields:**
- `conversion_prediction_score` (DOUBLE PRECISION) — predicted probability of generating at least 1 donation referral
- `predicted_referral_count` (NUMERIC) — expected number of donation referrals
- `predicted_donation_value_php` (NUMERIC) — expected ₱ value of referrals

**Band / label fields:**
- `conversion_band` (TEXT) — "high-converter" | "moderate" | "engagement-only" | "low"

**Top-driver explanation fields:**
- `conversion_top_drivers` (JSONB) — top positive and negative feature contributions
- `conversion_comparable_post_ids` (JSONB) — array of similar high-performing post IDs for reference

**Model freshness fields:**
- `conversion_score_updated_at` (TIMESTAMP WITH TIME ZONE)

---

### 6.5 `residents` Table

**Score fields:**
- `regression_risk_score` (DOUBLE PRECISION) — probability of measurable decline within 30 days
- `reintegration_readiness_score` (DOUBLE PRECISION) — probability of meeting reintegration criteria within 60 days

**Band / label fields:**
- `regression_risk_band` (TEXT) — "critical" | "high" | "moderate" | "low" | "stable"
- `reintegration_readiness_band` (TEXT) — "ready" | "near-ready" | "in-progress" | "not-ready"

**Top-driver explanation fields:**
- `regression_risk_drivers` (JSONB) — top 3 contributing signals with values
- `reintegration_readiness_drivers` (JSONB) — top 3 positive indicators and top 3 barriers

**Recommended action fields:**
- `regression_recommended_action` (TEXT) — "urgent-case-conference" | "increase-session-frequency" | "monitor" | "none"
- `reintegration_recommended_action` (TEXT) — "schedule-conference" | "prepare-plan" | "monitor" | "none"

**Visibility fields:**
- `ml_scores_restricted` (BOOLEAN) — if true, ML scores are suppressed for this resident (e.g., recent emergency admission, score not yet reliable)

**Model freshness fields:**
- `regression_score_updated_at` (TIMESTAMP WITH TIME ZONE)
- `reintegration_score_updated_at` (TIMESTAMP WITH TIME ZONE)

---

### 6.6 `intervention_plans` Table

**Score fields:**
- `effectiveness_outcome_score` (DOUBLE PRECISION) — retrospective outcome score for completed plans

**Band / label fields:**
- `effectiveness_band` (TEXT) — "high-impact" | "moderate" | "low-impact" | "insufficient-data"

**Top-driver explanation fields:**
- `effectiveness_outcome_drivers` (JSONB) — which outcome dimensions improved most

**Model freshness fields:**
- `effectiveness_score_updated_at` (TIMESTAMP WITH TIME ZONE)

---

### 6.7 `safehouse_monthly_metrics` Table

**Score fields:**
- `composite_health_score` (DOUBLE PRECISION) — weighted composite index (0–100)
- `peer_rank` (INTEGER) — rank among all safehouses for this month

**Band / label fields:**
- `health_band` (TEXT) — "excellent" | "good" | "fair" | "at-risk" | "critical"
- `trend_direction` (TEXT) — "improving" | "stable" | "declining"

**Top-driver explanation fields:**
- `health_score_drivers` (JSONB) — which metric components most influenced the score and in which direction

**Cached summary fields:**
- `incident_severity_distribution` (JSONB) — cached count by severity for the month

**Model freshness fields:**
- `health_score_computed_at` (TIMESTAMP WITH TIME ZONE)
- `health_score_run_id` (BIGINT) — FK to `ml_pipeline_runs.runId`

---

## 7. Implementation Order

### Phase 1 — Highest Value, Fastest Win

**Features: Donor Churn Risk (1.1), Safehouse Health Score (1.9), Funding Gap Forecast (1.10)**

**Why these three first:**

1. **Data readiness is highest.** All required features for donor churn risk are available in `supporters` and `donations` with no free-text transformation required. Safehouse health score draws entirely from `safehouse_monthly_metrics` which is already structured numeric data. Funding gap forecast requires only aggregated `donations` by month — a straightforward time-series target.

2. **Business impact is immediate.** Donor churn risk directly protects revenue. A single prevented high-value donor lapse could fund weeks of operations. The funding gap forecast gives leadership actionable forward visibility that does not currently exist. The safehouse health score answers the most common super admin question: "Which safehouse needs my attention today?"

3. **Model complexity is manageable.** Churn risk is a well-established binary classification problem with abundant open-source baselines. The composite safehouse health score can begin as a weighted index (no supervised training required) before evolving into a predictive model. The funding gap forecast can start with a simple time-series regression before upgrading to a more sophisticated model.

4. **These three features demonstrate the ML infrastructure.** Building the `ml_pipeline_runs` → `ml_prediction_snapshots` write path once for these pipelines establishes the pattern for all subsequent pipelines. Phase 1 is also where the Model Operations page is built.

---

### Phase 2 — Strong Enhancements

**Features: Donor Upgrade Likelihood (1.2), Social Post Conversion Prediction (1.4), Resident Regression Risk (1.6), Reintegration Readiness (1.7)**

**Why these next:**

1. **Donor upgrade likelihood** builds directly on the Phase 1 donor churn infrastructure. The data pipeline is the same; the label and scoring logic are new. Once churn scoring is running, upgrade scoring is a low-marginal-cost addition.

2. **Social post conversion prediction** has rich, already-structured feature data in `social_media_posts` (platform, postHour, dayOfWeek, mediaType, etc.) and a clear numeric target (`donationReferrals`). This feature is a strong IS 455 ML showcase — real regression and classification on a real outcome variable.

3. **Resident regression risk** requires joining across four tables (process_recordings, health_wellbeing_records, education_records, incident_reports) and feature engineering from time-series data. This is more complex than Phase 1 features but very high-stakes for the safehouse mission. Phase 2 timing allows the team to invest the engineering care this feature requires.

4. **Reintegration readiness** is a companion to regression risk and shares the same feature engineering pipeline. Building both in the same phase is efficient. Reintegration readiness is also a core IS 455 deliverable (classification on labeled historical outcomes).

---

### Phase 3 — Advanced and Nice-to-Have

**Features: Campaign Effectiveness (1.3), Donation-to-Impact Attribution (1.5), Intervention Effectiveness (1.8)**

**Why these last:**

1. **Campaign effectiveness** requires consistent campaign-to-donation linking, which depends on `donations.campaignId` being reliably populated and on `social_media_posts.campaignName` matching `campaigns.title` exactly. This data quality dependency may require manual cleanup before modeling is reliable.

2. **Donation-to-impact attribution** is the most conceptually complex feature. It requires aligning funding allocation dates with lagged outcome windows and clearly communicating that the attribution is correlational. The UI must carry disclaimers that could undermine user trust if not designed carefully. This feature is high-value for donor reporting but requires mature data pipelines from Phases 1 and 2.

3. **Intervention effectiveness** requires NLP processing of the `servicesProvided` free-text field to create usable features. This is an ML engineering effort beyond standard structured data modeling. It is best undertaken after the team has established the pipeline infrastructure in Phases 1 and 2 and has bandwidth for the text-processing component.

---

## 8. Risks and Validation Plan

### 8.1 False Confidence in Attribution

**Risk:** The donation-to-impact attribution feature may present correlational relationships as if they are causal. Users may conclude that "₱1,000 in education funding produces 8 points of health score improvement" and make over-confident funding allocation decisions.

**UI/product mitigation:**
- Every attribution visualization carries a permanent, non-dismissible footnote: "Correlation shown — not evidence of direct causation. Confounding factors (staff capacity, resident intake mix) are not controlled."
- Confidence ratings are displayed alongside every attribution score (high / moderate / low), with low-confidence scores visually de-emphasized (grayed out) rather than shown with full chart prominence.
- Provide a "How is this calculated?" expandable explanation on every attribution card.

---

### 8.2 Confusing Engagement with Donation Conversion

**Risk:** The social media manager and super admin may optimize for posts that score high on the social post conversion model — which predicts `donationReferrals` — but conflate this with overall brand awareness or community engagement, which is a different goal.

**UI/product mitigation:**
- The social post conversion widget explicitly labels its Y-axis as "Donation Referrals Predicted," never "Engagement" or "Reach."
- A secondary display column in the post table shows organic reach alongside conversion score so users can see the tradeoff explicitly.
- The "best next post" recommendation card specifies which optimization goal it targets: "Optimized for: Donation Conversion (not engagement)."

---

### 8.3 Exposing Sensitive Resident Information

**Risk:** Resident data involves minors and survivors of trafficking, abuse, and child labor. Any role leakage or missing authorization check could expose a named resident's risk score, trauma history, or reintegration status to unauthorized parties — including donors, the public, or lower-privileged staff.

**UI/product mitigation:**
- All resident-level ML scores are gated server-side. The API route for `ml_prediction_snapshots` where `entityType = "resident"` checks the authenticated user's role and `safehouseId` before returning any record. This is not a frontend-only gate.
- At the super admin level, the org-wide resident view shows only internal codes (not legal names) in ranked lists. Named access requires drilling into a specific safehouse context, where the admin's role assignment is verified.
- The disclaimer "Clinical decision support only — never share with unauthorized parties" appears on every resident ML score display in a persistent banner, not a tooltip.
- `notesRestricted` fields are excluded from all API responses serving ML features.

---

### 8.4 Dashboard Overload

**Risk:** Presenting 10 ML features simultaneously on a single dashboard overwhelms super admin users and results in them ignoring all signals, treating them as background noise rather than actionable intelligence.

**UI/product mitigation:**
- The landing page shows only the **Action Queue** — a prioritized list of the 3–5 most urgent signals across all features (top at-risk donor, top at-risk resident, funding gap status). The full feature pages are accessed deliberately via navigation.
- Each widget has a single primary number or action visible at a glance. Full explanations are behind a "Details" click or side drawer.
- Users can collapse or hide dashboard modules. Collapsed preferences persist via localStorage. Server-side persistence would require a future additive column — outside this planning document's scope.
- The Model Operations page is separated from operational dashboards — super admin who are not technical do not encounter model metadata in their daily workflow.

---

### 8.5 Stale Predictions

**Risk:** If a model runs weekly but the UI displays the score without indicating how old it is, users may act on scores that reflect a resident's state from 6 days ago — which may have changed significantly (especially for regression risk).

**UI/product mitigation:**
- Every ML score displayed in the UI shows a "Score as of: [date]" timestamp pulled from `ml_prediction_snapshots.createdAt`.
- If a score is older than 1.5× the expected refresh cadence (e.g., > 10 days for a weekly pipeline), the score displays with a yellow "Stale — refresh recommended" badge.
- The Model Operations page provides a pipeline freshness monitor that alerts super admin if any pipeline has not run successfully within its expected window.

---

### 8.6 Role Leakage Between Admin and Super Admin

**Risk:** An admin user could attempt to access super-admin-only ML endpoints (e.g., donor churn scores, org-wide funding forecast) by constructing direct API requests, bypassing the frontend role checks.

**UI/product mitigation:**
- Every API route serving ML predictions checks the authenticated user's role from the JWT token. Donor-related pipelines (`donor_churn_risk`, `donor_upgrade_likelihood`, `funding_gap_forecast`) return 403 for any role other than `super_admin`.
- Resident pipeline routes (`resident_regression_risk`, `reintegration_readiness`) filter `safehouseId` from the token's assigned safehouses for admin users — they cannot query for residents from other safehouses.
- API responses for resident-ML features never include `notesRestricted`, legal names, or `dateOfBirth` fields in the same payload as ML scores.
- Role gating is audited in IS 414 security review as a formal access control requirement.

---

### 8.7 Black-Box Trust Problem

**Risk:** Users either blindly follow ML scores without questioning them (automation bias) or entirely dismiss them because they cannot understand how they were calculated (distrust). Both outcomes undermine the value of the system.

**UI/product mitigation:**
- Every score has a visible "Why this score?" section that lists the top 3 contributing features in plain language (stored in `contextJson`). The explanations are written in business language, not model terminology.
- The UI explicitly labels all ML outputs as "decision support" and frames them as "questions to bring to your case conference" rather than "decisions made by the system."
- The Model Operations page shows model performance metrics (precision, recall, F1 from `metricsJson`) so technically literate super admins can evaluate model quality themselves.
- Admins and social workers can "flag a score as incorrect" — a simple feedback mechanism that records disagreements. Implementing server-side persistence for this feedback would require an additive column (e.g., on `ml_prediction_snapshots`) or a new table in a future schema pass — outside this planning document's scope. This creates a correction loop and builds user trust through perceived agency.

---

## Recommended First 3 Super Admin ML Features to Build Now

### 1. Donor Churn Risk

The `supporters` and `donations` tables contain all the features needed to train a reliable churn classifier immediately — no text processing, no cross-table joins beyond two tables, and no new data collection. The business impact is direct and measurable: one prevented high-value donor lapse could represent months of operational funding for a safehouse. For IS 455, this is an ideal binary classification project with a clear label (no donation in 90 days), a well-understood feature set (recency-frequency-monetary), and available techniques (logistic regression, gradient boosting, SMOTE for class imbalance). For IS 414, it showcases role-based access control with a concrete data privacy requirement (donor data never visible to admin or public roles).

### 2. Safehouse Health Score

Every row needed for this feature already exists in `safehouse_monthly_metrics`, which contains structured numeric data across six dimensions (avgHealthScore, avgEducationProgress, processRecordingCount, homeVisitationCount, incidentCount, activeResidents). The initial version can be a weighted composite index — no supervised ML training required — and it immediately answers the most common super admin question. This feature also establishes the `ml_pipeline_runs` → `ml_prediction_snapshots` infrastructure pattern for all subsequent pipelines. For IS 455, the composite index can be extended with a supervised regression or clustering model to demonstrate multiple ML paradigms. For IS 413, it demonstrates cross-entity aggregation and time-series database design.

### 3. Resident Regression Risk

This feature is the highest-stakes and mission-critical ML output in the entire system. Identifying a child survivor at risk of regression before a crisis occurs is the direct operationalization of the organization's purpose. The data exists across `process_recordings`, `health_wellbeing_records`, `education_records`, and `incident_reports` — all linked by `residentId`. While the feature engineering is more complex than the other two (time-series aggregations, trend slopes, cross-table joins), it is entirely feasible with the existing schema. For IS 455, it is a compelling classification problem with real ethical stakes — class imbalance, label definition, and feature selection all require thoughtful decisions that demonstrate advanced ML competence. For IS 414, it requires the strongest privacy controls in the entire system, making it the best case study for role-based access, field-level data masking, and audit logging.
