# Phase E Strategic And Leadership Expansion

## Objective
- Build the safehouse and leadership expansion wave on top of the shared operations and donor foundations.

## Existing Foundation Reused
* `safehouse_outcomes` already covers the safehouse performance explanation branch from the expansion plan.
* `safehouse_monthly_features.csv` is now the shared time-based safehouse table for forecasting and strategic analysis.
* `public_impact_features.csv` now parses the public reporting series into a reusable notebook dataset.

## Predictive Pipelines Added
* `capacity_pressure`
* `resource_demand`

## Notebook-Only Tracks Added
* `donation_allocation_impact`
* `public_impact_forecasting`
* `donor_to_impact_personalization`

## Notes
- `capacity_pressure` is currently very strong because safehouse occupancy is highly persistent month to month; treat it as an operational early-warning signal, not as proof of broader causal drivers.
- `resource_demand` is also extremely strong because next-month resident load is highly persistent in the current series; interpret it as a near-term planning forecast, not as a rich causal demand model.
- `public_impact_forecasting` remains notebook-only because the parsed public reporting history is still too small and unstable for a strong production forecast.
- `donor_to_impact_personalization` remains notebook-only because the current donor data does not include explicit recommendation-feedback labels.

## Predictive Summary
| pipeline_name | best_model_name | train_rows | test_rows | sample_count | positive_count | positive_rate | accuracy | balanced_accuracy | precision | recall | f1 | roc_auc | average_precision | mae | rmse | r2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| capacity_pressure | random_forest_classifier | 324 | 117 | 117.0 | 13.0 | 0.1111111111111111 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |  |  |  |
| resource_demand | random_forest_regressor | 324 | 117 | 117.0 |  |  |  |  |  |  |  |  |  | 0.0 | 0.0 | 1.0 |

## Commands
* `py -3 ml/scripts/run_phase_e_strategic_expansion.py`
* `py -3 ml/scripts/build_phase5_notebooks.py`
