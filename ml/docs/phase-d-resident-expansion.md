# Phase D Resident Expansion

## Objective
- Build the resident expansion wave on top of the existing resident-risk and reintegration foundation.

## Existing Foundation Reused
* `resident_risk` already covers the incident-risk slot from the expansion plan.
* `resident_monthly_features.csv` now carries the future-window labels used by the new resident pipelines.

## Predictive Pipelines Added
* `case_prioritization`
* `counseling_progress`
* `education_improvement`
* `home_visitation_outcome`

## Notebook-Only Tracks Added
* `wellbeing_deterioration`

## Notes
- This phase keeps wellbeing deterioration explanation-first because the current future-health sample is still relatively sparse.
- The resident snapshot table now includes reusable completeness flags for 30-, 60-, 90-, and 120-day future windows.
- `home_visitation_outcome` is included as a benchmarked predictive branch, but its current baseline still collapses to the dummy classifier and should stay exploratory until the target or feature set improves.

## Predictive Summary
| pipeline_name | best_model_name | train_rows | test_rows | sample_count | positive_count | positive_rate | accuracy | balanced_accuracy | precision | recall | f1 | roc_auc | average_precision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| case_prioritization | random_forest_classifier | 756 | 715 | 715.0 | 213.0 | 0.29790209790209793 | 0.42657342657342656 | 0.540280193778875 | 0.31992687385740404 | 0.8215962441314554 | 0.4605263157894737 | 0.6099592241363185 | 0.429288937311923 |
| counseling_progress | random_forest_classifier | 655 | 485 | 485.0 | 221.0 | 0.4556701030927835 | 0.5154639175257731 | 0.5110722610722611 | 0.46788990825688076 | 0.46153846153846156 | 0.4646924829157175 | 0.5184252022487317 | 0.5024179125798504 |
| education_improvement | logistic_regression | 756 | 653 | 653.0 | 47.0 | 0.07197549770290965 | 0.9571209800918836 | 0.8591391053999017 | 0.6862745098039216 | 0.7446808510638298 | 0.7142857142857143 | 0.9841303279264098 | 0.8045457485928328 |
| home_visitation_outcome | dummy_classifier | 612 | 427 | 427.0 | 93.0 | 0.21779859484777517 | 0.7822014051522248 | 0.5 | 0.0 | 0.0 | 0.0 | 0.5 | 0.21779859484777517 |

## Commands
* `py -3 ml/scripts/run_phase_d_resident_expansion.py`
* `py -3 ml/scripts/build_phase5_notebooks.py`
