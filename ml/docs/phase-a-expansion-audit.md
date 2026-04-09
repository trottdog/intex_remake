# Phase A Expansion Audit

## Review Summary
- The repo is already beyond the baseline assumed in `plan-expansion.md`: 4 predictive pipelines are implemented end to end and 2 more notebook tracks are scaffolded.
- Phase A should therefore audit predictive implementations, model artifacts, payload manifests, and notebook-only tracks, not just notebook folders.
- The fastest net-new expansion still sits in the donor and outreach branch, because those areas already have shared tables, labels, notebooks, and app delivery patterns.

## Current Pipeline Inventory
| display_name | stage | shared_dataset | predictive_target | notebooks_ready | predictive_artifacts_ready | payload_examples_ready |
| --- | --- | --- | --- | --- | --- | --- |
| Donor Retention | implemented_predictive | supporter_features | label_lapsed_180d | yes | yes | yes |
| Reintegration Readiness | implemented_predictive | resident_monthly_features | label_reintegration_complete_next_90d | yes | yes | yes |
| Resident Risk | implemented_predictive | resident_monthly_features | label_incident_next_30d | yes | yes | yes |
| Social Media Conversion | implemented_predictive | post_features | label_donation_referral_positive | yes | yes | yes |
| Donation Uplift | notebook_scaffold | campaign_features |  | yes | no | no |
| Safehouse Outcomes | notebook_scaffold | safehouse_features |  | yes | no | no |

## Completed Target Labels
| dataset | label_columns |
| --- | --- |
| post_features | label_donation_referral_positive; label_estimated_donation_value_php |
| resident_monthly_features | label_incident_next_30d; label_reintegration_complete_next_90d |
| supporter_features | label_lapsed_180d |

## Shared Analytic Tables
| dataset | row_count | column_count |
| --- | --- | --- |
| campaign_features | 21 | 27 |
| post_features | 812 | 51 |
| resident_features | 60 | 101 |
| resident_monthly_features | 1533 | 46 |
| safehouse_features | 9 | 28 |
| supporter_features | 60 | 42 |

## Reusable Helpers And Visuals
- Shared feature builders: `ml/src/features/donor_features.py`, `ml/src/features/social_features.py`, `ml/src/features/resident_features.py`, `ml/src/features/safehouse_features.py`.
- Shared modeling and validation helpers: `ml/src/pipelines/common.py`, `ml/src/modeling/train.py`, `ml/src/modeling/metrics.py`, `ml/src/modeling/validation.py`.
- Notebook and delivery helpers: `ml/scripts/build_phase5_notebooks.py`, `ml/scripts/export_for_api.py`, `ml/src/inference/predict.py`, `ml/src/inference/batch_score.py`.
- Existing visuals and report artifacts: 16 Phase 1 figures in `ml/reports/figures/phase1/` and 10 evaluation files under `ml/reports/evaluation/`.

## Partial Tracks Worth Finishing
| expansion_pipeline | primary_dataset | current_repo_assets | notes |
| --- | --- | --- | --- |
| Safehouse Performance Explanation | safehouse_features | safehouse_outcomes | A safehouse-level notebook scaffold and analytic table already exist via `safehouse_outcomes`. |

## Best Net-New Expansion Targets
| recommended_order | expansion_pipeline | primary_dataset | current_repo_assets | target_readiness | notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Donor Upgrade Likelihood | supporter_features | donor_retention; donation_uplift | new_label_needed | Best donor-branch adjacency once a future amount-growth label is added to supporter snapshots. |
| 2 | Recurring Donor Conversion | supporter_features | donor_retention | new_label_needed | Extends the donor branch with a first-recurring-within-window label and keeps the same scoring UX. |
| 3 | Best Posting Time Prediction | post_features | social_media_conversion | existing_label | Can reuse donation-linked post outcomes immediately while re-framing the feature slice around timing variables. |
| 4 | Content Type Effectiveness Explanation | post_features | social_media_conversion | existing_label | Pure explanation notebook off the existing post table, with no new shared dataset work required. |
| 5 | Donation Channel Effectiveness Explanation | campaign_features | donor_retention; donation_uplift | existing_proxy_outcomes | Can explain long-term donor value by acquisition and giving channel with today's aggregates, even before a new supervised label is added. |
| 6 | Next Donation Amount Prediction | supporter_features | donor_retention; donation_uplift | new_label_needed | Reuses the donor branch, but needs a longitudinal regression target instead of the current classification labels. |

## Highest Reuse Scores Among Near-Term Candidates
| expansion_pipeline | primary_dataset | nearest_current_assets | reuse_score | recommended_lane |
| --- | --- | --- | --- | --- |
| Donation Channel Effectiveness Explanation | campaign_features | donor_retention; donation_uplift | 18 | build_now |
| Donor Upgrade Likelihood | supporter_features | donor_retention; donation_uplift | 17 | build_now |
| Next Donation Amount Prediction | supporter_features | donor_retention; donation_uplift | 17 | build_now |
| Recurring Donor Conversion | supporter_features | donor_retention | 14 | build_now |
| Best Posting Time Prediction | post_features | social_media_conversion | 13 | build_now |
| Case Prioritization Score | resident_monthly_features | resident_risk; reintegration_readiness | 13 | build_after_donor_wave |

## Output Files
- `ml/reports/tables/phase_a_completed_vs_next_matrix.csv`
- `ml/reports/tables/phase_a_reuse_map.csv`
- `ml/docs/phase-a-expansion-audit.md`
