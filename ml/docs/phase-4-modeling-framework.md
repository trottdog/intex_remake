# Phase 4 Modeling Framework

## Objective

Create reusable model-training, validation, and calibration helpers so later pipelines do not each re-implement the same evaluation logic.

## Shared Utilities Added

### Training

* `ml.src.modeling.train.run_classification_baselines()`
* `ml.src.modeling.train.run_regression_baselines()`
* `ml.src.modeling.train.make_baseline_models()`

### Metrics

* `ml.src.modeling.metrics.evaluate_classifier()`
* `ml.src.modeling.metrics.evaluate_regressor()`
* `ml.src.modeling.metrics.compare_models()`
* `ml.src.modeling.metrics.summarize_model_metrics()`

### Validation

* `ml.src.modeling.validation.make_cv_splitter()`
* `ml.src.modeling.validation.cross_validate_models()`
* `ml.src.modeling.validation.build_calibration_table()`
* `ml.src.modeling.validation.expected_calibration_error()`
* `ml.src.modeling.validation.summarize_calibration()`

### Tuning

* `ml.src.modeling.tune.tune_model_grid()`

## What This Phase Produces

The Phase 4 report script:

```powershell
py -3 ml/scripts/run_phase4_modeling_framework.py
```

writes:

* `ml/reports/evaluation/phase4_holdout_comparison.csv`
* `ml/reports/evaluation/phase4_cv_summary.csv`
* `ml/reports/evaluation/phase4_cv_folds.csv`
* `ml/reports/evaluation/phase4_calibration_summary.csv`
* `ml/reports/evaluation/phase4_calibration_bins.csv`

## Notes

* The Phase 3 training helpers now reuse `run_classification_baselines()` rather than duplicating per-model fit loops.
* Cross-validation defaults are safe for class-imbalanced datasets and automatically reduce the number of folds when the minority class is too small for a full 5-fold split.
* Calibration reporting is built on holdout probabilities from the best model per current predictive pipeline.

## Why This Matters

This phase gives the repo one shared modeling backbone instead of one-off evaluation code in each business pipeline. That makes it much easier to add the remaining explanatory and regression-oriented pipelines in later phases.
