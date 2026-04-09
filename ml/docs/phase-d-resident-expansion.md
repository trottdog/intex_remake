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
| case_prioritization | random_forest_classifier | 756 | 715 | 715.0 | 213.0 | 0.29790209790209793 | 0.427972027972028 | 0.5426276116192508 | 0.32116788321167883 | 0.8262910798122066 | 0.46254927726675427 | 0.611820324336457 | 0.4308887912831727 |
| counseling_progress | random_forest_classifier | 655 | 485 | 485.0 | 221.0 | 0.4556701030927835 | 0.5154639175257731 | 0.5118092691622103 | 0.46846846846846846 | 0.47058823529411764 | 0.46952595936794583 | 0.5193164678458797 | 0.503712720069139 |
| education_improvement | logistic_regression | 756 | 653 | 653.0 | 47.0 | 0.07197549770290965 | 0.9540581929555896 | 0.8476757250193105 | 0.6666666666666666 | 0.723404255319149 | 0.6938775510204082 | 0.9844814268660909 | 0.8040538229881294 |
| home_visitation_outcome | dummy_classifier | 612 | 427 | 427.0 | 93.0 | 0.21779859484777517 | 0.7822014051522248 | 0.5 | 0.0 | 0.0 | 0.0 | 0.5 | 0.21779859484777517 |

## Commands
* `py -3 ml/scripts/run_phase_d_resident_expansion.py`
* `py -3 ml/scripts/build_phase5_notebooks.py`
