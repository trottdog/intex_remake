# INTEX Portal UI/UX Architecture and Cursor Planning Prompt Pack

## Purpose
This document is the master planning reference for rebuilding the INTEX frontend UI/UX. It translates the current schema, case requirements, and course expectations into a role-based portal architecture with page-level functionality, navigation, KPI strategy, chart strategy, and machine learning integration.

This document is intended to be used as the source of truth for a complete planning session in Cursor before implementation begins.

---

# 1. Product design direction

The application should feel like one cohesive product with three role-based experiences:

- **Donor portal**: warm, simple, trust-building, impact-centered
- **Admin portal**: efficient, structured, operational, action-oriented
- **Super admin portal**: strategic, governance-focused, oversight-driven

The portals should share the same design system, spacing system, typography, reusable cards, tables, filters, charts, and interaction patterns, while changing density and emphasis by role.

## Global UX principles

- Every page should have **one primary job**.
- Use **KPI cards** for orientation.
- Use **charts** only where trend, comparison, or composition matters.
- Use **tables** for work.
- Use **timelines** for longitudinal case history.
- Use **alerts and task queues** for action.
- Use **machine learning widgets** only where they change a decision.
- Do not overload pages with too many visualizations.
- Prioritize clarity, hierarchy, and scan-ability.

## Global layout shell

All portals should use a consistent application shell:

- **Left sidebar** for role-based navigation
- **Top bar** with page title, global search, notifications, org/safehouse selector when relevant, and user avatar/menu
- **Main content area** with:
  - page title
  - short page purpose sentence
  - filter/action bar
  - top KPI strip
  - main content section
  - optional right insight rail for alerts, recommendations, recent activity, or ML widgets

## Shared design system rules

- Max 4 KPI cards on standard pages
- Max 6 KPI cards on major dashboard pages
- One hero chart per page
- One supporting chart if needed
- One main table or timeline on operational pages
- Use color sparingly and intentionally
- Reserve red/amber for risk, overdue, or incident states
- Keep donor pages visually lighter and more editorial
- Keep admin pages more dense but still readable
- Keep super admin pages compact and strategic

## Shared component system

The frontend should include a reusable component library for:

- app shell
- sidebar nav
- page header
- KPI cards
- stat trend chips
- alert banners
- filter bar
- search input
- data tables
- detail drawers
- tabs
- accordions
- modals
- timeline blocks
- chart containers
- recommendation cards
- ML explanation cards
- task cards
- audit/event log rows
- empty states
- skeleton loading states

---

# 2. Information architecture by role

## Donor portal menu

- Dashboard
- My Giving
- My Impact
- Campaigns
- Updates
- Profile & Preferences

## Admin portal menu

- Dashboard
- Residents
- Caseload
- Process Recordings
- Home Visits
- Case Conferences
- Intervention Plans
- Incidents
- Donors & Contributions
- Social & Outreach
- Reports & Analytics
- Safehouses
- Partners
- Tasks & Alerts
- Settings

## Super admin portal menu

- Executive Dashboard
- Users & Roles
- Safehouses
- Partners
- Public Impact Publishing
- Fundraising Oversight
- ML Control Center
- Security & Compliance
- Audit & Activity
- System Settings

---

# 3. Donor portal architecture

## Donor Dashboard

### Primary job
Orient the donor and reinforce trust, personal contribution, and momentum.

### Layout
- Top KPI strip
- Giving trend chart
- Allocation summary card
- Personal impact summary section
- Recommended next action card

### KPIs
- Lifetime Giving
- Giving This Year
- Last Gift Date
- Recurring Status
- Number of Gifts
- Campaigns Supported

### Graphics
- **Line chart**: giving over time
- **Stacked bar chart**: allocation by program area or safehouse
- **Impact cards**: education, wellbeing, operations, reintegration support

### Functional elements
- date range filter
- donate again CTA
- upgrade to recurring CTA
- see full impact CTA

### ML placement
- recommended next campaign
- recurring donor conversion suggestion
- personalized interest summary

---

## My Giving

### Primary job
Provide a clean donation ledger and receipt center.

### Layout
- top filter/action bar
- donation table
- expandable donation detail drawer
- giving summary panel

### Filters
- date range
- donation type
- campaign
- safehouse
- program area

### Table data
- Date
- Donation Type
- Amount or Estimated Value
- Campaign
- Allocation Summary
- Receipt Action

### KPIs
- Total in selected period
- Number of gifts
- Average gift amount
- Largest gift
- Donation type mix

### Graphics
- **Bar chart**: gifts by month
- **Donut chart**: donation type mix if category count is small

### Functional elements
- download annual statement
- view receipt
- repeat donation

---

## My Impact

### Primary job
Show how donor generosity connects to outcomes without exposing private case data.

### Layout
- top impact KPIs
- allocation flow visualization
- public impact snapshot cards
- aggregate outcome cards
- change-over-time section

### KPIs
- Dollars Allocated
- Program Areas Supported
- Safehouses Reached
- Published Impact Snapshots Since Joined
- Estimated Services Supported

### Graphics
- **Stacked bar or waterfall**: donation allocation flow
- **Sparkline cards**: trend by impact domain
- **Editorial impact cards**: published milestone summaries

### Functional elements
- safehouse/program area filter
- view impact snapshots
- compare current year vs previous year

### ML placement
- recommended campaigns based on support history
- projected high-impact areas aligned to donor interests

---

## Campaigns

### Primary job
Help donors discover opportunities to support.

### Layout
- campaign card grid
- recommended campaign rail
- simple impact summary on each campaign card

### KPIs
- Active Campaigns
- Goal Progress
- Days Remaining
- Participation Count

### Graphics
- **Progress bars** on campaign cards
- very light chart use only where useful

### Functional elements
- browse by category
- browse by urgency
- donate CTA
- save campaign CTA

### ML placement
- next-best-campaign recommendation
- reason for recommendation

---

## Updates

### Primary job
Provide donor-facing trust-building communication.

### Layout
- editorial-style cards and updates feed
- impact snapshots
- milestones
- safehouse/program updates

### Graphics
- use cards, badges, and light stat callouts instead of dashboards

---

## Profile & Preferences

### Primary job
Manage contact and communication preferences.

### Functional elements
- profile editing
- communication preferences
- recurring gift settings
- saved interests
- theme/language preference

---

# 4. Admin portal architecture

## Admin Dashboard

### Primary job
Serve as the daily operational command center.

### Layout
- top KPI strip
- resident status overview
- donation trend chart
- alert stack
- safehouse comparison section
- case lifecycle funnel
- recommendations rail

### KPIs
- Active Residents
- Admissions This Month
- High-Risk Residents
- Incidents This Week
- Upcoming Case Conferences
- Overdue Follow-Ups
- Donation Total This Month
- Social Referrals This Month

### Graphics
- **Stacked bar**: residents by safehouse and risk
- **Line chart**: donations over time
- **Funnel chart**: case lifecycle progression
- **Alert list**: priority actions

### Functional elements
- global date filter
- safehouse filter
- save dashboard views
- export snapshot

### ML placement
- resident regression risk alerts
- reintegration readiness candidates
- at-risk donor list preview
- social posting suggestions

---

## Residents

### Primary job
Serve as the master resident directory and resident entry point.

### Layout
- filter/search header
- resident table/list
- quick summary chips
- row click into resident detail

### Filters
- safehouse
- case status
- case category
- assigned worker
- risk level
- reintegration status
- admission date

### KPIs
- Total Active Residents
- New Admissions
- Cases Needing Update
- High-Risk Residents

### Graphics
- small **distribution bars** above the table
- minimal chart usage

### Functional elements
- add resident
- edit resident
- export filtered view
- assign worker

---

## Resident Detail

### Primary job
Provide a 360-degree view of a resident's case journey and current status.

### Layout
- header summary panel
- left profile column
- central tabbed content area
- right rail for alerts, next steps, and ML guidance

### Header content
- resident code
- safehouse
- assigned worker
- current risk
- case status
- reintegration status
- admission date
- last updated

### Tabs
- Overview
- Education
- Health & Wellbeing
- Process Recordings
- Home Visits
- Case Conferences
- Intervention Plans
- Incidents
- Timeline

### KPIs
- Days Since Admission
- Current Risk
- Last Recording Date
- Last Health Update
- Last Education Update
- Open Interventions
- Incidents in Last 90 Days
- Next Conference Date

### Graphics
- **Line chart**: education progress over time
- **Line chart**: health score over time
- **Timeline**: major case events
- **Bar chart**: incidents by month

### Functional elements
- edit resident profile
- add note/recording
- add visit
- add conference
- add intervention plan
- log incident
- print/export case summary

### ML placement
- reintegration readiness score
- regression risk status
- top 3 drivers
- suggested next action

---

## Caseload

### Primary job
Provide a workload management workspace for active cases.

### Layout
- saved view tabs
- work queue table or kanban-like grouping
- priority chips
- quick actions

### Saved views
- My Residents
- Needs Conference
- High Risk
- Reintegration Candidates
- Missing Recent Recording

### KPIs
- My Active Cases
- High-Priority Cases
- Cases Overdue for Update
- Cases with Upcoming Action

### Graphics
- focus on queue state and chips rather than charts

### ML placement
- sortable readiness score
- sortable regression risk
- intervention success probability column

---

## Process Recordings

### Primary job
Document the healing journey through session-level records.

### Layout
- top filters
- chronological feed
- expanded detail panel
- summary rail

### KPIs
- Sessions This Week
- Average Session Duration
- Progress-Noted Rate
- Concern-Flag Rate
- Referral-Made Rate

### Graphics
- **Stacked bar**: emotional state start vs end
- **Line chart**: sessions per month
- **Bar chart**: concerns by worker or safehouse

### Functional elements
- create recording
- edit recording
- link to resident detail
- mark follow-up needed

### ML placement
- follow-up escalation probability
- suggested note tags or issue themes

---

## Home Visits

### Primary job
Track family/home engagement and follow-up risk.

### Layout
- visit queue
- visit table
- detail drawer
- follow-up rail

### KPIs
- Visits This Month
- Follow-Ups Needed
- Safety Concerns Noted
- Unfavorable Outcomes
- Avg Time Since Last Visit

### Graphics
- **Bar chart**: visit outcomes
- **Bar chart**: cooperation level distribution
- **Line chart**: safety concerns over time

### Functional elements
- create visit
- add follow-up
- link visit to resident
- export visit list

### ML placement
- follow-up urgency prediction
- household risk context score

---

## Case Conferences

### Primary job
Track conference planning, outcomes, and next steps.

### Layout
- upcoming conferences
- history list
- linked resident context
- decision summary panel

### KPIs
- Upcoming This Week
- Overdue Conferences
- Conferences by Safehouse
- Avg Days Between Conferences

### Graphics
- **Calendar strip**
- **Line chart**: conferences over time
- **Bar chart**: decision or action type breakdown

### Functional elements
- create conference
- edit conference
- add outcomes and next steps
- link to tasks

---

## Intervention Plans

### Primary job
Manage and monitor care plans and plan outcomes.

### Layout
- plan status KPI row
- plan table
- plan detail drawer
- milestone/timeline section

### KPIs
- Open Plans
- Completed Plans
- Overdue Plans
- Avg Completion Time
- Success Rate by Category

### Graphics
- **Stacked bar**: plan status by category
- **Timeline/Gantt strip**: target dates vs current status
- **Bar chart**: services mix

### Functional elements
- create plan
- edit plan
- update progress
- close plan
- revise target date

### ML placement
- plan success probability
- target date miss risk
- recommended review cadence

---

## Incidents

### Primary job
Provide focused incident and safety oversight.

### Layout
- incidents KPI strip
- incidents table
- severity filters
- resolution aging rail

### KPIs
- Incidents This Month
- Open Incidents
- High Severity Incidents
- Avg Resolution Time
- Follow-Up Required Count

### Graphics
- **Line chart**: incidents over time
- **Stacked bar**: incidents by severity
- **Bar chart**: incidents by safehouse
- **Histogram**: resolution time

### Functional elements
- log incident
- edit incident
- assign follow-up
- resolution workflow

### ML placement
- incident risk prediction at resident level
- incident forecast at safehouse level

---

## Donors & Contributions

### Primary job
Support fundraising operations and donor management.

### Layout
- top KPI strip
- tabbed workspace

### Tabs
- Supporters
- Donations
- Allocations
- Segments
- At-Risk Donors
- Opportunities

### KPIs
- Total Supporters
- Active Supporters
- Raised This Month
- Recurring Donors
- Avg Gift Size
- Retention Estimate
- New Supporters
- In-Kind Estimated Value

### Graphics
- **Line chart**: donations over time
- **Retention heatmap**: donor retention cohorts
- **Stacked bar**: allocations by program area
- **Bar chart**: acquisition by channel
- **Donut**: support type mix

### Functional elements
- donor list and donor profile
- donation ledger
- allocation drilldown
- export lists
- add/update supporter

### ML placement
- donor churn risk
- donor upgrade likelihood
- donor segmentation
- next-best-campaign recommendation

---

## Social & Outreach

### Primary job
Help staff understand what content drives donations and engagement.

### Layout
- top KPI strip
- tabbed analytics and planner workspace

### Tabs
- Performance
- Content Types
- Donation Referrals
- Recommendations
- Planner

### KPIs
- Posts This Month
- Avg Engagement Rate
- Donation Referrals
- Donation Value from Social
- Best Platform
- Best Post Type
- Best Time Window

### Graphics
- **Bar chart**: engagement by platform
- **Bar chart**: donation referrals by platform
- **Heatmap**: performance by day and hour
- **Scatter plot**: engagement vs donation conversion
- **Bar chart**: post type vs donation value

### Functional elements
- planner inputs
- compare platforms
- schedule recommendations
- content-type analysis

### ML placement
- social post conversion predictor
- content recommendation engine
- best time-to-post recommender
- predicted donation value simulator

---

## Reports & Analytics

### Primary job
Provide structured cross-functional reporting.

### Tabs
- Executive Summary
- Donor Performance
- Resident Outcomes
- Safehouse Performance
- Outreach Performance
- Annual Accomplishment Report
- Exports

### Executive KPIs
- Donations YTD
- Active Residents
- Reintegration Success Rate
- Avg Health Score
- Avg Education Progress
- Incident Rate

### Graphics
- **Line charts** for trends
- **Grouped bars** for comparison
- **Funnel** for reintegration stages
- **Safehouse comparison bars**
- **Annual accomplishment grouped stat blocks**

### Functional elements
- date range filters
- safehouse/program filters
- export to PDF/CSV
- save report views

### ML placement
- model insight summaries
- segment distributions
- safehouse clustering results
- forecast panels

---

## Safehouses

### Primary job
Provide safehouse-level operational performance views.

### Layout
- safehouse list/cards
- safehouse detail view
- monthly metrics and comparison area

### KPIs
- Active Residents
- Avg Education Progress
- Avg Health Score
- Incident Count
- Process Recording Count
- Visit Count
- Capacity/Occupancy if tracked

### Graphics
- **Monthly trend lines**
- **Grouped bars**: safehouse comparisons
- **Progress bar**: capacity/occupancy

### Functional elements
- safehouse detail
- compare safehouses
- filter by time

### ML placement
- safehouse incident forecast
- safehouse clustering/benchmarking

---

## Partners

### Primary job
Track partner organizations and coverage.

### Layout
- partner directory
- assignment matrix
- coverage detail

### KPIs
- Active Partners
- Safehouses Covered
- Program Areas Covered
- Active Assignments

### Graphics
- **Coverage matrix**
- **Bar chart**: partners by program area
- **Timeline**: assignment duration

### Functional elements
- create/edit partner
- view assignments
- analyze coverage gaps

---

## Tasks & Alerts

### Primary job
Turn operational and ML signals into action.

### Layout
- task list
- alert queue
- filters by type/owner/status
- due date and urgency chips

### Functional elements
- assign task
- complete task
- snooze or escalate alert
- link task back to resident/donor/social item

### ML placement
- model-generated tasks for follow-up
- donor re-engagement tasks
- resident review tasks
- outreach optimization tasks

---

# 5. Super admin portal architecture

## Executive Dashboard

### Primary job
Provide whole-organization visibility.

### KPIs
- Total Donors
- Total Active Residents
- Total Safehouses
- Donations YTD
- Org Retention Estimate
- Reintegration Success Rate
- Avg Health Score
- Avg Education Progress
- Incident Rate
- Social-Driven Donations

### Graphics
- **Multi-line trends**
- **Safehouse comparison bars**
- **Quadrant comparison chart**

### Functional elements
- org-wide filters
- compare date ranges
- export executive summary

---

## Users & Roles

### Primary job
Manage access control and user assignments.

### Layout
- user table
- role chips
- safehouse assignment mapping
- account status controls

### Functional elements
- create user
- assign role
- assign safehouse
- disable/enable account
- force password reset
- view last login

### Graphics
- mostly tables and role chips

---

## Public Impact Publishing

### Primary job
Manage external-facing impact content.

### Layout
- draft list
- preview pane
- publish controls
- metric payload preview

### Functional elements
- draft snapshot
- publish/unpublish
- preview donor/public view

### Graphics
- editorial cards and previews

---

## Fundraising Oversight

### Primary job
Provide strategic donor and campaign performance oversight.

### KPIs
- Revenue YTD
- Forecast vs Goal
- Retention Trend
- Acquisition by Channel
- Major Donor Opportunities

### Graphics
- **Retention curves**
- **Forecast lines**
- **Segment composition**
- **Channel ROI comparisons**

### ML placement
- revenue forecast
- churn trend
- upgrade opportunity summaries
- segment strategy cards

---

## ML Control Center

### Primary job
Provide model governance, health monitoring, and explainability.

### Tabs
- Pipeline Overview
- Model Performance
- Predictions in Production
- Feature Importance
- Drift / Data Quality
- Decision Logs

### KPIs
- Active Pipelines
- Last Retrain Date
- Prediction Volume
- Avg Confidence
- Model Health Status
- Drift Flags
- Human Override Rate

### Graphics
- **Pipeline status cards**
- **Performance trend lines**
- **Feature importance bars**
- **Prediction histograms**
- **Override rate trends**

### Functional elements
- pipeline detail
- threshold management
- view deployment status
- review drift alerts

---

## Security & Compliance

### Primary job
Make security posture visible and auditable.

### KPIs
- HTTPS Enabled
- HTTP Redirect Active
- CSP Active
- RBAC Enabled
- Cookie Consent Active
- Password Policy Active
- MFA Enabled Accounts
- Protected vs Public Routes
- Delete Confirmation Enabled

### Graphics
- use status cards, checklists, and policy panels

### Functional elements
- policy summaries
- route protection matrix
- role access matrix
- recent auth events

---

## Audit & Activity

### Primary job
Provide traceability for high-impact actions.

### Layout
- audit event table
- filters by actor, action, entity, date
- entity-linked history views

### Functional elements
- export logs
- investigate critical changes

---

## System Settings

### Primary job
Manage application-level configuration.

### Functional elements
- manage lookup values
- manage global preferences
- manage portal toggles
- manage feature flags if included

---

# 6. Machine learning pipeline strategy

The machine learning pipelines should align directly with the initial case needs and should be embedded into the relevant workflows rather than isolated in a generic analytics page.

## Priority pipelines

### 1. Donor churn / lapse prediction
**Business question**: Which donors are likely to lapse in the next 60 to 180 days?

**Best placement**
- Admin > Donors & Contributions > At-Risk Donors
- Super Admin > Fundraising Oversight

**Best UI**
- risk band
- top drivers
- recommended next action

---

### 2. Donor upgrade / next-best-ask prediction
**Business question**: Which donors are likely to increase giving or convert to recurring support?

**Best placement**
- Admin > donor profile and opportunities tab
- Donor > dashboard recommendations
- Super Admin > fundraising strategy

**Best UI**
- ask band suggestion
- preferred campaign affinity
- best outreach type

---

### 3. Resident reintegration readiness prediction
**Business question**: Which residents may be ready for reintegration review soon?

**Best placement**
- Admin > Resident Detail
- Admin > Caseload
- Admin > Dashboard

**Best UI**
- readiness score
- confidence band
- top drivers
- suggested review timing

---

### 4. Resident regression / elevated risk prediction
**Business question**: Which residents are showing signs of regression or elevated future risk?

**Best placement**
- Admin > Dashboard alerts
- Admin > Resident Detail
- Admin > Caseload

**Best UI**
- risk flag
- contributing factors
- review recommendation

---

### 5. Intervention effectiveness prediction
**Business question**: Which interventions are likely to succeed or miss targets?

**Best placement**
- Admin > Intervention Plans
- Admin > Reports & Analytics

**Best UI**
- success probability
- miss-risk status
- compare categories

---

### 6. Social post donation conversion prediction
**Business question**: What content, platform, and timing are most likely to generate donations?

**Best placement**
- Admin > Social & Outreach > Planner / Recommendations
- Super Admin > Fundraising Oversight

**Best UI**
- interactive simulator
- predicted engagement
- predicted donation referrals
- predicted donation value

---

### 7. Safehouse incident forecast
**Business question**: Which safehouses may experience elevated incident load?

**Best placement**
- Admin > Incidents
- Admin > Safehouses
- Super Admin > Executive Dashboard

---

### 8. Donor segmentation
**Business question**: What meaningful donor groups exist and how should strategy differ by segment?

**Best placement**
- Admin > Donors & Contributions > Segments
- Super Admin > Fundraising Oversight

---

## ML presentation rules

Every ML widget should include:
- prediction
- confidence
- explanation
- recommended action

ML should never feel like a standalone novelty. It should change what the user does next.

---

# 7. Cursor planning session prompt pack

Use the following prompts in Cursor in order.

## Prompt 1: Product architecture brief

```text
You are a senior product architect, UX strategist, and frontend systems planner. I am rebuilding the frontend for an INTEX nonprofit operations platform with three role-based portals: donor, admin, and super admin.

I need you to produce a complete frontend product architecture plan using the attached planning document as the source of truth. Do not invent unrelated features. Preserve the role separation and workflow logic.

Your output should include:
1. Complete route map for each portal
2. Navigation tree for desktop and mobile
3. Shared layout shell description
4. Design system/component inventory
5. Page-by-page purpose and primary user task
6. Suggested information hierarchy for every page
7. Shared reusable UI patterns
8. State and data dependencies by page
9. Recommendations for what should be dashboard-based vs table-based vs timeline-based
10. Notes on how to prevent the experience from becoming overwhelming

Optimize for a responsive React frontend.
```

## Prompt 2: Design system and visual language plan

```text
Act as a professional graphic designer and senior product designer.

Using the attached portal architecture document, create a complete UI/UX design direction for this product. I want a design system plan that distinguishes the donor portal, admin portal, and super admin portal without making them feel like separate products.

Deliver:
1. Visual tone for each portal
2. Typography hierarchy
3. Spacing system
4. Card system
5. KPI card rules
6. Table design rules
7. Chart design rules
8. Alert and risk color usage
9. Sidebar and top nav behavior
10. Mobile adaptation rules
11. Component behavior guidelines for filters, drawers, tabs, modals, and timelines
12. Rules for where graphics should and should not be used

Be very concrete and practical for implementation.
```

## Prompt 3: Donor portal planning

```text
Using the attached planning document, fully architect the donor portal for a React application.

I want a page-by-page donor portal specification including:
- route structure
- page goals
- exact sections on each page
- KPI cards to show
- charts and why they belong
- data tables and columns
- calls to action
- empty states
- loading states
- responsive behavior
- user flow between pages
- where personalized ML recommendations appear

Pages to cover:
- Dashboard
- My Giving
- My Impact
- Campaigns
- Updates
- Profile & Preferences

The donor portal should feel warm, simple, polished, and trust-building.
```

## Prompt 4: Admin portal planning

```text
Using the attached planning document, fully architect the admin portal for a React application.

I need a complete admin portal specification with:
- route tree
- navigation structure
- page purpose
- layout wireframe descriptions
- KPI definitions
- recommended charts for each page and why
- table structures and suggested columns
- right-rail insight content where relevant
- filters and actions on each page
- what should be editable vs read-only
- how pages connect together operationally
- where each machine learning feature appears and how the admin interacts with it

Pages to cover:
- Dashboard
- Residents
- Caseload
- Resident Detail
- Process Recordings
- Home Visits
- Case Conferences
- Intervention Plans
- Incidents
- Donors & Contributions
- Social & Outreach
- Reports & Analytics
- Safehouses
- Partners
- Tasks & Alerts
- Settings

The admin portal should feel efficient, organized, high-functioning, and not overwhelming.
```

## Prompt 5: Super admin portal planning

```text
Using the attached planning document, fully architect the super admin portal for a React application.

I want a page-by-page super admin specification including:
- route tree
- role-based access logic
- layout structure
- KPI usage
- chart usage
- tables and management views
- governance and oversight workflows
- security/compliance presentation
- ML control center information architecture
- publishing and audit workflows

Pages to cover:
- Executive Dashboard
- Users & Roles
- Safehouses
- Partners
- Public Impact Publishing
- Fundraising Oversight
- ML Control Center
- Security & Compliance
- Audit & Activity
- System Settings

The super admin portal should feel strategic, compact, authoritative, and operationally credible.
```

## Prompt 6: Machine learning UX integration plan

```text
Using the attached planning document, act as a machine learning product strategist and UX architect.

I need you to map every proposed ML pipeline into the frontend experience. For each pipeline, define:
1. The business question it answers
2. The likely inputs/features from the schema
3. The best page placements in the portals
4. The best UI format for presenting the prediction
5. The user action that should result from seeing it
6. Any explanation or transparency requirements
7. Whether the feature is donor-facing, admin-facing, or super-admin-facing

Focus especially on:
- donor churn prediction
- donor upgrade / next-best-ask
- resident reintegration readiness
- resident regression risk
- intervention effectiveness
- social post donation conversion prediction
- safehouse incident forecasting
- donor segmentation

Keep the final recommendations practical and aligned with the case requirements.
```

## Prompt 7: Frontend technical implementation blueprint

```text
Using the attached planning document, create a frontend implementation blueprint for a React app.

Deliver:
1. Recommended folder structure
2. Route organization by portal
3. Shared layout strategy
4. Component library structure
5. Hooks/services/state needs
6. Suggested page composition pattern
7. Data-fetching strategy assumptions
8. Suggested chart wrapper architecture
9. Table abstraction strategy
10. Permissions/render guards by role
11. Suggested naming conventions
12. Incremental build order from highest-value screens to lower-priority screens

Do not write final production code yet. Focus on architecture and implementation planning.
```

## Prompt 8: High-fidelity wireframe prompt

```text
Using the attached planning document, create detailed text-based wireframes for every major page in the donor, admin, and super admin portals.

For each page include:
- page title
- top bar contents
- sidebar state
- KPI row contents
- main content sections in order from top to bottom
- chart/card/table placement
- right rail contents if used
- actions and CTA placement
- responsive stacking behavior

I want the output to read like a wireframe blueprint that a frontend engineer and designer could build from directly.
```

## Prompt 9: Screen inventory and build roadmap

```text
Using the attached planning document, produce a complete screen inventory and prioritized build roadmap.

Group screens into:
- MVP essential
- high-value next
- phase 2
- optional polish

For each screen, include:
- role
- page name
- why it matters
- dependencies
- complexity estimate
- whether it includes charts, tables, timelines, forms, or ML widgets

Also recommend the ideal order for building the UI so that the most critical workflows are completed first.
```

## Prompt 10: Final master planning session

```text
You are running a complete planning session for rebuilding the frontend of this INTEX application.

Use the attached portal architecture document as the single source of truth.

I want one master output that combines:
- product architecture
- route maps
- design system guidance
- page-level UI/UX planning
- KPI and chart strategy
- machine learning placement
- role-based workflows
- implementation recommendations
- phased build roadmap

The final output should be structured, deeply practical, implementation-ready, and tailored for a React frontend.

Do not give generic advice. Make the output specific to the architecture and workflows in the attached planning document.
```

---

# 8. Recommended build priority

## MVP essential
- shared app shell
- role-aware sidebar and routing
- donor dashboard
- admin dashboard
- residents list
- resident detail
- donors & contributions
- social & outreach
- super admin executive dashboard

## High-value next
- process recordings
- home visits
- intervention plans
- incidents
- reports & analytics
- users & roles
- security & compliance

## Phase 2
- campaigns
- donor updates
- public impact publishing
- ml control center
- partners
- safehouse benchmarking

## Optional polish
- advanced saved views
- deeper personalization
- richer export center
- audit visualizations
- advanced comparison tools

---

# 9. Final instruction for Cursor

When using this document in Cursor, always tell Cursor to:

- preserve role-based information architecture
- preserve functional simplicity
- avoid feature creep
- avoid dashboard overload
- prioritize reusable components
- embed machine learning into workflows, not separate novelty pages
- optimize for responsive React frontend implementation
- maintain one cohesive design system across all portals

