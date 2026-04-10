# IS 455 Grading Readiness

This file centralizes the evidence that the ML work is reproducible enough for grading and identifies the one remaining limitation honestly.

## What Is Already Proven In-Repo

- The ML workspace has a CSV fallback path, so the grader does not need a live database to rerun core pipeline work.
- Representative predictive pipelines retrain locally and save model artifacts into `ml/models/<pipeline>/`.
- A selected subset of predictive notebooks already exists under `ml/ml-pipelines/` with executed code cells and saved outputs.
- Evaluation payloads and summary artifacts are already committed under `ml/reports/evaluation/`.
- Backend and frontend ML integration points exist:
  - `backend/intex/intex/Controllers/MlController.cs`
  - `Asset-Manager/artifacts/beacon/src/services/superadminMl.service.ts`
  - `Asset-Manager/artifacts/beacon/src/pages/donor/DonorDashboard.tsx`

## TA Fallback Path

The fallback path is the committed CSV source under `ml/data/raw/`.

- `ml/src/data/loaders.py` loads CSV by default unless `ML_USE_SUPABASE` is explicitly enabled.
- `ml/src/config/paths.py` points the default raw-data directory to `ml/data/raw/`.
- The needed raw tables are committed in the repository, so a TA can rerun representative pipelines without configuring Supabase.

## Fast Proof Commands

Install the ML test dependencies:

```powershell
py -3 -m pip install -r ml/requirements-ci.txt
```

Run the focused grading-readiness proof:

```powershell
py -3 -m pytest ml/tests/test_is455_grading_readiness.py
```

Run the broader ML readiness slice used during verification:

```powershell
py -3 -m pytest `
  ml/tests/test_phase3_pipelines.py `
  ml/tests/test_phase5_delivery.py `
  ml/tests/test_phase_b_notebook_standardization.py `
  ml/tests/test_case_prioritization_runtime.py `
  ml/tests/test_counseling_progress_runtime.py `
  ml/tests/test_education_improvement_runtime.py `
  ml/tests/test_home_visitation_outcome_runtime.py `
  ml/tests/test_reintegration_readiness_runtime.py `
  ml/tests/test_resident_risk_runtime.py
```

Verified locally on 2026-04-09:

- Result: `31 passed in 78.86s`

## Saved Outputs A TA Can Inspect

- Models: `ml/models/<pipeline>/predictive_model.joblib`
- Feature lists: `ml/models/<pipeline>/feature_list.json`
- Metrics: `ml/models/<pipeline>/metrics.json`
- Model comparisons: `ml/models/<pipeline>/model_comparison.csv`
- Evaluation payloads: `ml/reports/evaluation/<pipeline>_metrics.json`
- Validation payloads for the runtime-tested resident pipelines:
  - `ml/reports/evaluation/case_prioritization_validation.json`
  - `ml/reports/evaluation/counseling_progress_validation.json`
  - `ml/reports/evaluation/education_improvement_validation.json`
  - `ml/reports/evaluation/home_visitation_outcome_validation.json`
  - `ml/reports/evaluation/reintegration_readiness_validation.json`
  - `ml/reports/evaluation/resident_risk_validation.json`
- Executed notebook proof currently exists for this tested subset:
  - `ml/ml-pipelines/case-prioritization/case-prioritization-predictive.ipynb`
  - `ml/ml-pipelines/counseling-progress/counseling-progress-predictive.ipynb`
  - `ml/ml-pipelines/education-improvement/education-improvement-predictive.ipynb`
  - `ml/ml-pipelines/home-visitation-outcome/home-visitation-outcome-predictive.ipynb`
  - `ml/ml-pipelines/reintegration-readiness/reintegration-readiness-predictive.ipynb`
  - `ml/ml-pipelines/resident-risk/resident-risk-predictive.ipynb`

## Remaining Limitation

The repository proves grading readiness through:

- rerunnable pipeline training tests
- saved evaluation artifacts
- committed executed notebook outputs

It does not yet run notebook files headlessly in CI with a tool like `nbconvert` or `papermill`. If a TA requires literal notebook re-execution rather than rerunnable pipelines plus committed executed notebooks, that is the remaining gap.

Also, not every predictive notebook currently carries committed executed outputs. The strongest notebook-execution proof is the six-notebook subset listed above.
