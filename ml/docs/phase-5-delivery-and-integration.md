# Phase 5 Delivery And Integration

## Objective

Turn the shared datasets, saved models, and validation outputs into final-facing delivery assets:

* notebook templates
* batch scoring utilities
* API payload examples
* deployment notes and endpoint examples

## What Was Added

### Notebook production

* `ml/scripts/build_phase5_notebooks.py`
* refreshed `ml/ml-pipelines/00_pipeline_index.ipynb`
* refreshed predictive and explanatory notebook templates across the pipeline folders

### Shared inference and export helpers

* `ml/src/inference/batch_score.py`
* `ml/src/inference/serializers.py`
* `ml/scripts/score_batch.py`
* `ml/scripts/export_for_api.py`

### App integration examples

* `ml/app-integration/api/donor_retention_endpoint_example.py`
* `ml/app-integration/api/resident_risk_endpoint_example.py`
* `ml/app-integration/api/shared_prediction_service_example.py`
* `ml/app-integration/integration_notes.md`

## Generated Deliverables

Notebook deliverables live under `ml/ml-pipelines/`.

API payload contracts are exported to `ml/app-integration/payload_examples/`:

* `<pipeline>_request.json`
* `<pipeline>_response.json`
* `<pipeline>_manifest.json`

## Shared Deployment Pattern

Recommended route pattern:

* `GET /ml/pipelines`
* `POST /ml/predict/{pipeline_name}`
* `POST /ml/score-batch/{pipeline_name}`
* `GET /ml/health`

Recommended shared widgets:

* risk badge
* ranked table
* explanation chart card
* insight summary card
* recommendation panel

## Commands

Refresh notebook templates:

```powershell
py -3 ml/scripts/build_phase5_notebooks.py
```

Export payload examples and manifests:

```powershell
py -3 ml/scripts/export_for_api.py
```

Score a batch CSV:

```powershell
py -3 ml/scripts/score_batch.py resident_risk --input path_to_input.csv
```
