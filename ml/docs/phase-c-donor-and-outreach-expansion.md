# Phase C Donor And Outreach Expansion

## Objective
- Build the fastest next donor and outreach pipelines on top of the shared ML platform.

## Predictive Pipelines Added
* `donor_upgrade`
* `next_donation_amount`
* `best_posting_time`

## Notebook-Only Tracks Added
* `content_type_effectiveness`
* `donation_channel_effectiveness`
* `recurring_donor_conversion`

## Notes
- `supporter_monthly_features.csv` is now the shared donor snapshot table for future-looking donor growth work.
- `recurring_donor_conversion` remains notebook-only because the available recurring-donation history does not contain meaningful future conversion transitions.

## Predictive Summary
| pipeline_name | best_model_name | train_rows | test_rows | sample_count | positive_count | positive_rate | accuracy | balanced_accuracy | precision | recall | f1 | roc_auc | average_precision | mae | rmse | r2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| best_posting_time | logistic_regression | 649 | 163 | 163.0 | 104.0 | 0.6380368098159509 | 0.6748466257668712 | 0.6645208604954367 | 0.7684210526315789 | 0.7019230769230769 | 0.7336683417085427 | 0.735006518904824 | 0.8265668060372122 |  |  |  |
| donor_upgrade | random_forest_classifier | 1282 | 295 | 295.0 | 68.0 | 0.2305084745762712 | 0.8542372881355932 | 0.7147253174397512 | 0.8378378378378378 | 0.45588235294117646 | 0.5904761904761905 | 0.8329554288675823 | 0.7300670378775117 |  |  |  |
| next_donation_amount | random_forest_regressor | 583 | 134 | 134.0 |  |  |  |  |  |  |  |  |  | 437.8245518656713 | 599.2339849490929 | 0.5043764123570644 |

## Commands
* `py -3 ml/scripts/run_phase_c_donor_outreach.py`
* `py -3 ml/scripts/build_phase5_notebooks.py`
