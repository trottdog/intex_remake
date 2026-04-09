# Phase 6: Frontend Integration and Nightly Ops

## What this phase adds

Phase 6 connects the predictive ML pipelines into the actual product workflow and gives the team an operational path to keep the outputs fresh.

This phase includes:

* backend ML insight endpoints for the app
* frontend decision-support surfaces that consume those endpoints
* a Supabase publishing job that rebuilds features, retrains models, and stores the latest prediction snapshots
* a GitHub Actions workflow that runs every night

---

## Frontend integration points

The React app stays backend-mediated.

The frontend does **not** connect to Supabase directly.

The new ML surfaces use these API routes:

* `GET /ml/pipelines`
* `GET /ml/pipelines/{pipelineName}/predictions`
* `GET /ml/residents/{residentId}/insights`
* `GET /ml/supporters/{supporterId}/insights`

Current app placements:

* admin dashboard: resident-risk watchlist
* resident detail page: resident risk + reintegration readiness
* donor dashboard: donor retention insight
* donors page: donor-retention watchlist
* outreach page: social post conversion watchlist

---

## Supabase refresh path

Nightly refresh now runs through:

* `ml/scripts/refresh_supabase_ml.py`

Operational flow:

1. load raw tables from Supabase/Postgres when `ML_USE_SUPABASE=true`
2. rebuild Phase 2 processed datasets
3. retrain the implemented predictive pipelines
4. rebuild Phase 4 evaluation outputs
5. refresh API payload manifests
6. publish the newest pipeline runs and prediction snapshots to Supabase tables

Important setup note:

* If your connection uses the Supabase transaction pooler on port `6543`, run `backend/docs/ml-refresh-ddl-supabase.sql` once in the Supabase SQL Editor first.
* For the nightly job, a direct Postgres connection on port `5432` is the safest choice because it also allows table bootstrap if needed.

Local dry-run command:

```powershell
py -3 ml/scripts/refresh_supabase_ml.py --dry-run
```

Live publish command:

```powershell
py -3 ml/scripts/refresh_supabase_ml.py
```

---

## GitHub Actions setup

Workflow file:

* `.github/workflows/ml-nightly-retrain.yml`

Required repository secret:

* `SUPABASE_DB_CONNECTION_STRING`

Recommended value:

* direct Postgres connection string from Supabase on port `5432`

Current schedule:

* `0 8 * * *`

Because GitHub Actions runs in UTC, that schedule is:

* `2:00 AM` in Denver during daylight saving time
* `1:00 AM` in Denver during standard time

You can also trigger the workflow manually with `workflow_dispatch`.
