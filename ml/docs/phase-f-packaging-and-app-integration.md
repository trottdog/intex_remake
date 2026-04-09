# Phase F Packaging And App Integration

## Objective
- Package every implemented predictive pipeline behind a consistent deployment contract and expose the expanded outputs in app-facing routes and pages.

## What This Phase Refreshes
* API payload examples and manifests for every predictive pipeline in `ml/app-integration/payload_examples/`.
* A contract matrix covering task type, entity type, and backend route hints.
* The shared notebook outputs so packaging stays aligned with the latest notebook metadata.

## Integration Notes
- Regression pipelines now score cleanly through the same inference path as classifiers.
- `next_donation_amount` and `resource_demand` keep their numeric forecast in `prediction` and `prediction_score`; published Supabase snapshots keep `prediction_value` null for those pipelines so the current schema stays backward compatible.
- Backend entity insight routes now cover supporters, residents, and safehouses, with facility scope checks applied to resident and safehouse lookups.
- App-facing pages now surface donor upgrade, expected next gift, expanded resident signals, and safehouse planning signals.

## Entity Insight Routes
* `/ml/residents/{residentId}/insights`
* `/ml/supporters/{supporterId}/insights`
* `/ml/safehouses/{safehouseId}/insights`

## App Surfaces Updated
* `frontend/src/pages/donor/DonorDashboardPage.tsx`
* `frontend/src/pages/admin/ResidentDetailPage.tsx`
* `frontend/src/pages/admin/SafehouseDetailPage.tsx`

## Contract Matrix
| pipeline_name | task_type | entity_type | prediction_feed_endpoint | entity_insight_endpoint |
| --- | --- | --- | --- | --- |
| case_prioritization | classification | resident | /ml/pipelines/case_prioritization/predictions | /ml/residents/{residentId}/insights |
| counseling_progress | classification | resident | /ml/pipelines/counseling_progress/predictions | /ml/residents/{residentId}/insights |
| education_improvement | classification | resident | /ml/pipelines/education_improvement/predictions | /ml/residents/{residentId}/insights |
| home_visitation_outcome | classification | resident | /ml/pipelines/home_visitation_outcome/predictions | /ml/residents/{residentId}/insights |
| reintegration_readiness | classification | resident | /ml/pipelines/reintegration_readiness/predictions | /ml/residents/{residentId}/insights |
| resident_risk | classification | resident | /ml/pipelines/resident_risk/predictions | /ml/residents/{residentId}/insights |
| capacity_pressure | classification | safehouse | /ml/pipelines/capacity_pressure/predictions | /ml/safehouses/{safehouseId}/insights |
| resource_demand | regression | safehouse | /ml/pipelines/resource_demand/predictions | /ml/safehouses/{safehouseId}/insights |
| best_posting_time | classification | social_media_post | /ml/pipelines/best_posting_time/predictions |  |
| social_media_conversion | classification | social_media_post | /ml/pipelines/social_media_conversion/predictions |  |
| donor_retention | classification | supporter | /ml/pipelines/donor_retention/predictions | /ml/supporters/{supporterId}/insights |
| donor_upgrade | classification | supporter | /ml/pipelines/donor_upgrade/predictions | /ml/supporters/{supporterId}/insights |
| next_donation_amount | regression | supporter | /ml/pipelines/next_donation_amount/predictions | /ml/supporters/{supporterId}/insights |

## Commands
* `py -3 ml/scripts/run_phase_f_packaging_integration.py`
* `py -3 ml/scripts/export_for_api.py`
* `py -3 ml/scripts/refresh_supabase_ml.py --dry-run`
* `dotnet build backend/intex/intex.sln`
