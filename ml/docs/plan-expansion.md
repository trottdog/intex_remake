# ML Pipelines Expansion Plan

## Purpose

Create a new execution plan for the **next wave of ML pipelines** now that the shared data foundation, common prep, and initial pipeline plan are complete.

This document assumes the team has already finished:

* schema understanding
* broad EDA
* reusable preprocessing
* shared analytic tables
* initial top-priority pipeline planning

The goal now is to **produce more complete, distinct ML pipelines quickly** by reusing the shared platform you already built.

---

## Core strategy

Treat the current ML work as a **shared platform** that can now generate many additional pipelines with relatively low marginal effort.

Each new pipeline should be:

* a distinct business problem
* a distinct target or explanatory framing
* a distinct notebook submission
* a distinct deployment value in the app

But it should **reuse as much shared code as possible**.

---

## Expansion objective

Build the next set of ML pipelines across four areas:

1. donor retention and fundraising growth
2. resident safety and case management
3. outreach and social media optimization
4. safehouse operations and strategic planning

This matches the project requirement to deliver as many meaningful end-to-end pipelines as possible across the available domains. fileciteturn0file4L1-L7

---

# Assumed shared assets

The following should already exist or be easy to reuse:

* `supporter_features`
* `campaign_features`
* `post_features`
* `resident_features`
* `resident_monthly_features`
* shared preprocessing utilities
* shared train/test helpers
* shared model comparison helpers
* shared evaluation charts and tables
* shared notebook template
* shared deployment patterns for scores, lists, cards, and charts

These should now be treated as the base layer for rapid notebook production.

---

# New pipeline portfolio target

## Tier 1: Fastest expansion pipelines

These have the best reuse-to-value ratio and should be built first.

### 1. Donor Upgrade Likelihood Prediction

**Question:** Which current donors are most likely to increase their giving if asked?

**Why it matters:** The client needs donor growth, not just donor retention.

**Shared assets reused:**

* `supporter_features`
* donation history aggregates
* campaign engagement features

**Possible target:**

* donor gives more than historical average in next period
* donor crosses a high-value threshold

**Deployment:**

* donor profile upgrade score
* fundraiser targeting list

---

### 2. Recurring Donor Conversion Prediction

**Question:** Which one-time donors are most likely to become recurring donors?

**Why it matters:** Recurring revenue stabilizes operations.

**Shared assets reused:**

* `supporter_features`
* campaign and channel variables

**Possible target:**

* recurring status within next 90 or 180 days

**Deployment:**

* donor dashboard badge
* campaign audience recommendation list

---

### 3. Next Donation Amount Prediction

**Question:** How much is a donor likely to give next?

**Why it matters:** Helps with planning, forecasting, and donor prioritization.

**Shared assets reused:**

* `supporter_features`
* donation recency/frequency windows
* campaign features

**Possible target:**

* next monetary donation amount

**Deployment:**

* expected donor value card
* fundraising planning table

---

### 4. Best Posting Time Prediction

**Question:** When should the organization post to maximize donation-linked results?

**Why it matters:** The client explicitly wants to know what time to post and what works. fileciteturn0file0L15-L18

**Shared assets reused:**

* `post_features`
* linked donation outcomes
* time-based post variables

**Possible target:**

* donation-linked post yes/no
* high-value engagement threshold yes/no

**Deployment:**

* outreach planner recommendation card

---

### 5. Content Type Effectiveness Explanation

**Question:** What kinds of content are associated with real fundraising value versus vanity metrics?

**Why it matters:** The client wants to separate meaningful outcomes from noise. fileciteturn0file0L15-L18

**Shared assets reused:**

* `post_features`
* engagement metrics
* donation attribution features

**Deployment:**

* social media analytics dashboard
* content planning recommendations

---

### 6. Donation Channel Effectiveness Explanation

**Question:** Which acquisition and donation channels create the most valuable long-term donors?

**Why it matters:** Helps the organization invest in the right channels.

**Shared assets reused:**

* `supporter_features`
* `campaign_features`
* donations and supporter attributes

**Deployment:**

* channel comparison report page
* acquisition strategy recommendation chart

---

## Tier 2: Resident expansion pipelines

These heavily reuse the case-management foundation and should come next.

### 7. Incident Risk Prediction

**Question:** Which residents are at highest near-term incident risk?

**Why it matters:** Supports early intervention and safer operations.

**Shared assets reused:**

* `resident_monthly_features`
* incidents
* counseling and wellbeing signals

**Possible target:**

* incident within next 30 or 60 days

**Deployment:**

* admin alert list
* resident watchlist

---

### 8. Case Prioritization Score

**Question:** Which residents most urgently need staff follow-up?

**Why it matters:** Staff time is limited, so triage matters.

**Shared assets reused:**

* `resident_monthly_features`
* risk, concern, incident, and progress features

**Possible target:**

* composite priority label
* predicted stall or adverse event risk

**Deployment:**

* ranked caseload table
* daily triage card

---

### 9. Counseling Progress Prediction

**Question:** Which residents are likely to show near-term counseling progress?

**Why it matters:** Helps staff evaluate whether current support patterns are working.

**Shared assets reused:**

* process recording aggregates
* emotional-state deltas
* intervention summaries
* resident monthly summaries

**Possible target:**

* future progress flag
* sustained emotional-state improvement

**Deployment:**

* resident profile progress score
* counseling effectiveness chart

---

### 10. Education Improvement Prediction

**Question:** Which residents are likely to improve educationally, and which are likely to stall?

**Why it matters:** Education is one of the organization’s key outcome areas.

**Shared assets reused:**

* education records
* interventions
* wellbeing features
* resident monthly summaries

**Possible target:**

* attendance improvement
* academic progress improvement

**Deployment:**

* education risk/progress dashboard card

---

### 11. Wellbeing Deterioration Prediction

**Question:** Which residents show early signs of declining wellbeing?

**Why it matters:** Supports earlier intervention before bigger setbacks occur.

**Shared assets reused:**

* wellbeing records
* incidents
* process recordings
* interventions

**Possible target:**

* decline in sleep, nutrition, energy, or composite wellbeing

**Deployment:**

* resident wellbeing alert indicator

---

### 12. Home Visitation Outcome Prediction

**Question:** Which home environments appear most supportive of successful reintegration?

**Why it matters:** Directly informs reintegration and placement decisions.

**Shared assets reused:**

* home visitations
* resident outcomes
* reintegration progress features

**Possible target:**

* successful reintegration progress after visitation period

**Deployment:**

* reintegration support score
* case conference panel insight

---

## Tier 3: Strategic and operations pipelines

These are broader leadership-oriented pipelines and should follow after the high-reuse operational set.

### 13. Safehouse Performance Explanation

**Question:** Which safehouse-level factors are associated with stronger resident and fundraising outcomes?

**Deployment:**

* leadership comparison charts
* reports dashboard insight cards

---

### 14. Resource Demand Prediction

**Question:** Which safehouses or program areas are likely to need more resources soon?

**Deployment:**

* operations planning dashboard
* fundraising priority recommendations

---

### 15. Capacity Pressure Prediction

**Question:** Which safehouses are approaching operational strain?

**Deployment:**

* admin dashboard safehouse alerts

---

### 16. Donation Allocation Impact Explanation

**Question:** Which program-area allocations appear most associated with improved outcomes?

**Why it matters:** The client wants a better way to connect donor activity to outcomes. fileciteturn0file0L10-L13

**Deployment:**

* donor-facing impact dashboard
* fundraising story support charts

---

### 17. Public Impact Forecasting

**Question:** What public-facing impact metrics are likely next period?

**Deployment:**

* forecast widget on impact dashboard

---

### 18. Donor-to-Impact Personalization Model

**Question:** What impact stories, safehouses, or program areas should be shown to each donor?

**Why it matters:** The client wants personalized outreach and better donation-to-impact storytelling. fileciteturn0file0L10-L13

**Deployment:**

* donor portal personalization cards
* campaign targeting logic

---

# Recommended execution order

## Wave 1: Highest-return quick expansion

1. Donor Upgrade Likelihood Prediction
2. Recurring Donor Conversion Prediction
3. Next Donation Amount Prediction
4. Donation Channel Effectiveness Explanation
5. Best Posting Time Prediction
6. Content Type Effectiveness Explanation

## Wave 2: Case-management expansion

7. Incident Risk Prediction
8. Case Prioritization Score
9. Counseling Progress Prediction
10. Education Improvement Prediction
11. Wellbeing Deterioration Prediction
12. Home Visitation Outcome Prediction

## Wave 3: Strategic and leadership expansion

13. Safehouse Performance Explanation
14. Resource Demand Prediction
15. Capacity Pressure Prediction
16. Donation Allocation Impact Explanation
17. Public Impact Forecasting
18. Donor-to-Impact Personalization Model

---

# New phased execution plan

## Phase A: Audit completed work

### Objective

Identify what is already done and which adjacent pipelines can be produced fastest.

### Tasks

* list completed notebooks
* list completed target labels
* list completed analytic tables
* list reusable visuals and helper utilities
* identify nearest-adjacent unbuilt targets

### Output

* completed-vs-next matrix
* reuse map by pipeline

---

## Phase B: Standardize notebook production

### Objective

Turn the shared platform into a rapid notebook factory.

### Tasks

* finalize one standard notebook template
* move repeated code into shared modules
* standardize model comparison outputs
* standardize business interpretation sections
* standardize deployment note format

### Output

* reduced notebook creation time
* more consistent submissions

---

## Phase C: Build donor and outreach expansion set

### Objective

Produce the fastest additional notebooks first.

### Pipelines

* Donor Upgrade Likelihood
* Recurring Donor Conversion
* Next Donation Amount
* Donation Channel Effectiveness
* Best Posting Time
* Content Type Effectiveness

### Why first

These likely have the highest notebook-per-hour return because they heavily reuse existing donor and post foundations.

---

## Phase D: Build resident expansion set

### Objective

Exploit the resident foundation as deeply as possible.

### Pipelines

* Incident Risk
* Case Prioritization
* Counseling Progress
* Education Improvement
* Wellbeing Deterioration
* Home Visitation Outcome

### Why second

These are high-value operational pipelines, but they require more careful target design and leakage checks.

---

## Phase E: Build strategic and leadership set

### Objective

Add executive-level and donor-facing analytics pipelines.

### Pipelines

* Safehouse Performance
* Resource Demand
* Capacity Pressure
* Donation Allocation Impact
* Public Impact Forecasting
* Donor-to-Impact Personalization

---

## Phase F: Final packaging and app integration

### Objective

Make every new pipeline distinct, credible, and visible in the application.

### Tasks

* ensure each notebook has unique problem framing
* ensure predictive and explanatory sections are present
* ensure evaluation is interpreted in business terms
* add deployment notes
* wire outputs into the app using cards, badges, lists, tables, or charts
* verify every notebook runs top to bottom

---

# Notebook production pattern

Do not restart from scratch for each new notebook.

Use this production pattern:

1. clone the standard notebook template
2. load one shared analytic table
3. define the new target or explanatory question
4. choose the relevant feature subset
5. run baseline plus preferred models
6. interpret results in business terms
7. add deployment notes

This should minimize marginal time per new pipeline.

---

# Suggested staffing model

## Person A: Donor expansion owner

* donor upgrade
* recurring conversion
* next donation amount
* channel effectiveness

## Person B: Outreach expansion owner

* best posting time
* content type effectiveness
* outreach-related deployment widgets

## Person C: Resident expansion owner

* incident risk
* case prioritization
* counseling progress
* education improvement
* wellbeing deterioration
* home visitation outcome

## Person D: Strategic and integration owner

* safehouse performance
* resource demand
* capacity pressure
* allocation impact
* impact forecasting
* donor personalization

## Shared responsibility

Everyone reviews:

* leakage risk
* target validity
* business usefulness
* model interpretation
* deployment visibility

---

# Quality rules

## A new pipeline must be clearly distinct

Do not count a notebook as a new pipeline if it is only:

* the same target with a different algorithm
* the same question with slightly different features

## Prioritize actionability

The best additional pipelines support a concrete decision such as:

* who to contact
* who to prioritize
* what to post
* which safehouse needs support
* which program area should be emphasized

## Skip weak targets quickly

If a target is:

* too sparse
* too noisy
* too ambiguous
* too hard to defend in business terms

then skip it and move to the next adjacent candidate.

## Keep deployment lightweight

A meaningful deployment can be as small as:

* a score badge
* a ranked table
* an insight card
* a forecast widget
* a recommendation panel

That is enough if it clearly creates user value.

---

# Best next 10 pipelines to prioritize

If the team wants the strongest shortlist for immediate expansion, prioritize these:

1. Donor Upgrade Likelihood Prediction
2. Recurring Donor Conversion Prediction
3. Next Donation Amount Prediction
4. Best Posting Time Prediction
5. Content Type Effectiveness Explanation
6. Incident Risk Prediction
7. Case Prioritization Score
8. Counseling Progress Prediction
9. Education Improvement Prediction
10. Donation Allocation Impact Explanation

These give the best mix of:

* high code reuse
* strong business value
* visible deployment potential
* distinct notebook framing

---

# Final guidance

You are no longer in the discovery stage.
You are now in the **pipeline expansion stage**.

The shared ML foundation should now act as a force multiplier.
The fastest way to create more high-quality notebooks is to:

* build adjacent targets
* reuse the same analytic tables
* keep each notebook distinct in business purpose
* deploy outputs visibly into the app

That is the best path to producing more ml-pipelines quickly and credibly.
