# Phase 2 Shared Prep and Feature Engineering

## Objective

Phase 2 creates the reusable analytic tables that later pipeline notebooks and training scripts should consume instead of rebuilding directly from raw CSVs.

## Deliverables Produced

- Shared feature builders in `ml/src/features/`
- Modeling prep helpers in `ml/src/modeling/train.py`
- Processed analytic tables in `ml/data/processed/`
- Feature dictionary in `ml/reports/tables/phase2_feature_catalog.csv`
- Dataset summary in `ml/reports/tables/phase2_dataset_summary.csv`

## Processed Tables

- `supporter_features.csv`
- `campaign_features.csv`
- `post_features.csv`
- `resident_features.csv`
- `resident_monthly_features.csv`
- `safehouse_features.csv`

## Shared Code Added

- `build_supporter_features()`
- `build_campaign_features()`
- `build_post_features()`
- `build_resident_features()`
- `build_resident_monthly_features()`
- `build_safehouse_features()`
- `encode_features()`
- `time_split_data()`
- `make_baseline_models()`

## Notes

- The shared tables intentionally keep some candidate label columns prefixed with `label_` so later pipelines can train from the same processed dataset without recomputing target logic.
- `resident_monthly_features` is the shared anchor for reintegration readiness and resident risk work.
- `supporter_features` is the shared anchor for donor churn and donation-uplift work.
- `campaign_features` and `post_features` support the campaign-effectiveness and social-conversion branches.
