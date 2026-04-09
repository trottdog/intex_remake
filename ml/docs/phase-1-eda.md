# Phase 1 Shared Exploratory Data Analysis

## Objective

Phase 1 turns the raw inventory from Phase 0 into reusable exploratory outputs so later pipelines do not repeat the same null checks, date coverage checks, and label-balance work.

Run `py -3 ml/scripts/run_phase1_eda.py` to regenerate the reports and figures.

## Deliverables Produced

- Global profiling notebook: `ml/ml-pipelines/01_global_data_profiling.ipynb`
- Null and missingness report: `ml/reports/tables/phase1_missingness_report.csv`
- Category distribution report: `ml/reports/tables/phase1_categorical_report.csv`
- Date coverage report: `ml/reports/tables/phase1_time_coverage_summary.csv` and `ml/reports/tables/phase1_time_coverage_monthly.csv`
- Label feasibility report: `ml/reports/tables/phase1_label_feasibility_report.csv`
- Visual EDA artifacts: `ml/reports/figures/phase1/`

## Key Findings

### Tables richest for predictive modeling

- `process_recordings` and `home_visitations` are the deepest case-management event streams and should drive resident activity features.
- `social_media_posts` has enough rows and direct referral metrics to support a dedicated outreach model.
- `donations` has enough supporter history to support donor churn and donor-value feature engineering.
- `education_records` and `health_wellbeing_records` are smaller than the event tables but aligned enough to support resident-month snapshots.

### Tables better suited for explanation or context

- `intervention_plans` is useful, but intervention selection bias makes it a better explanation table than a clean causal training table.
- `safehouse_monthly_metrics` is useful for site-level context and reporting, but same-month aggregates can leak outcome information.
- `public_impact_snapshots` is a reporting output, not a training-data input.
- `partners` and `partner_assignments` are valuable contextual tables but too small to anchor a standalone predictive pipeline.

## Label Feasibility Highlights

- Donor churn currently looks strongest as a first predictive task: `21 / 59` supporters are lapsed under a 180-day rule, or `35.59%`.
- Social post to donation is also strong in sample size: `522 / 812` posts have a positive referral signal, or `64.29%`.
- Resident incident forecasting is feasible but imbalanced on a resident-month view: `93 / 1533` resident-months have an incident in the next 30 days, or `6.07%`.
- Reintegration readiness is the hardest predictive target right now: `36 / 1533` resident-months reach completion in the next 90 days, or `2.35%`, and the timing depends on a proxy completion date.
- Campaign effectiveness currently has only `21` campaign-month observations across four named campaigns, so it should remain explanation-first.
- Intervention effectiveness has `180` plans with `29` achieved outcomes, which is enough for descriptive analysis but not a clean causal model.

## Recommended Phase 2 Implications

- Build supporter and campaign features first because the donor branch has the cleanest labels and the lowest leakage risk.
- Build resident-month features with explicit time cutoffs because the resident labels are much more imbalanced and leakage-prone.
- Keep free-text case notes and reporting outputs out of the default feature set until privacy and leakage review is complete.
- Prefer explanation framing for intervention and campaign analyses until stronger quasi-experimental logic is added.
