# Phase 3 Predictive Pipelines

## Objective

Turn the shared Phase 2 analytic tables into the first reusable predictive pipelines, with standard dataset builders, shared training logic, saved artifacts, and a repeatable CLI workflow.

## What Phase 3 Includes

Implemented predictive pipelines:

* `donor_retention`
* `reintegration_readiness`
* `resident_risk`
* `social_media_conversion`

Shared Phase 3 code:

* `ml/src/pipelines/common.py`
* `ml/src/pipelines/registry.py`
* `ml/scripts/train_one.py`
* `ml/scripts/run_all_pipelines.py`
* `ml/src/inference/predict.py`

## Split Strategy Notes

### Donor retention

* Uses `created_at` as the holdout split field instead of `last_donation_date`.
* This avoids a broken holdout where the most recent donors all fall into the negative class and the oldest donors all fall into the positive class.

### Reintegration readiness and resident risk

* Use `snapshot_month` with an explicit cutoff date of `2025-04-01`.
* The cutoff was chosen because the default 80/20 time split pushed all positives out of the resident-risk holdout window.

### Social media conversion

* Uses `created_at` as the holdout split field.
* Donation-derived leakage fields were dropped from the model config:
  * `donation_referrals_per_100_clicks`
  * `estimated_donation_value_per_click`
  * `estimated_donation_value_per_1k_reach`

## Current Results

Saved summary: `ml/reports/evaluation/phase3_predictive_summary.csv`

| Pipeline | Best model | Train rows | Test rows | ROC AUC | Average precision |
| --- | --- | ---: | ---: | ---: | ---: |
| donor_retention | logistic_regression | 47 | 12 | 0.8056 | 0.8889 |
| reintegration_readiness | random_forest_classifier | 756 | 777 | 0.7997 | 0.0305 |
| resident_risk | logistic_regression | 756 | 777 | 0.7930 | 0.1374 |
| social_media_conversion | random_forest_classifier | 649 | 163 | 0.9760 | 0.9840 |

## Interpretation

* `donor_retention` is the cleanest early pipeline, but it still needs a more realistic longitudinal label setup in a later phase.
* `reintegration_readiness` shows ranking signal in ROC AUC, but the label is extremely rare and still needs threshold tuning, calibration, or resampling before deployment.
* `resident_risk` is a usable early-warning baseline and is the strongest resident-facing predictive artifact so far.
* `social_media_conversion` is performing very well after leakage cleanup, though we should still treat it as optimistic until the notebook review confirms feature semantics.

## Commands

Train one pipeline:

```powershell
py -3 ml/scripts/train_one.py donor_retention
```

Train all implemented Phase 3 pipelines:

```powershell
py -3 ml/scripts/run_all_pipelines.py
```

## Artifact Locations

Per-pipeline saved artifacts:

* `ml/models/<pipeline_name>/predictive_model.joblib`
* `ml/models/<pipeline_name>/feature_list.json`
* `ml/models/<pipeline_name>/metrics.json`
* `ml/models/<pipeline_name>/model_comparison.csv`
* `ml/models/<pipeline_name>/explainability.csv`

Evaluation reports:

* `ml/reports/evaluation/<pipeline_name>_metrics.json`
* `ml/reports/evaluation/phase3_predictive_summary.csv`

Processed modeling datasets:

* `ml/data/processed/donor_retention_dataset.csv`
* `ml/data/processed/reintegration_readiness_dataset.csv`
* `ml/data/processed/resident_risk_dataset.csv`
* `ml/data/processed/social_media_conversion_dataset.csv`
