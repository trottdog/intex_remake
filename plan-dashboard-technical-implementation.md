
# Dashboard Technical Implementation Plan v2

## Purpose

This plan defines a revised technical implementation for the dashboard system now that the ML pipelines are already complete.

The goal is not to create more pages or more charts. The goal is to create a **connected decision-support system** that helps each user quickly answer:

- What changed?
- What matters now?
- What should I look at next?
- What action should I take?
- Why is the system surfacing this to me?

This version incorporates earlier feedback by:

- treating ML as already available product input rather than future work
- reducing dashboard overlap
- centering the product around **Action Center**
- focusing each dashboard on user decisions, not just display
- emphasizing privacy and role-aware design throughout

---

## 1. Product implementation stance

### Core product statement

The platform should behave like a **secure operational intelligence layer** for nonprofit staff, donors, and public visitors.

It should connect:

- donor behavior
- resident wellbeing and case progress
- outreach performance
- public impact communication
- follow-up actions and exceptions

### Core implementation rule

No dashboard is complete unless it helps the user do at least one of the following:

1. prioritize attention
2. investigate a change
3. understand cause or likely cause
4. navigate to a meaningful action
5. communicate impact clearly and safely

If a dashboard only shows data, it is incomplete.

---

## 2. User groups and what they need

The dashboards should be built around actual users, not around tables.

## 2.1 Public visitor / prospective donor

### What they need
- understand what the organization does
- trust the organization quickly
- see proof of impact without feeling manipulated
- understand where donations go
- know what to do next

### What they want
- clarity
- legitimacy
- emotional confidence
- simple impact signals
- a straightforward call to action

### What they are trying to answer
- Is this organization real and credible?
- What kind of impact does it create?
- Is donor money being used responsibly?
- Should I donate or learn more?

---

## 2.2 Existing donor / supporter

### What they need
- understand their relationship to the organization
- see donation history and impact context
- feel personally connected to outcomes
- trust the use of funds

### What they want
- affirmation
- transparency
- relevance
- personalized impact context

### What they are trying to answer
- What has my support helped make possible?
- Where does my giving fit?
- Why should I continue giving?

---

## 2.3 Fundraising / donor relations staff

### What they need
- know which donors need follow-up
- identify lapse risk and upgrade opportunity
- understand campaign and channel performance
- explain impact clearly when communicating with supporters

### What they want
- ranked priorities
- clean donor segmentation
- less manual sorting
- clear outreach recommendations

### What they are trying to answer
- Who should I contact today?
- Which donors are most at risk?
- Which donors are most promising?
- Which campaigns or channels are producing valuable donors?
- What evidence should I use in outreach?

---

## 2.4 Social worker / care staff

### What they need
- know which residents need attention now
- understand whether a resident is improving, stalled, or regressing
- see missing or stale care records
- quickly access timelines and follow-up actions

### What they want
- triage support
- reduced cognitive load
- chronological clarity
- confidence that nothing is slipping through the cracks

### What they are trying to answer
- Which residents need review right now?
- What has changed for this resident?
- Are follow-ups overdue?
- What is the recent care trajectory?
- What should I record or review next?

---

## 2.5 Program manager / admin / leadership

### What they need
- a command center view of the organization
- visibility into risk, workload, trends, and exceptions
- confidence in cross-domain health
- safehouse-level insight
- drilldowns into the right workflows

### What they want
- fast orientation
- meaningful exceptions instead of noise
- clear ranking of urgent issues
- evidence that operations are improving or degrading

### What they are trying to answer
- What matters most right now?
- Where is risk increasing?
- Where is performance strongest or weakest?
- Which domain should I open next?
- Are we improving overall?

---

## 2.6 Outreach / marketing staff

### What they need
- understand what content actually matters
- separate engagement from donation value
- identify timing and content patterns
- understand channel effectiveness

### What they want
- fewer vanity metrics
- content planning guidance
- evidence for next campaign decisions

### What they are trying to answer
- What should we post more often?
- What gets attention but not giving?
- What actually drives donation behavior?
- Which timing patterns are worth repeating?

---

## 3. Revised dashboard inventory

To reduce overlap and sharpen execution, the platform should launch with **five primary dashboards** and **one shared cross-dashboard layer**.

## 3.1 Primary dashboards

1. **Public Impact Dashboard**
2. **Admin Command Dashboard**
3. **Donor Intelligence Dashboard**
4. **Resident / Caseload Dashboard**
5. **Outreach Performance Dashboard**

## 3.2 Shared cross-dashboard layer

6. **Action Center**

## 3.3 Dashboard intentionally merged for v1

A separate Care Activity Dashboard should **not** be a first-release dashboard.

Its functions should be absorbed into:

- Resident / Caseload Dashboard
- Resident detail pages
- Admin Command Dashboard

### Why
- reduces overlap
- keeps the dashboard system easier to understand
- avoids a sixth page with mostly duplicated care workflow summaries
- lets the team make fewer dashboards much stronger

A separate Care Activity Dashboard can be added later if usage proves there is a distinct workflow need.

---

## 4. Global dashboard design principles

Every dashboard should contain these layers where appropriate:

1. **Orientation**
   - headline and scope
   - filter context
   - what the dashboard is for

2. **Summary KPIs**
   - current totals
   - recent deltas
   - key rates or counts

3. **Movement / trend**
   - what changed over time
   - short-term versus longer trend where helpful

4. **Exceptions / attention**
   - what is abnormal
   - what needs review
   - what is stale, overdue, or high-risk

5. **Action path**
   - where to click next
   - what workflow to enter
   - how to respond

### Universal rules

- no chart without a clear business question
- no large dashboard without at least one exception section
- no public dashboard with identifiable or overly granular resident data
- no internal dashboard without drilldown paths
- no ML score shown without context labels and safe explanation
- no dashboard should require the user to inspect every section before knowing what matters

---

## 5. Cross-dashboard system concept

The dashboards should behave as a connected system, not isolated tabs.

### Interaction model

#### Layer 1: Overview dashboards
- Public Impact Dashboard
- Admin Command Dashboard
- Donor Intelligence Dashboard
- Resident / Caseload Dashboard
- Outreach Performance Dashboard

#### Layer 2: Investigative pages
- donor list
- donor profile
- resident list
- resident profile
- resident timeline
- campaign detail
- safehouse summary

#### Layer 3: Action workflows
- create outreach note
- review donor priority
- log process recording
- log home visitation
- review follow-up item
- resolve action-center item
- schedule case conference follow-up

### Navigation principle

Every alert, priority item, watchlist row, or exception card should lead somewhere useful.

---

## 6. Shared filter system

Use consistent filters across dashboards when they make sense.

## Core shared filters
- date range
- safehouse
- campaign
- donor segment
- risk tier
- attention only
- resident status
- program area

## Filter behavior rules
- filters should be lightweight and role-safe
- internal filters should persist in URL query params where useful
- drilldowns should pass filter state when practical
- public filters should remain limited and simple

### Example
A user clicks “Residents needing attention: 8” on the Admin Command Dashboard and lands on the Resident Dashboard with:
- `attentionOnly=true`
- `safehouseId=...` if relevant
- current date range preserved

---

## 7. Dashboard-by-dashboard implementation

# 7.1 Public Impact Dashboard

## Primary audience
- public visitors
- prospective donors
- existing donors
- judges in the demo

## Primary job of the dashboard
Build trust and explain impact clearly without exposing sensitive data.

## The questions this dashboard must answer
- What does the organization do?
- What outcomes are improving?
- Where do donations go?
- Why should I trust this organization?
- What should I do next?

## What the user wants to understand
- high-level impact
- responsible resource use
- evidence of real outcomes
- the relationship between support and results

## What the user may want to do next
- donate
- learn more
- log in
- explore impact by timeframe or program area

## Required components
1. Header with context and timeframe
2. KPI row
3. donation allocation view
4. trend view of public-safe outcome metrics
5. narrative impact highlights
6. CTA panel

## Suggested KPIs
- total donations this month / quarter / year
- people served
- allocation by program area
- high-level outcome improvements
- current campaign or initiative highlights

## Privacy rules
- aggregated data only
- no names
- no case details
- no sensitive small-sample views
- no hover states or labels that could reveal protected details

## UI implementation pattern
1. trust-oriented intro
2. KPI row
3. allocations + outcomes
4. short narrative insights
5. CTA strip

## Technical implementation

### API endpoint
- `GET /api/public/dashboard/impact`

### Data sources
- donation summaries
- allocation summaries
- public impact snapshot tables
- public-safe outcome rollups

### DTO recommendations
- `PublicImpactDashboardDto`
  - `Kpis`
  - `AllocationBreakdown`
  - `OutcomeTrends`
  - `NarrativeHighlights`
  - `CallsToAction`

### Frontend notes
- keep the page visually calm
- do not overload with charts
- include at least one explanation card under complex visuals

---

# 7.2 Admin Command Dashboard

## Primary audience
- admin
- program leadership
- super admin

## Primary job of the dashboard
Act as the command center for the organization.

## The questions this dashboard must answer
- What matters most right now?
- What has changed recently?
- Where is risk concentrated?
- Which workflow needs attention next?
- Is organizational health improving or degrading?

## What the user wants to understand
- urgency
- trend direction
- workload and risk concentration
- operational bottlenecks
- cross-domain status at a glance

## What the user may want to do next
- open a donor watchlist
- review residents needing attention
- inspect safehouse health
- open overdue tasks or follow-ups
- resolve Action Center items

## Required components
1. KPI row
2. Action Center
3. donation summary
4. resident attention summary
5. safehouse comparison
6. upcoming operational tasks
7. data-quality or stale-record alerts

## Suggested KPIs
- active residents
- residents needing review
- upcoming case conference follow-ups
- donations this week / month
- high-risk donors
- stale care records
- safehouses with concerning trend movement

## Priority design rule
The page should show priorities before analytics.

## UI implementation pattern
1. Header and filters
2. KPI row
3. Action Center
4. resident and donor risk summary
5. safehouse health section
6. operational tasks
7. support summaries

## Technical implementation

### API endpoint
- `GET /api/admin/dashboard`

### Data sources
- donor scores
- resident scores
- action center items
- care staleness summaries
- safehouse rollups
- donation trends
- upcoming task / conference data

### DTO recommendations
- `AdminDashboardDto`
  - `Kpis`
  - `ActionItems`
  - `DonationSummary`
  - `ResidentSummary`
  - `SafehouseHealth`
  - `UpcomingTasks`
  - `DataQualitySummary`

### Frontend notes
- Action Center should be above supporting charts
- all major summary cards should drill into another page
- use clear severity indicators

---

# 7.3 Donor Intelligence Dashboard

## Primary audience
- fundraising staff
- donor relations staff
- leadership

## Primary job of the dashboard
Turn donor data into outreach and fundraising decisions.

## The questions this dashboard must answer
- Who should we contact now?
- Which donors are most likely to lapse?
- Which donors may be ready to give more?
- Which campaigns and channels produce valuable donors?
- What context should we use in outreach?

## What the user wants to understand
- donor priority
- donor health and trend
- source and campaign value
- upgrade potential
- donation-to-impact relationship

## What the user may want to do next
- open a donor profile
- start outreach
- segment donors by risk or opportunity
- compare campaign sources
- review donor impact context

## Required components
1. donor KPIs
2. at-risk donor distribution
3. upgrade-opportunity distribution
4. priority donor list
5. recency / frequency / amount trends
6. campaign and channel performance summary
7. impact linkage section

## Suggested KPIs
- active vs lapsed donors
- recurring vs one-time donors
- average gift
- donor lifetime value
- high-risk donor count
- upgrade-opportunity count
- donor growth over time

## UX rule
The page should feel like a targeting workspace, not a static donor report.

## UI implementation pattern
1. KPI row
2. Action Center or donor priority panel
3. donor segmentation and trend row
4. priority donor table
5. campaign/channel analysis
6. impact linkage context

## Technical implementation

### API endpoint
- `GET /api/donors/dashboard`

### Data sources
- supporter table
- donations
- allocation summaries
- donor scores
- campaign and channel aggregates

### DTO recommendations
- `DonorDashboardDto`
  - `Kpis`
  - `RiskDistribution`
  - `OpportunityDistribution`
  - `PriorityDonors`
  - `DonationTrends`
  - `CampaignPerformance`
  - `ImpactLinkageSummary`
  - `ActionItems`

### Frontend notes
- sort priority donor views by recommended next action
- include safe human-readable score labels
- do not show raw model outputs without interpretation

---

# 7.4 Resident / Caseload Dashboard

## Primary audience
- social workers
- care staff
- admin
- leadership with proper permissions

## Primary job of the dashboard
Provide a prioritized view of resident wellbeing, risk, progress, and care follow-through.

## The questions this dashboard must answer
- Which residents need attention now?
- Who is improving, stalled, or regressing?
- Are important care records missing or stale?
- Which safehouses or groups show unusual patterns?
- What should I open next?

## What the user wants to understand
- triage priority
- recent trajectory
- whether follow-through is happening
- whether the resident picture is complete enough to act

## What the user may want to do next
- open a resident profile
- review process recordings
- review home visitations
- complete overdue follow-up
- compare patterns by safehouse or risk tier

## Required components
1. caseload KPI row
2. residents needing attention panel
3. risk and progress distribution
4. stale/missing care records section
5. safehouse comparison
6. priority resident table
7. follow-up status summary

## Suggested KPIs
- active residents
- residents needing review
- average progress score
- elevated-risk residents
- stale process recording count
- overdue follow-up count
- residents with recent worsening indicators

## Important implementation choice
This dashboard should absorb the v1 care-activity summary layer.

That means it should also surface:
- process recording cadence
- visitation coverage
- overdue follow-up items
- unresolved concern counts

without creating a separate care dashboard.

## UI implementation pattern
1. KPI row
2. Action Center or residents-needing-attention section
3. risk/progress movement
4. stale record and follow-up section
5. resident priority list
6. safehouse comparison

## Technical implementation

### API endpoint
- `GET /api/residents/dashboard`

### Data sources
- resident master data
- process recordings
- home visitations
- incident summaries
- follow-up task data
- resident scores
- safehouse rollups

### DTO recommendations
- `ResidentDashboardDto`
  - `Kpis`
  - `RiskDistribution`
  - `ProgressDistribution`
  - `ResidentsNeedingAttention`
  - `CareStalenessSummary`
  - `FollowUpSummary`
  - `SafehouseComparisons`
  - `ActionItems`

### Frontend notes
- use clear “needs attention” labels
- show why a resident appears in a priority list
- make it easy to jump into timeline and care detail

---

# 7.5 Outreach Performance Dashboard

## Primary audience
- outreach staff
- marketing staff
- fundraising staff
- admin

## Primary job of the dashboard
Show what outreach content and timing actually contribute to meaningful outcomes.

## The questions this dashboard must answer
- What kinds of content drive donations, not just engagement?
- Which posts overperformed or underperformed?
- What timing patterns appear effective?
- Which channels are worth repeating or rethinking?
- What should the team do differently next?

## What the user wants to understand
- what works
- what is noise
- what patterns are actionable
- where conversion is occurring

## What the user may want to do next
- open campaign detail
- compare content types
- revise posting strategy
- identify high-engagement low-conversion posts
- identify quiet but high-conversion patterns

## Required components
1. channel KPI row
2. engagement vs conversion section
3. top converting posts or campaigns
4. high-engagement low-conversion exceptions
5. timing and content analysis
6. recommendations section

## Suggested KPIs
- impressions
- clicks
- engagement rate
- donation-linked conversions
- donation amount by source
- conversion rate by channel
- conversion rate by content type

## UX rule
The dashboard must separate **attention** from **value**.

## UI implementation pattern
1. KPI row
2. engagement vs conversion visuals
3. exception panels
4. timing/content insights
5. recommended next patterns to test

## Technical implementation

### API endpoint
- `GET /api/outreach/dashboard`

### Data sources
- social media post table
- referral attribution data
- campaign summaries
- donation linkage summaries
- completed outreach-related ML outputs if available

### DTO recommendations
- `OutreachDashboardDto`
  - `Kpis`
  - `ChannelPerformance`
  - `TopConvertingPosts`
  - `EngagementVsConversion`
  - `TimingInsights`
  - `ContentTypeInsights`
  - `Recommendations`
  - `ActionItems`

### Frontend notes
- include explanation text under any scatter or comparison view
- avoid marketing vanity-chart clutter
- prioritize “what to repeat” and “what to stop doing”

---

## 8. Action Center implementation

Action Center is the most important shared product layer.

## 8.1 Purpose

Provide a ranked set of attention items across domains so the product feels operational and intelligent.

## 8.2 Questions it must answer
- What should I look at first?
- Why is this important?
- What action is recommended?
- Where do I go to deal with it?

## 8.3 Item types

### Donor-related
- high churn risk
- high upgrade likelihood
- valuable donor showing decline
- campaign source performing unusually well or poorly

### Resident-related
- resident risk increased
- resident progress stalled or regressed
- missing recent care activity
- overdue follow-up
- unusual incident or concern trend

### Operations-related
- safehouse deteriorating
- stale records cluster
- case conference follow-up overdue

### Outreach-related
- high engagement / low conversion
- high conversion opportunity
- campaign underperforming
- content type shift worth reviewing

## 8.4 Required item fields
- `id`
- `actionType`
- `entityType`
- `entityId`
- `severity`
- `title`
- `summary`
- `recommendedAction`
- `createdAt`
- `resolvedAt`
- `assignedRole`
- `clickTarget`

## 8.5 Service design

### Endpoint
- `GET /api/action-center`

### Shared service
- `ActionCenterService`

### Backend rules
- centralize action item generation
- merge rule-based and ML-based signals
- support filtering by role and severity
- support resolution status

## 8.6 First-release generation strategy

Because ML is already complete, Action Center should combine:

1. **Rules-based triggers**
2. **ML score thresholds**
3. **Simple data-quality exceptions**

This is better than relying only on ML or only on rules.

## 8.7 Example generation logic
- donor has not donated within expected interval
- donor churn risk tier high
- upgrade likelihood above threshold
- resident attention score high
- readiness or regression signal crosses review threshold

## 8.8 Resolution model

Users should be able to:
- open the related entity
- resolve the item
- optionally snooze or defer
- optionally assign follow-up ownership if implemented

## Acceptance standard
The Action Center should feel like the first place an internal user looks, not a secondary report panel.

---

## 9. Detail-page requirements created by the dashboard system

The dashboards depend on good detail and drilldown pages.

## 9.1 Donor detail pages must support
- donation history timeline
- allocation summary
- campaign and channel history
- donor score summary
- outreach notes or follow-up tasks
- donor-specific impact context where appropriate

## 9.2 Resident detail pages must support
- resident summary
- risk and progress overview
- process recording timeline
- home visitation history
- intervention summary
- follow-up items
- case conference context
- reintegration status and readiness context

## 9.3 Campaign detail pages must support
- post history
- engagement trends
- donation attribution summary
- content and timing comparisons
- recommendation context

These detail pages are not optional if the dashboards are expected to lead to action.

---

## 10. Backend technical architecture

## 10.1 API contract strategy

The frontend should never construct dashboard state by performing many raw-table joins.

### Rule
Each dashboard should load from **one primary dashboard endpoint** that returns a stable, role-safe DTO.

### Benefits
- faster page loads
- cleaner permission handling
- fewer frontend bugs
- better caching
- more stable UI development

---

## 10.2 Recommended service layer

Create one service per dashboard plus one shared Action Center service.

### Services
- `PublicImpactDashboardService`
- `AdminDashboardService`
- `DonorDashboardService`
- `ResidentDashboardService`
- `OutreachDashboardService`
- `ActionCenterService`

### Responsibilities
Each service should:
- apply role and filter logic
- read from source tables or optimized views
- assemble one DTO
- hide raw database complexity from the frontend

---

## 10.3 Recommended read models / views

Do not create every possible reporting view up front.
Build the minimum needed read models first, then optimize where necessary.

### First-priority read models
- `vw_public_impact_summary`
- `vw_admin_dashboard_summary`
- `vw_donor_dashboard_summary`
- `vw_resident_dashboard_summary`
- `vw_outreach_dashboard_summary`
- `vw_safehouse_health_summary`
- `vw_care_staleness_summary`
- `vw_post_conversion_summary`

### Why this set
- covers all v1 dashboards
- supports performance without overengineering
- matches the strongest product story

---

## 10.4 Example DTO shape

```csharp
public class AdminDashboardDto
{
    public AdminKpiDto Kpis { get; set; }
    public List<ActionCenterItemDto> ActionItems { get; set; }
    public DonationSummaryDto DonationSummary { get; set; }
    public ResidentSummaryDto ResidentSummary { get; set; }
    public List<SafehouseHealthDto> SafehouseHealth { get; set; }
    public List<UpcomingTaskDto> UpcomingTasks { get; set; }
    public DataQualitySummaryDto DataQualitySummary { get; set; }
}
```

---

## 11. Frontend implementation architecture

## 11.1 Shared component library

Use reusable dashboard building blocks.

### Recommended shared components

* `DashboardHeader`
* `FilterBar`
* `KpiRow`
* `TrendChartCard`
* `DistributionCard`
* `ActionCenterPanel`
* `AttentionList`
* `PriorityTableCard`
* `ComparisonTable`
* `NarrativeInsightCard`
* `RecommendationPanel`
* `DrilldownLinkCard`
* `PermissionStateCard`
* `EmptyStateCard`

## 11.2 Page layout pattern

Each dashboard page should follow this order:

1. Header and scope
2. Filter bar
3. KPI row
4. Most important insight / priority section
5. Exceptions / watchlist section
6. Supporting trend sections
7. Drilldown table or recommendation section

This order ensures users see what matters before they see supporting analytics.

## 11.3 State management

### Recommended approach

* React Query for server state
* URL query params for sharable filters
* per-dashboard hooks:

  * `usePublicImpactDashboard`
  * `useAdminDashboard`
  * `useDonorDashboard`
  * `useResidentDashboard`
  * `useOutreachDashboard`
  * `useActionCenter`

## 11.4 Required UI states

Every dashboard must have:

* loading skeleton
* empty state
* partial data fallback
* permission denied state
* no-results-for-filter state

---

## 12. Role-based access and privacy design

## 12.1 Public users

Can access:

* landing page
* public impact dashboard
* privacy page
* donate flow

Cannot access:

* donor detail
* resident data
* internal dashboards

## 12.2 Donor role

Can access:

* public impact dashboard
* their own donation history and impact context if implemented

Cannot access:

* other donors
* resident data
* internal operations dashboards

## 12.3 Staff and admin roles

Access depends on role:

* fundraising roles -> donor dashboard and outreach dashboard
* care roles -> resident dashboard
* admin and super admin -> all internal dashboards

## 12.4 Privacy implementation rules

* public APIs query only approved aggregate views
* internal APIs enforce role-aware access
* no sensitive summary text in broad watchlist cards
* action explanations should be concise and safe
* hover labels and tooltips must be reviewed for data leakage risk

### Example safe phrasing

Use:

* “Resident risk increased based on recent indicators”

Avoid:

* trauma-specific narrative in overview cards

---

## 13. Implementation roadmap

This roadmap assumes ML pipelines are already complete and available for product use.

## Phase 1: Contracts and shells

### Goal

Create stable dashboard contracts and page shells.

### Build

* dashboard routes
* DTOs
* placeholder endpoints
* shared component scaffolding
* shared filters and query state

### Deliverable

All dashboard pages render with mock or partial data using stable contracts.

---

## Phase 2: Admin + Action Center

### Goal

Build the strongest differentiator first.

### Build

* Admin Command Dashboard
* Action Center service
* primary rule and ML threshold integration
* safehouse summary
* data quality alerts

### Deliverable

The system already feels like a decision-support product.

---

## Phase 3: Resident Dashboard

### Goal

Build the strongest mission-critical internal workflow.

### Build

* Resident / Caseload Dashboard
* resident priority lists
* care staleness and follow-up alerts
* drilldowns to resident profile and care timelines

### Deliverable

Care staff can prioritize resident review and follow-up.

---

## Phase 4: Donor Dashboard

### Goal

Make fundraising intelligence operational.

### Build

* donor KPIs
* risk and opportunity segmentation
* priority donor views
* campaign/channel summary
* donor profile drilldowns

### Deliverable

Fundraising staff can prioritize outreach using real signals.

---

## Phase 5: Public Impact Dashboard

### Goal

Create a polished trust and transparency surface.

### Build

* aggregated public-safe metrics
* allocation views
* outcome trends
* narrative highlights
* CTA components

### Deliverable

The public side feels credible and presentation-ready.

---

## Phase 6: Outreach Dashboard

### Goal

Turn outreach data into planning decisions.

### Build

* conversion-focused post analysis
* timing and content insights
* channel performance
* exception detection
* campaign drilldowns

### Deliverable

Outreach users can change posting strategy based on meaningful outcomes.

---

## Phase 7: Performance, polish, and demo hardening

### Goal

Make the system feel complete and stable.

### Build

* caching and query optimization
* loading/error polish
* accessibility pass
* responsiveness pass
* walkthrough tuning for demo flow
* safe empty states and tooltips review

---

## 14. Acceptance criteria by dashboard

A dashboard is complete only when all of the following are true.

## Functional

* loads with real role-safe data
* filters work
* important cards and lists drill into meaningful pages
* loading and error states exist

## Product quality

* user can identify what matters within 5 to 10 seconds
* dashboard highlights exceptions, not just totals
* at least one clear action path exists
* business question for each section is obvious

## Technical

* dashboard uses a stable backend DTO
* frontend is not assembling data through many joins
* query performance is acceptable
* filter state behaves consistently

## Privacy

* no accidental exposure in labels, charts, hover states, or tooltips
* public and internal boundaries are clear
* explanations are safe for the viewer’s role

---

## 15. Recommended priority order

If time is limited, build in this exact order:

1. **Admin Command Dashboard**
2. **Action Center**
3. **Resident / Caseload Dashboard**
4. **Donor Intelligence Dashboard**
5. **Public Impact Dashboard**
6. **Outreach Performance Dashboard**

### Why this order

* Admin + Action Center creates the strongest product identity
* Resident and donor dashboards cover the most important operational and fundraising decisions
* Public Impact strengthens trust and demo quality
* Outreach is important, but slightly less foundational than the internal command surfaces

---

## 16. Final implementation recommendation

Implement the dashboard system as a **connected, role-aware decision-support layer** with:

* fewer dashboards with clearer responsibilities
* Action Center as the core operating surface
* stable aggregated backend DTOs
* consistent filter behavior
* strong drilldown flows into real workflows
* privacy-safe public and internal boundaries
* ML outputs used as prioritization inputs, not unexplained black boxes

If implemented this way, the product will feel more coherent, more useful, and more mature than a set of disconnected report pages or CRUD screens with charts.