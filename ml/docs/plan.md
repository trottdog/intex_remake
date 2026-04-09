# ML Pipelines Plan

## Goal

Build the top 6 highest-value machine learning pipelines for the INTEX project in a way that maximizes:

* reuse of shared code
* speed of development
* rubric coverage
* deployment feasibility
* business impact

---

## Top 6 Pipelines

1. **Donor Churn / Lapse Risk Prediction**
2. **Reintegration Readiness Prediction**
3. **Social Post → Donation Prediction**
4. **Resident Regression / Elevated Risk Prediction**
5. **Campaign Effectiveness Explanation**
6. **Intervention Effectiveness Explanation**

---

# How the work should be structured

## What is shared across pipelines

### Shared exploration

You only need to do this once well, then reuse it:

* understand table grain
* identify primary and foreign keys
* inspect missingness
* inspect date ranges
* inspect categorical cardinality
* identify leakage risks
* identify likely target labels
* inspect class balance
* inspect time-based relationships

### Shared preparation

You should build one reusable prep layer for:

* parsing dates
* standardizing booleans/categoricals
* handling null values
* creating time-window features
* creating aggregate entity tables
* consistent train/test logic
* reusable feature encoders

### Shared engineered datasets

Instead of rebuilding from raw tables every time, create reusable analytic tables such as:

* `supporter_features`
* `campaign_features`
* `post_features`
* `resident_features`
* `resident_monthly_features`
* `safehouse_features`

### Shared notebook template

Every notebook can use the same sections:

1. Problem framing
2. Predictive framing
3. Explanatory framing
4. Data sources and joins
5. Shared prep imports
6. Pipeline-specific features
7. Modeling
8. Evaluation
9. Business interpretation
10. Deployment notes

---

# Phased approach

## Phase 0: Inventory and schema understanding

### Objective

Understand the data once so the team does not repeatedly rediscover table relationships.

### Deliverables

* table map
* key relationship map
* grain map for each table
* date field inventory
* target label candidates list
* leakage risk notes

### Tasks

* document all 17 tables and their grain
* identify core join paths across donor, case, and outreach domains
* identify which tables are event-level versus monthly versus entity-level
* identify likely predictive targets for each of the 6 pipelines
* identify which fields are safe to use and which may leak future outcomes

### Most important shared code

* `load_raw_tables()`
* `standardize_column_names()`
* `parse_dates()`
* `schema_summary()`

---

## Phase 1: Shared exploratory data analysis foundation

### Objective

Do the broad EDA once and save the outputs for all later pipelines.

### Deliverables

* global data profiling notebook
* null/missingness report
* category distribution report
* date coverage report
* label feasibility report

### Tasks

* profile supporters, donations, residents, process recordings, home visitations, interventions, incidents, and social posts
* inspect counts over time
* inspect target prevalence for donor lapse, reintegration completion, incident occurrence, and donation attribution
* inspect which tables are rich enough for prediction versus better suited for explanation

### Most important shared code

* `profile_table(df)`
* `plot_missingness(df)`
* `summarize_categoricals(df)`
* `summarize_time_coverage(df, date_col)`
* `build_label_feasibility_report()`

---

## Phase 2: Shared prep and feature-engineering layer

### Objective

Build the common reusable ML prep code before building any one model deeply.

### Deliverables

* reusable prep module/package
* curated analytic tables saved to disk
* feature dictionary

### Shared datasets to create

#### 1. Supporter feature table

One row per supporter.

Suggested fields:

* first donation date
* last donation date
* donation recency
* donation frequency
* total amount donated
* average amount
* recurring donation indicator
* campaign count
* channel diversity
* donation type diversity
* acquisition channel
* social referral count
* allocation diversity

#### 2. Campaign feature table

One row per campaign or campaign-period.

Suggested fields:

* donation count
* unique donor count
* total raised
* average gift
* recurring gift share
* linked social post count
* platform mix
* time-period features

#### 3. Social post feature table

One row per post.

Suggested fields:

* platform
* post timing
* content type/category
* engagement metrics
* linked donation count
* linked donation value
* campaign linkage
* CTA-related features if derivable

#### 4. Resident feature table

One row per resident.

Suggested fields:

* safehouse
* case category and subcategory flags
* intake risk level
* current risk level
* age-related derived values
* length of stay
* incident count
* counseling count
* concern flag count
* progress flag count
* home visitation count
* intervention count
* education trend summary
* wellbeing trend summary
* reintegration status

#### 5. Resident monthly feature table

One row per resident per month or period.

Suggested fields:

* rolling incident count
* recent process recording signals
* recent emotional state changes
* recent intervention activity
* recent education attendance/performance
* recent wellbeing trend
* current risk state

This table is likely the most important shared asset for resident-related pipelines.

### Most important shared code

* `build_supporter_features()`
* `build_campaign_features()`
* `build_post_features()`
* `build_resident_features()`
* `build_resident_monthly_features()`
* `encode_features()`
* `time_split_data()`
* `make_baseline_models()`

---

## Phase 3: Build the highest-value shared-first pipelines

This phase starts with the pipelines that reuse the most common data work and produce the most visible value.

### 3A. Donor analytics branch

Build these first because they share the same donor foundation.

#### Pipeline 1: Donor Churn / Lapse Risk Prediction

Use `supporter_features` plus donation-history windows.

#### Pipeline 5: Campaign Effectiveness Explanation

Reuse donor/campaign/social aggregates.

### Why these go together

They share:

* supporters
* donations
* donation allocations
* campaign features
* much of the same cleaning and time-window logic

---

### 3B. Resident analytics branch

Build these next because they share the most complex prep.

#### Pipeline 2: Reintegration Readiness Prediction

Use `resident_features` and `resident_monthly_features`.

#### Pipeline 4: Resident Regression / Elevated Risk Prediction

Reuse the exact same resident prep foundation, but with a different target label.

#### Pipeline 6: Intervention Effectiveness Explanation

Reuse resident/intervention/process aggregates, but frame as explanation-first.

### Why these go together

They share:

* residents
* process recordings
* home visitations
* intervention plans
* incident reports
* education records
* health and wellbeing records
* the same time-based feature logic

This is the **largest shared-code cluster** in the whole project.

---

### 3C. Outreach analytics branch

Build after the common outreach table exists.

#### Pipeline 3: Social Post → Donation Prediction

Use `post_features` and linked donations.

### Why this comes after donor prep

It shares important attribution logic with the donor/campaign branch.

---

## Phase 4: Modeling framework reuse

### Objective

Avoid rewriting training/evaluation logic six times.

### Shared modeling utilities

* baseline dummy model runner
* logistic regression runner
* tree-based classifier/regressor runner
* cross-validation helper
* metric summary helper
* feature importance helper
* coefficient summary helper
* calibration helper

### Most important shared code

* `run_classification_baselines()`
* `run_regression_baselines()`
* `compare_models()`
* `evaluate_classifier()`
* `evaluate_regressor()`
* `plot_feature_importance()`
* `summarize_coefficients()`

---

## Phase 5: Notebook production and deployment

### Objective

Turn shared code + model outputs into separate deliverables without duplicating effort.

### Strategy

Each final notebook should:

* import shared prep code
* build or load the relevant analytic table
* define only pipeline-specific labels and feature subsets
* run pipeline-specific models
* include unique business interpretation
* include unique deployment notes

### Deployment reuse

You do not need six totally separate deployment architectures.

Use a shared deployment pattern:

* one backend ML service area or module
* one predictions endpoint per pipeline if needed
* shared dashboard components/patterns

### Shared deployment patterns

* risk badge widget
* ranked table widget
* explanation chart card
* insight summary card
* recommendation panel

---

# Updated recommended build order

## Build order based on shared code and value

### Step 1: Common foundation

* Phase 0
* Phase 1
* Phase 2

### Step 2: First donor branch

1. Donor Churn / Lapse Risk Prediction
2. Campaign Effectiveness Explanation

### Step 3: First resident branch

3. Reintegration Readiness Prediction
4. Resident Regression / Elevated Risk Prediction
5. Intervention Effectiveness Explanation

### Step 4: Outreach branch

6. Social Post → Donation Prediction

## Why this order is better

This is better than alternating business domains too early because it:

* minimizes duplicate prep work
* lets one team member go deep in a domain foundation
* produces reusable analytic tables earlier
* reduces notebook thrash

---

# Practical team plan

## Team structure by shared foundations

### Person A: Shared data foundation owner

* schema map
* common loaders
* date cleaning
* null handling
* reusable feature helpers

### Person B: Donor branch owner

* supporter features
* donor churn
* campaign effectiveness

### Person C: Resident branch owner

* resident features
* resident monthly features
* reintegration readiness
* resident regression

### Person D: Outreach + deployment owner

* post features
* social post → donation
* shared evaluation plots
* app integration and dashboard widgets

### Shared reviewer role across all

Everyone should help review:

* leakage
* label quality
* business interpretation
* deployment clarity

---

# Updated timeline

## Day 1

### Focus

Shared foundation only.

### Complete

* Phase 0 inventory and schema mapping
* Phase 1 broad EDA
* begin Phase 2 shared prep code

### Output

* data map
* feature plan
* candidate labels
* reusable helpers scaffolded

---

## Day 2

### Focus

Finish common prep and donor branch.

### Complete

* finish supporter/campaign/post feature tables
* complete donor churn notebook
* begin campaign effectiveness notebook

### Output

* reusable donor feature tables
* first finished pipeline

---

## Day 3

### Focus

Build resident shared foundation.

### Complete

* finish resident and resident-monthly feature tables
* complete reintegration readiness notebook
* begin resident regression notebook

### Output

* most important shared case-management table completed
* second finished pipeline

---

## Day 4

### Focus

Reuse resident code heavily.

### Complete

* complete resident regression notebook
* complete intervention effectiveness notebook
* complete campaign effectiveness notebook

### Output

* resident branch mostly done
* donor explanation notebook done

---

## Day 5

### Focus

Outreach branch and deployment polish.

### Complete

* complete social post → donation notebook
* integrate outputs into app
* finalize deployment notes
* verify all notebooks run top to bottom

---

# Final guidance

## What must be separate

These should be separate in terms of:

* business question
* target variable
* interpretation
* notebook writeup
* deployment value

## What should absolutely be shared

These should be shared:

* raw data loading
* cleaning logic
* feature engineering functions
* aggregate analytic tables
* modeling helpers
* evaluation helpers
* chart utilities
* deployment patterns

## Bottom line

Treat this as:

* **1 shared ML platform effort**
* that produces **6 distinct business pipelines**

That is the fastest and strongest way to build this project.
