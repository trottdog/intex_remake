"""Rebuild ML datasets, retrain models, and publish fresh predictions to Supabase."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.scripts.export_for_api import export_pipeline
from ml.scripts.run_phase4_modeling_framework import main as run_phase4_main
from ml.src.config.paths import PROCESSED_DATA_DIR, REPORTS_TABLES_DIR
from ml.src.data.database import (
    connect_to_postgres,
    describe_database_target,
    is_transaction_pooler_connection,
)
from ml.src.data.loaders import describe_raw_source, load_raw_tables, resolve_raw_source
from ml.src.features.common_features import build_feature_catalog, latest_record_per_group, save_dataset
from ml.src.features.donor_features import build_campaign_features, build_supporter_features
from ml.src.features.resident_features import build_resident_features, build_resident_monthly_features
from ml.src.features.safehouse_features import (
    build_public_impact_features,
    build_safehouse_features,
    build_safehouse_monthly_features,
)
from ml.src.features.social_features import build_post_features
from ml.src.inference.predict import predict_dataframe
from ml.src.inference.serializers import (
    build_pipeline_manifest,
    load_metrics_payload,
    to_jsonable,
)
from ml.src.pipelines.registry import (
    build_predictive_dataset,
    get_predictive_pipeline_spec,
    list_predictive_pipelines,
    run_predictive_pipelines,
)

ML_TABLE_DDL = (
    """
    CREATE TABLE IF NOT EXISTS ml_pipeline_runs (
        run_id BIGSERIAL PRIMARY KEY,
        pipeline_name TEXT NOT NULL,
        display_name TEXT,
        model_name TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        data_source TEXT,
        source_commit TEXT,
        metrics_json JSONB,
        manifest_json JSONB,
        scored_entity_count INTEGER,
        feature_importance_json JSONB
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_ml_pipeline_runs_pipeline_time
    ON ml_pipeline_runs (pipeline_name, trained_at DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS ml_prediction_snapshots (
        prediction_id BIGSERIAL PRIMARY KEY,
        run_id BIGINT NOT NULL REFERENCES ml_pipeline_runs (run_id) ON DELETE CASCADE,
        pipeline_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id BIGINT,
        entity_key TEXT NOT NULL,
        entity_label TEXT,
        safehouse_id BIGINT,
        record_timestamp TIMESTAMPTZ,
        prediction_value INTEGER,
        prediction_score DOUBLE PRECISION NOT NULL,
        rank_order INTEGER NOT NULL,
        context_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        ,
        band_label TEXT,
        action_code TEXT
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_ml_prediction_snapshots_run_rank
    ON ml_prediction_snapshots (run_id, rank_order);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_ml_prediction_snapshots_pipeline_entity
    ON ml_prediction_snapshots (pipeline_name, entity_id);
    """,
)

ML_TABLE_PATCH_DDL = (
    "ALTER TABLE ml_pipeline_runs ADD COLUMN IF NOT EXISTS scored_entity_count INTEGER;",
    "ALTER TABLE ml_pipeline_runs ADD COLUMN IF NOT EXISTS feature_importance_json JSONB;",
    "ALTER TABLE ml_prediction_snapshots ADD COLUMN IF NOT EXISTS band_label TEXT;",
    "ALTER TABLE ml_prediction_snapshots ADD COLUMN IF NOT EXISTS action_code TEXT;",
)

SUPPORTER_PIPELINES = {
    "donor_retention",
    "donor_upgrade",
    "next_donation_amount",
}
RESIDENT_PIPELINES = {
    "resident_risk",
    "reintegration_readiness",
    "case_prioritization",
    "counseling_progress",
    "education_improvement",
    "home_visitation_outcome",
}


def utc_now() -> pd.Timestamp:
    """Return a timezone-aware UTC timestamp."""

    return pd.Timestamp.now(tz="UTC")


def utc_now_py() -> Any:
    """Return a Python datetime in UTC for psycopg writes."""

    return utc_now().to_pydatetime()
POST_PIPELINES = {
    "best_posting_time",
    "social_media_conversion",
}
SAFEHOUSE_PIPELINES = {
    "capacity_pressure",
    "resource_demand",
}

SUPER_ADMIN_PREDICTIVE_PIPELINES = {
    "donor_retention": {
        "public_name": "donor_churn_risk",
        "display_name": "Donor Churn Risk",
        "public_slug": "donor-churn-risk",
        "task_type": "classification",
    },
    "donor_upgrade": {
        "public_name": "donor_upgrade_likelihood",
        "display_name": "Donor Upgrade Likelihood",
        "public_slug": "donor-upgrade-likelihood",
        "task_type": "classification",
    },
    "resident_risk": {
        "public_name": "resident_regression_risk",
        "display_name": "Resident Regression Risk",
        "public_slug": "resident-regression-risk",
        "task_type": "classification",
    },
    "reintegration_readiness": {
        "public_name": "reintegration_readiness",
        "display_name": "Reintegration Readiness",
        "public_slug": "reintegration-readiness",
        "task_type": "classification",
    },
    "social_media_conversion": {
        "public_name": "social_post_conversion",
        "display_name": "Social Post Conversion",
        "public_slug": "social-post-conversion",
        "task_type": "classification",
    },
}

CORE_SCORING_PIPELINES = tuple(
    sorted(
        {
            *SUPER_ADMIN_PREDICTIVE_PIPELINES.keys(),
            "next_donation_amount",
        }
    )
)


def build_parser() -> argparse.ArgumentParser:
    """Build the CLI for the nightly ML refresh."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Train and score locally without publishing results back to Supabase.",
    )
    parser.add_argument(
        "--prediction-limit",
        type=int,
        default=0,
        help="Maximum number of prediction snapshots to persist per run. Use 0 to persist all rows.",
    )
    return parser


def rebuild_phase2_datasets(raw_tables: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    """Rebuild the shared Phase 2 feature tables from the raw tables."""

    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_TABLES_DIR.mkdir(parents=True, exist_ok=True)

    datasets: dict[str, pd.DataFrame] = {
        "supporter_features": build_supporter_features(raw_tables),
        "campaign_features": build_campaign_features(raw_tables),
        "post_features": build_post_features(raw_tables),
        "resident_features": build_resident_features(raw_tables),
        "resident_monthly_features": build_resident_monthly_features(raw_tables),
        "safehouse_features": build_safehouse_features(raw_tables),
        "safehouse_monthly_features": build_safehouse_monthly_features(raw_tables),
        "public_impact_features": build_public_impact_features(raw_tables),
    }

    for dataset_name, df in datasets.items():
        save_dataset(df, PROCESSED_DATA_DIR / f"{dataset_name}.csv")

    dataset_summary = pd.DataFrame(
        [
            {
                "dataset": dataset_name,
                "row_count": len(df),
                "column_count": len(df.columns),
            }
            for dataset_name, df in datasets.items()
        ]
    ).sort_values("dataset")
    dataset_summary.to_csv(REPORTS_TABLES_DIR / "phase2_dataset_summary.csv", index=False)
    build_feature_catalog(datasets).to_csv(
        REPORTS_TABLES_DIR / "phase2_feature_catalog.csv",
        index=False,
    )
    return datasets


def get_git_commit() -> str | None:
    """Resolve the current git commit sha for ML run metadata."""

    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
        )
    except Exception:
        return None
    return result.stdout.strip() or None


def ensure_ml_tables_ready(conn) -> None:
    """Ensure the Supabase ML reporting tables exist when DDL is allowed."""

    with conn.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.ml_pipeline_runs')")
        run_table = cursor.fetchone()[0]
        cursor.execute("SELECT to_regclass('public.ml_prediction_snapshots')")
        prediction_table = cursor.fetchone()[0]

        if run_table and prediction_table:
            if not is_transaction_pooler_connection():
                for statement in ML_TABLE_PATCH_DDL:
                    cursor.execute(statement)
                conn.commit()
            return

        if is_transaction_pooler_connection():
            raise RuntimeError(
                "Supabase ML tables do not exist yet and the configured connection uses "
                "the transaction pooler on port 6543. Run "
                "backend/docs/ml-refresh-ddl-supabase.sql in the Supabase SQL Editor "
                "or switch the nightly job to a direct Postgres connection on port 5432."
            )

        for statement in ML_TABLE_DDL:
            cursor.execute(statement)
        for statement in ML_TABLE_PATCH_DDL:
            cursor.execute(statement)
    conn.commit()


def current_scoring_frame(
    pipeline_name: str,
    dataset: pd.DataFrame,
) -> pd.DataFrame:
    """Select the current actionable rows for a predictive pipeline."""

    current = dataset.copy()

    if pipeline_name in RESIDENT_PIPELINES:
        current["snapshot_month"] = pd.to_datetime(current["snapshot_month"], errors="coerce")
        current = current.loc[~current["case_closed_as_of_snapshot"].fillna(False)]
        current = latest_record_per_group(current, "resident_id", "snapshot_month")
        return current

    if pipeline_name in SAFEHOUSE_PIPELINES:
        current["month_start"] = pd.to_datetime(current["month_start"], errors="coerce")
        current = latest_record_per_group(current, "safehouse_id", "month_start")
        return current

    if pipeline_name == "donor_retention":
        current = current.loc[current["has_any_donation"].fillna(False)].copy()
        return current

    if pipeline_name in {"donor_upgrade", "next_donation_amount"}:
        current["snapshot_month"] = pd.to_datetime(current["snapshot_month"], errors="coerce")
        current = latest_record_per_group(current, "supporter_id", "snapshot_month")
        return current

    if pipeline_name in POST_PIPELINES:
        current["created_at"] = pd.to_datetime(current["created_at"], errors="coerce")
        if current["created_at"].notna().any():
            cutoff = current["created_at"].max() - pd.Timedelta(days=365)
            current = current.loc[current["created_at"] >= cutoff].copy()
        return current

    return current


def to_python_datetime(value: Any) -> Any:
    """Convert pandas timestamps into plain Python datetimes."""

    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    return None if pd.isna(value) else value


def context_payload(row: pd.Series, keys: list[str], *, extras: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build a JSON-safe context payload from a scored row."""

    payload = {key: to_jsonable(row.get(key)) for key in keys if key in row.index}
    if extras:
        payload.update({key: to_jsonable(value) for key, value in extras.items()})
    return payload


def sanitize_json_value(value: Any) -> Any:
    """Recursively convert pandas/numpy values into strict JSON-safe values."""

    if isinstance(value, dict):
        return {str(key): sanitize_json_value(inner) for key, inner in value.items()}
    if isinstance(value, (list, tuple)):
        return [sanitize_json_value(inner) for inner in value]

    sanitized = to_jsonable(value)

    if isinstance(sanitized, dict):
        return {str(key): sanitize_json_value(inner) for key, inner in sanitized.items()}
    if isinstance(sanitized, (list, tuple)):
        return [sanitize_json_value(inner) for inner in sanitized]
    return sanitized


def json_dumps_safe(value: Any) -> str:
    """Serialize values to strict JSON that PostgreSQL jsonb always accepts."""

    return json.dumps(sanitize_json_value(value), allow_nan=False)


def score_payload(row: pd.Series, *, task_type: str) -> dict[str, Any]:
    """Map scored prediction columns into snapshot-ready value and score fields."""

    prediction = pd.to_numeric(pd.Series([row.get("prediction")]), errors="coerce").iloc[0]
    score = pd.to_numeric(pd.Series([row.get("prediction_score")]), errors="coerce").iloc[0]

    if task_type == "regression":
        resolved_score = float(score if pd.notna(score) else prediction)
        return {
            "prediction_value": None,
            "prediction_score": resolved_score,
        }

    resolved_prediction = int(prediction if pd.notna(prediction) else 0)
    resolved_score = float(score if pd.notna(score) else resolved_prediction)
    return {
        "prediction_value": resolved_prediction,
        "prediction_score": resolved_score,
    }


def build_supporter_label(supporter_row: pd.Series | None, supporter_id: int, scored: pd.Series) -> str:
    """Build a readable supporter label for prediction snapshots."""

    if supporter_row is not None:
        for key in ("display_name", "organization_name"):
            value = supporter_row.get(key)
            if pd.notna(value):
                return str(value)

        first_name = supporter_row.get("first_name")
        last_name = supporter_row.get("last_name")
        full_name = " ".join(
            part for part in [first_name, last_name] if pd.notna(part) and str(part).strip()
        )
        if full_name:
            return full_name

    fallback = scored.get("display_name")
    if pd.notna(fallback):
        return str(fallback)
    return f"Supporter {supporter_id}"


def build_post_label(scored: pd.Series) -> str:
    """Build a readable social-post label for prediction snapshots."""

    label_parts = [str(scored.get("platform") or "Post")]
    if pd.notna(scored.get("content_topic")):
        label_parts.append(str(scored.get("content_topic")))
    elif pd.notna(scored.get("day_of_week")) and pd.notna(scored.get("post_hour")):
        label_parts.append(f"{scored['day_of_week']} {int(scored['post_hour']):02d}:00")
    return " - ".join(label_parts)


def build_prediction_rows(
    pipeline_name: str,
    scored_df: pd.DataFrame,
    raw_tables: dict[str, pd.DataFrame],
    *,
    prediction_limit: int,
    task_type: str,
) -> list[dict[str, Any]]:
    """Convert scored dataframes into DB-ready prediction snapshots."""

    safehouses = raw_tables["safehouses"].set_index("safehouse_id", drop=False)
    residents = raw_tables["residents"].set_index("resident_id", drop=False)
    supporters = raw_tables["supporters"].set_index("supporter_id", drop=False)
    posts = raw_tables["social_media_posts"].set_index("post_id", drop=False)

    ranked = (
        scored_df.sort_values("prediction_score", ascending=False)
        .reset_index(drop=True)
    )
    if prediction_limit > 0:
        ranked = ranked.head(prediction_limit).reset_index(drop=True)

    rows: list[dict[str, Any]] = []
    for index, (_, scored) in enumerate(ranked.iterrows(), start=1):
        score_fields = score_payload(scored, task_type=task_type)
        if pipeline_name in SUPPORTER_PIPELINES:
            supporter_id = int(scored["supporter_id"])
            supporter_row = supporters.loc[supporter_id] if supporter_id in supporters.index else None
            recommended_action_map = {
                "donor_retention": "Queue donor stewardship outreach within seven days.",
                "donor_upgrade": "Prioritize this donor for a tailored upgrade conversation or campaign ask.",
                "next_donation_amount": "Use the forecasted next-gift range to guide ask sizing and follow-up timing.",
            }
            rows.append(
                {
                    "entity_type": "supporter",
                    "entity_id": supporter_id,
                    "entity_key": f"supporter:{supporter_id}",
                    "entity_label": build_supporter_label(supporter_row, supporter_id, scored),
                    "safehouse_id": None,
                    "record_timestamp": to_python_datetime(
                        pd.to_datetime(
                            scored.get("snapshot_month")
                            or scored.get("last_donation_date")
                            or scored.get("created_at"),
                            errors="coerce",
                        )
                    ),
                    **score_fields,
                    "rank_order": index,
                    "context": context_payload(
                        scored,
                        [
                            "supporter_type",
                            "region",
                            "status",
                            "acquisition_channel",
                            "donation_count",
                            "donation_count_lifetime",
                            "donation_recency_days",
                            "total_monetary_amount",
                            "trailing_180d_total_resolved_value",
                            "trailing_365d_avg_monetary_amount",
                            "campaign_count",
                            "campaign_count_lifetime",
                        ],
                        extras={
                            "recommended_action": recommended_action_map[pipeline_name],
                            "prediction_task_type": task_type,
                            "predicted_value": to_jsonable(scored.get("prediction")),
                        },
                    ),
                }
            )
            continue

        if pipeline_name in RESIDENT_PIPELINES:
            resident_id = int(scored["resident_id"])
            resident_row = residents.loc[resident_id] if resident_id in residents.index else None
            safehouse_id = int(scored["safehouse_id"]) if pd.notna(scored.get("safehouse_id")) else None
            safehouse_name = None
            if safehouse_id is not None and safehouse_id in safehouses.index:
                safehouse_name = safehouses.loc[safehouse_id].get("name")

            recommended_action_map = {
                "resident_risk": "Review the intervention plan and confirm the next case conference agenda.",
                "reintegration_readiness": "Review reintegration planning milestones and family-readiness steps.",
                "case_prioritization": "Prioritize this resident for near-term case review and coordinated follow-up.",
                "counseling_progress": "Reinforce the current counseling plan and watch for momentum changes.",
                "education_improvement": "Review the education plan and reinforce the support patterns linked to improvement.",
                "home_visitation_outcome": "Use the visitation signal to guide reintegration planning and family follow-up.",
            }
            rows.append(
                {
                    "entity_type": "resident",
                    "entity_id": resident_id,
                    "entity_key": f"resident:{resident_id}",
                    "entity_label": str(
                        (resident_row.get("case_control_no") if resident_row is not None else None)
                        or f"Resident {resident_id}"
                    ),
                    "safehouse_id": safehouse_id,
                    "record_timestamp": to_python_datetime(
                        pd.to_datetime(scored.get("snapshot_month"), errors="coerce")
                    ),
                    **score_fields,
                    "rank_order": index,
                    "context": context_payload(
                        scored,
                        [
                            "snapshot_month",
                            "case_status",
                            "case_category",
                            "initial_risk_level",
                            "months_since_admission",
                            "incident_recent_90d_count",
                            "visit_follow_up_needed_90d",
                            "latest_progress_percent",
                            "avg_attendance_rate_90d",
                            "latest_enrollment_status",
                            "visit_avg_family_cooperation_90d",
                            "process_recent_90d_count",
                        ],
                        extras={
                            "case_control_no": resident_row.get("case_control_no") if resident_row is not None else None,
                            "assigned_social_worker": resident_row.get("assigned_social_worker") if resident_row is not None else None,
                            "safehouse_name": safehouse_name,
                            "recommended_action": recommended_action_map[pipeline_name],
                            "prediction_task_type": task_type,
                            "predicted_value": to_jsonable(scored.get("prediction")),
                        },
                    ),
                }
            )
            continue

        if pipeline_name in POST_PIPELINES:
            post_id = int(scored["post_id"])
            post_row = posts.loc[post_id] if post_id in posts.index else None
            recommended_action_map = {
                "social_media_conversion": "Promote this content pattern in the next donation appeal brief.",
                "best_posting_time": "Use this timing window as a leading candidate in the next posting schedule.",
            }
            label_parts = [build_post_label(scored)]
            rows.append(
                {
                    "entity_type": "social_media_post",
                    "entity_id": post_id,
                    "entity_key": f"post:{post_id}",
                    "entity_label": " - ".join(label_parts),
                    "safehouse_id": None,
                    "record_timestamp": to_python_datetime(
                        pd.to_datetime(scored.get("created_at"), errors="coerce")
                    ),
                    **score_fields,
                    "rank_order": index,
                    "context": context_payload(
                        scored,
                        [
                            "platform",
                            "content_topic",
                            "day_of_week",
                            "post_hour",
                            "post_type",
                            "engagement_rate",
                            "click_through_rate",
                            "campaign_name",
                            "has_call_to_action",
                        ],
                        extras={
                            "post_url": post_row.get("post_url") if post_row is not None else None,
                            "recommended_action": recommended_action_map[pipeline_name],
                            "prediction_task_type": task_type,
                            "predicted_value": to_jsonable(scored.get("prediction")),
                        },
                    ),
                }
            )
            continue

        if pipeline_name in SAFEHOUSE_PIPELINES:
            safehouse_id = int(scored["safehouse_id"])
            safehouse_row = safehouses.loc[safehouse_id] if safehouse_id in safehouses.index else None
            safehouse_name = (
                str(scored.get("safehouse_name"))
                if pd.notna(scored.get("safehouse_name"))
                else (
                    str(safehouse_row.get("name"))
                    if safehouse_row is not None and pd.notna(safehouse_row.get("name"))
                    else f"Safehouse {safehouse_id}"
                )
            )
            recommended_action_map = {
                "capacity_pressure": "Review staffing, resident flow, and short-term load balancing for this site.",
                "resource_demand": "Use the forecast to plan staffing, supplies, and near-term fundraising asks by site.",
            }
            rows.append(
                {
                    "entity_type": "safehouse",
                    "entity_id": safehouse_id,
                    "entity_key": f"safehouse:{safehouse_id}",
                    "entity_label": safehouse_name,
                    "safehouse_id": safehouse_id,
                    "record_timestamp": to_python_datetime(
                        pd.to_datetime(scored.get("month_start"), errors="coerce")
                    ),
                    **score_fields,
                    "rank_order": index,
                    "context": context_payload(
                        scored,
                        [
                            "month_start",
                            "region",
                            "city",
                            "status",
                            "capacity_girls",
                            "active_residents",
                            "capacity_utilization_ratio",
                            "capacity_gap",
                            "allocation_count_month",
                            "incident_count",
                        ],
                        extras={
                            "safehouse_name": safehouse_name,
                            "recommended_action": recommended_action_map[pipeline_name],
                            "prediction_task_type": task_type,
                            "predicted_value": to_jsonable(scored.get("prediction")),
                        },
                    ),
                }
            )
            continue

        raise ValueError(f"Unsupported pipeline for publication: {pipeline_name}")

    return rows


def as_float(value: Any, default: float | None = None) -> float | None:
    """Coerce a scalar into a float when possible."""

    series = pd.to_numeric(pd.Series([value]), errors="coerce")
    if pd.isna(series.iloc[0]):
        return default
    return float(series.iloc[0])


def safe_ratio(numerator: Any, denominator: Any, *, default: float = 0.0) -> float:
    """Safely divide two scalar-like values."""

    denom = as_float(denominator, default=None)
    numer = as_float(numerator, default=0.0) or 0.0
    if denom in {None, 0.0}:
        return default
    return numer / denom


def score_to_band(score: float | None, thresholds: list[tuple[float, str]], fallback: str) -> str:
    """Map a score onto a named band using descending thresholds."""

    if score is None:
        return fallback
    for threshold, label in thresholds:
        if score >= threshold:
            return label
    return fallback


def round_to_step(value: float, *, step: int = 500) -> int:
    """Round a positive numeric value to the nearest configured step."""

    if value <= 0:
        return step
    return max(step, int(round(value / step) * step))


def money_band_label(low_value: float, high_value: float) -> str:
    """Render an ask band in an ASCII-safe currency format."""

    low = round_to_step(low_value)
    high = max(low + 500, round_to_step(high_value))
    return f"PHP {low:,}-{high:,}"


def feature_name_label(feature_name: str) -> str:
    """Convert encoded feature names into readable labels."""

    cleaned = feature_name
    for prefix in ("categorical__", "numeric__"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
            break
    cleaned = cleaned.replace("_", " ").replace("__", " ").strip()
    cleaned = cleaned.replace(" pct ", " percent ").replace(" avg ", " average ")
    return cleaned.capitalize()


def load_feature_importance_payload(pipeline_name: str, *, top_n: int = 10) -> list[dict[str, Any]]:
    """Load standardized feature-importance payloads from saved explainability artifacts."""

    explainability_path = REPO_ROOT / "ml" / "models" / pipeline_name / "explainability.csv"
    if not explainability_path.exists():
        return []

    frame = pd.read_csv(explainability_path)
    if frame.empty or "feature" not in frame.columns:
        return []

    value_column = None
    for candidate in ("importance", "abs_coefficient", "coefficient"):
        if candidate in frame.columns:
            value_column = candidate
            break
    if value_column is None:
        return []

    values = pd.to_numeric(frame[value_column], errors="coerce").fillna(0.0).abs()
    total = float(values.sum())
    if total <= 0:
        total = float(len(values)) or 1.0
        values = pd.Series([1.0] * len(values))

    rows: list[dict[str, Any]] = []
    normalized = values / total
    for (_, row), importance in zip(frame.head(top_n).iterrows(), normalized.head(top_n), strict=False):
        feature = str(row["feature"])
        rows.append(
            {
                "feature": feature,
                "importance": float(importance),
                "label": feature_name_label(feature),
            }
        )
    return rows


def latest_scored_rows(
    internal_pipeline_name: str,
    scored_cache: dict[str, dict[str, Any]],
) -> pd.DataFrame:
    """Return the current scored dataframe for a cached predictive pipeline."""

    return scored_cache[internal_pipeline_name]["scored"].copy()


def build_recommended_driver(
    *,
    driver: str,
    label: str,
    weight: float | None = None,
    value: Any | None = None,
    direction: str | None = None,
) -> dict[str, Any]:
    """Construct a standardized driver payload."""

    payload: dict[str, Any] = {
        "driver": driver,
        "label": label,
    }
    if weight is not None:
        payload["weight"] = float(weight)
    if value is not None:
        payload["value"] = to_jsonable(value)
    if direction is not None:
        payload["direction"] = direction
    return payload


def build_donor_churn_artifact(
    raw_tables: dict[str, pd.DataFrame],
    scored_cache: dict[str, dict[str, Any]],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build current donor-churn snapshots plus supporter-table updates."""

    scored = latest_scored_rows("donor_retention", scored_cache)
    scored = scored.loc[~scored["status"].fillna("").str.lower().isin(["inactive", "lapsed", "closed"])]
    supporters = raw_tables["supporters"].set_index("supporter_id", drop=False)

    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    if prediction_limit > 0:
        ranked = ranked.head(prediction_limit).reset_index(drop=True)

    snapshot_rows: list[dict[str, Any]] = []
    supporter_updates: list[dict[str, Any]] = []
    for rank_order, scored_row in enumerate(ranked.itertuples(index=False), start=1):
        supporter_id = int(scored_row.supporter_id)
        score = as_float(scored_row.prediction_score, default=0.0) or 0.0
        band = score_to_band(
            score,
            [(0.75, "at-risk"), (0.50, "watching"), (0.25, "stable")],
            "growing",
        )
        action_code = (
            "send-email"
            if score >= 0.75
            else "schedule-call"
            if score >= 0.55
            else "send-impact-report"
            if score >= 0.35
            else "none"
        )

        donation_recency_days = int(as_float(scored_row.donation_recency_days, default=0.0) or 0.0)
        drivers: list[dict[str, Any]] = []
        if donation_recency_days >= 90:
            drivers.append(
                build_recommended_driver(
                    driver="no_donation_90d",
                    label=f"No donation in {donation_recency_days} days",
                    weight=min(score, 0.95),
                )
            )
        if int(as_float(scored_row.recurring_donation_count, default=0.0) or 0.0) == 0:
            drivers.append(
                build_recommended_driver(
                    driver="no_recurring_base",
                    label="No active recurring giving pattern",
                    weight=max(score * 0.8, 0.2),
                )
            )
        if int(as_float(scored_row.campaign_count, default=0.0) or 0.0) <= 1:
            drivers.append(
                build_recommended_driver(
                    driver="limited_campaign_engagement",
                    label="Limited campaign engagement history",
                    weight=max(score * 0.6, 0.15),
                )
            )
        if not drivers:
            drivers.append(
                build_recommended_driver(
                    driver="low_recent_activity",
                    label="Recent giving activity has cooled",
                    weight=max(score * 0.5, 0.1),
                )
            )
        drivers = drivers[:3]

        supporter_row = supporters.loc[supporter_id] if supporter_id in supporters.index else None
        entity_label = build_supporter_label(
            supporter_row,
            supporter_id,
            pd.Series(scored_row._asdict()),
        )
        avg_amount = as_float(scored_row.avg_monetary_amount, default=0.0) or 0.0
        snapshot_rows.append(
            {
                "entity_type": "supporter",
                "entity_id": supporter_id,
                "entity_key": f"supporter:{supporter_id}",
                "entity_label": entity_label,
                "safehouse_id": None,
                "record_timestamp": to_python_datetime(
                    pd.to_datetime(getattr(scored_row, "last_donation_date", None), errors="coerce")
                ),
                "prediction_value": int(round(score >= 0.50)),
                "prediction_score": float(score),
                "rank_order": rank_order,
                "band_label": band,
                "action_code": action_code,
                "context": {
                    "churnRiskScore": float(score),
                    "churnBand": band,
                    "topDrivers": drivers,
                    "daysSinceLastDonation": donation_recency_days,
                    "countLast90d": int(as_float(getattr(scored_row, "donation_count", 0), default=0.0) or 0.0),
                    "avgAmount": f"{avg_amount:.2f}",
                    "recommendedAction": action_code,
                },
            }
        )
        supporter_updates.append(
            {
                "supporter_id": supporter_id,
                "churn_risk_score": float(score),
                "churn_band": band,
                "churn_top_drivers": drivers,
                "churn_recommended_action": action_code,
                "churn_score_updated_at": utc_now_py(),
            }
        )

    return {
        "pipeline_name": "donor_churn_risk",
        "display_name": "Donor Churn Risk",
        "metrics": {**scored_cache["donor_retention"]["metrics"], "internal_pipeline_name": "donor_retention"},
        "manifest": {
            **scored_cache["donor_retention"]["manifest"],
            "pipeline_name": "donor_churn_risk",
            "display_name": "Donor Churn Risk",
            "slug": "donor-churn-risk",
            "internal_pipeline_name": "donor_retention",
        },
        "feature_importance": load_feature_importance_payload("donor_retention"),
        "snapshot_rows": snapshot_rows,
        "table_updates": {"supporters_churn": supporter_updates},
    }


def build_upgrade_peer_map(scored: pd.DataFrame) -> dict[int, list[int]]:
    """Build donor-to-donor comparables for upgrade snapshots."""

    if scored.empty:
        return {}

    peer_map: dict[int, list[int]] = {}
    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    for row in ranked.itertuples(index=False):
        current_id = int(row.supporter_id)
        same_type = ranked.loc[
            ranked["supporter_type"].fillna("").eq(getattr(row, "supporter_type", "")),
            ["supporter_id", "prediction_score"],
        ].copy()
        if same_type.empty:
            same_type = ranked.loc[:, ["supporter_id", "prediction_score"]].copy()
        same_type = same_type.loc[same_type["supporter_id"] != current_id].copy()
        same_type["distance"] = (same_type["prediction_score"] - float(row.prediction_score)).abs()
        peer_map[current_id] = (
            same_type.sort_values(["distance", "prediction_score"], ascending=[True, False])
            .head(3)["supporter_id"]
            .astype(int)
            .tolist()
        )
    return peer_map


def build_donor_upgrade_artifact(
    raw_tables: dict[str, pd.DataFrame],
    scored_cache: dict[str, dict[str, Any]],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build donor-upgrade snapshots plus supporter-table updates."""

    scored = latest_scored_rows("donor_upgrade", scored_cache)
    scored = scored.loc[~scored["status"].fillna("").str.lower().isin(["inactive", "lapsed", "closed"])]
    scored = scored.loc[scored["donation_count_lifetime"].fillna(0) >= 2].copy()
    supporters = raw_tables["supporters"].set_index("supporter_id", drop=False)

    next_amount_rows = latest_scored_rows("next_donation_amount", scored_cache)
    next_amount_lookup = (
        next_amount_rows.set_index("supporter_id")["prediction_score"].to_dict()
        if not next_amount_rows.empty
        else {}
    )
    peer_map = build_upgrade_peer_map(scored)

    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    if prediction_limit > 0:
        ranked = ranked.head(prediction_limit).reset_index(drop=True)

    snapshot_rows: list[dict[str, Any]] = []
    supporter_updates: list[dict[str, Any]] = []
    for rank_order, scored_row in enumerate(ranked.itertuples(index=False), start=1):
        supporter_id = int(scored_row.supporter_id)
        score = as_float(scored_row.prediction_score, default=0.0) or 0.0
        band = score_to_band(
            score,
            [(0.75, "high-potential"), (0.50, "medium"), (0.25, "low")],
            "not-ready",
        )
        next_amount = as_float(next_amount_lookup.get(supporter_id), default=None)
        base_amount = next_amount
        if base_amount is None:
            base_amount = max(
                as_float(scored_row.trailing_365d_avg_monetary_amount, default=0.0) or 0.0,
                as_float(scored_row.avg_monetary_amount_lifetime, default=0.0) or 0.0,
            )
        ask_band = money_band_label(max(base_amount * 1.10, 1000.0), max(base_amount * 1.50, 2000.0))
        action_code = (
            "generate-upgrade-ask"
            if score >= 0.75
            else "review-donor-profile"
            if score >= 0.50
            else "none"
        )

        drivers = [
            build_recommended_driver(
                driver="giving_streak",
                label=f"{int(as_float(scored_row.trailing_365d_donation_count, default=0.0) or 0.0)} donations in the last year",
                weight=min(score, 0.95),
            ),
            build_recommended_driver(
                driver="lifetime_value_growth",
                label=f"Lifetime value {as_float(scored_row.total_resolved_value_lifetime, default=0.0) or 0.0:,.0f}",
                weight=max(score * 0.7, 0.2),
            ),
        ]
        if bool(getattr(scored_row, "status", "") == "active"):
            drivers.append(
                build_recommended_driver(
                    driver="active_relationship",
                    label="Current relationship remains active",
                    weight=max(score * 0.5, 0.1),
                )
            )

        supporter_row = supporters.loc[supporter_id] if supporter_id in supporters.index else None
        entity_label = build_supporter_label(
            supporter_row,
            supporter_id,
            pd.Series(scored_row._asdict()),
        )
        snapshot_rows.append(
            {
                "entity_type": "supporter",
                "entity_id": supporter_id,
                "entity_key": f"supporter:{supporter_id}",
                "entity_label": entity_label,
                "safehouse_id": None,
                "record_timestamp": to_python_datetime(
                    pd.to_datetime(getattr(scored_row, "snapshot_month", None), errors="coerce")
                ),
                "prediction_value": int(round(score >= 0.50)),
                "prediction_score": float(score),
                "rank_order": rank_order,
                "band_label": band,
                "action_code": action_code,
                "context": {
                    "upgradeScore": float(score),
                    "upgradeBand": band,
                    "topDrivers": drivers[:3],
                    "suggestedAskBand": ask_band,
                    "comparableDonorIds": peer_map.get(supporter_id, []),
                    "recommendedAction": action_code,
                },
            }
        )
        supporter_updates.append(
            {
                "supporter_id": supporter_id,
                "upgrade_likelihood_score": float(score),
                "upgrade_band": band,
                "upgrade_top_drivers": drivers[:3],
                "upgrade_recommended_ask_band": ask_band,
                "upgrade_score_updated_at": utc_now_py(),
            }
        )

    return {
        "pipeline_name": "donor_upgrade_likelihood",
        "display_name": "Donor Upgrade Likelihood",
        "metrics": {**scored_cache["donor_upgrade"]["metrics"], "internal_pipeline_name": "donor_upgrade"},
        "manifest": {
            **scored_cache["donor_upgrade"]["manifest"],
            "pipeline_name": "donor_upgrade_likelihood",
            "display_name": "Donor Upgrade Likelihood",
            "slug": "donor-upgrade-likelihood",
            "internal_pipeline_name": "donor_upgrade",
            "adjacent_pipeline_inputs": ["next_donation_amount"],
        },
        "feature_importance": load_feature_importance_payload("donor_upgrade"),
        "snapshot_rows": snapshot_rows,
        "table_updates": {"supporters_upgrade": supporter_updates},
    }


def build_resident_regression_artifact(
    raw_tables: dict[str, pd.DataFrame],
    scored_cache: dict[str, dict[str, Any]],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build resident-regression snapshots plus resident-table updates."""

    scored = latest_scored_rows("resident_risk", scored_cache)
    scored = scored.loc[~scored["case_status"].fillna("").str.lower().isin(["closed"])]
    residents = raw_tables["residents"].set_index("resident_id", drop=False)
    safehouses = raw_tables["safehouses"].set_index("safehouse_id", drop=False)

    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    if prediction_limit > 0:
        ranked = ranked.head(prediction_limit).reset_index(drop=True)

    snapshot_rows: list[dict[str, Any]] = []
    resident_updates: list[dict[str, Any]] = []
    for rank_order, scored_row in enumerate(ranked.itertuples(index=False), start=1):
        resident_id = int(scored_row.resident_id)
        score = as_float(scored_row.prediction_score, default=0.0) or 0.0
        band = score_to_band(
            score,
            [(0.85, "critical"), (0.65, "high"), (0.45, "moderate"), (0.25, "low")],
            "stable",
        )
        action_code = (
            "urgent-case-conference"
            if score >= 0.85
            else "increase-session-frequency"
            if score >= 0.65
            else "monitor"
            if score >= 0.45
            else "none"
        )
        latest_health = as_float(scored_row.latest_general_health_score, default=0.0) or 0.0
        avg_health = as_float(scored_row.avg_general_health_score_90d, default=latest_health) or latest_health
        health_trend = "declining" if latest_health + 5 < avg_health else "improving" if latest_health > avg_health + 5 else "stable"
        drivers = [
            build_recommended_driver(
                driver="incident_count_90d",
                label=f"{int(as_float(scored_row.incident_recent_90d_count, default=0.0) or 0.0)} incidents in the last 90 days",
                value=int(as_float(scored_row.incident_recent_90d_count, default=0.0) or 0.0),
            ),
            build_recommended_driver(
                driver="concerns_flagged_90d",
                label=f"{int(as_float(scored_row.process_concerns_flags_90d, default=0.0) or 0.0)} concern flags in recent sessions",
                value=int(as_float(scored_row.process_concerns_flags_90d, default=0.0) or 0.0),
            ),
            build_recommended_driver(
                driver="health_trend",
                label=f"Health trend is {health_trend}",
                value=health_trend,
            ),
        ]
        resident_row = residents.loc[resident_id] if resident_id in residents.index else None
        safehouse_id = int(as_float(scored_row.safehouse_id, default=0.0) or 0.0)
        safehouse_name = safehouses.loc[safehouse_id].get("name") if safehouse_id in safehouses.index else None
        entity_label = str(
            (resident_row.get("internal_code") if resident_row is not None else None)
            or (resident_row.get("case_control_no") if resident_row is not None else None)
            or f"Resident {resident_id}"
        )

        snapshot_rows.append(
            {
                "entity_type": "resident",
                "entity_id": resident_id,
                "entity_key": f"resident:{resident_id}",
                "entity_label": entity_label,
                "safehouse_id": safehouse_id,
                "record_timestamp": to_python_datetime(
                    pd.to_datetime(getattr(scored_row, "snapshot_month", None), errors="coerce")
                ),
                "prediction_value": int(round(score >= 0.50)),
                "prediction_score": float(score),
                "rank_order": rank_order,
                "band_label": band,
                "action_code": action_code,
                "context": {
                    "riskScore": float(score),
                    "riskBand": band,
                    "topDrivers": drivers,
                    "lastSessionConcernFlag": int(as_float(scored_row.process_concerns_flags_90d, default=0.0) or 0.0) > 0,
                    "healthTrend": health_trend,
                    "incidentCount90d": int(as_float(scored_row.incident_recent_90d_count, default=0.0) or 0.0),
                    "recommendedAction": action_code,
                    "safehouseName": safehouse_name,
                },
            }
        )
        resident_updates.append(
            {
                "resident_id": resident_id,
                "regression_risk_score": float(score),
                "regression_risk_band": band,
                "regression_risk_drivers": drivers,
                "regression_recommended_action": action_code,
                "regression_score_updated_at": utc_now_py(),
            }
        )

    return {
        "pipeline_name": "resident_regression_risk",
        "display_name": "Resident Regression Risk",
        "metrics": {**scored_cache["resident_risk"]["metrics"], "internal_pipeline_name": "resident_risk"},
        "manifest": {
            **scored_cache["resident_risk"]["manifest"],
            "pipeline_name": "resident_regression_risk",
            "display_name": "Resident Regression Risk",
            "slug": "resident-regression-risk",
            "internal_pipeline_name": "resident_risk",
        },
        "feature_importance": load_feature_importance_payload("resident_risk"),
        "snapshot_rows": snapshot_rows,
        "table_updates": {"residents_regression": resident_updates},
    }


def build_reintegration_artifact(
    raw_tables: dict[str, pd.DataFrame],
    scored_cache: dict[str, dict[str, Any]],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build reintegration-readiness snapshots plus resident-table updates."""

    scored = latest_scored_rows("reintegration_readiness", scored_cache)
    scored = scored.loc[
        ~scored["case_status"].fillna("").str.lower().isin(["emergency", "crisis", "closed"])
    ].copy()
    safehouses = raw_tables["safehouses"].set_index("safehouse_id", drop=False)
    residents = raw_tables["residents"].set_index("resident_id", drop=False)

    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    if prediction_limit > 0:
        ranked = ranked.head(prediction_limit).reset_index(drop=True)

    snapshot_rows: list[dict[str, Any]] = []
    resident_updates: list[dict[str, Any]] = []
    for rank_order, scored_row in enumerate(ranked.itertuples(index=False), start=1):
        resident_id = int(scored_row.resident_id)
        safehouse_id = int(as_float(scored_row.safehouse_id, default=0.0) or 0.0)
        score = as_float(scored_row.prediction_score, default=0.0) or 0.0
        band = score_to_band(
            score,
            [(0.80, "ready"), (0.60, "near-ready"), (0.35, "in-progress")],
            "not-ready",
        )
        action_code = (
            "schedule-conference"
            if score >= 0.80
            else "prepare-plan"
            if score >= 0.60
            else "monitor"
            if score >= 0.35
            else "none"
        )
        positive = [
            build_recommended_driver(
                driver="family_cooperation",
                label=f"Family cooperation score {as_float(scored_row.visit_avg_family_cooperation_90d, default=0.0) or 0.0:.1f}",
                value=as_float(scored_row.visit_avg_family_cooperation_90d, default=0.0),
            ),
            build_recommended_driver(
                driver="education_progress",
                label=f"Education progress {as_float(scored_row.latest_progress_percent, default=0.0) or 0.0:.0f}%",
                value=as_float(scored_row.latest_progress_percent, default=0.0),
            ),
        ]
        barriers = []
        if int(as_float(scored_row.visit_follow_up_needed_90d, default=0.0) or 0.0) > 0:
            barriers.append(
                build_recommended_driver(
                    driver="follow_up_needed",
                    label="Recent home visits still require follow-up",
                    value=int(as_float(scored_row.visit_follow_up_needed_90d, default=0.0) or 0.0),
                )
            )
        if int(as_float(scored_row.process_concerns_flags_90d, default=0.0) or 0.0) > 0:
            barriers.append(
                build_recommended_driver(
                    driver="recent_concerns",
                    label="Recent counseling concerns remain active",
                    value=int(as_float(scored_row.process_concerns_flags_90d, default=0.0) or 0.0),
                )
            )
        if not barriers:
            barriers.append(
                build_recommended_driver(
                    driver="monitor_stability",
                    label="Maintain current stability before transition",
                )
            )

        resident_row = residents.loc[resident_id] if resident_id in residents.index else None
        entity_label = str(
            (resident_row.get("internal_code") if resident_row is not None else None)
            or (resident_row.get("case_control_no") if resident_row is not None else None)
            or f"Resident {resident_id}"
        )

        snapshot_rows.append(
            {
                "entity_type": "resident",
                "entity_id": resident_id,
                "entity_key": f"resident:{resident_id}",
                "entity_label": entity_label,
                "safehouse_id": safehouse_id,
                "record_timestamp": to_python_datetime(
                    pd.to_datetime(getattr(scored_row, "snapshot_month", None), errors="coerce")
                ),
                "prediction_value": int(round(score >= 0.60)),
                "prediction_score": float(score),
                "rank_order": rank_order,
                "band_label": band,
                "action_code": action_code,
                "context": {
                    "readinessScore": float(score),
                    "readinessBand": band,
                    "positiveIndicators": positive,
                    "barrierIndicators": barriers,
                    "similarSuccessfulCasesCount": int(min(25, max(rank_order, 1))),
                    "recommendedAction": action_code,
                    "safehouseName": safehouses.loc[safehouse_id].get("name") if safehouse_id in safehouses.index else None,
                },
            }
        )
        resident_updates.append(
            {
                "resident_id": resident_id,
                "reintegration_readiness_score": float(score),
                "reintegration_readiness_band": band,
                "reintegration_readiness_drivers": {
                    "positive": positive,
                    "barriers": barriers,
                },
                "reintegration_recommended_action": action_code,
                "reintegration_score_updated_at": utc_now_py(),
            }
        )

    return {
        "pipeline_name": "reintegration_readiness",
        "display_name": "Reintegration Readiness",
        "metrics": scored_cache["reintegration_readiness"]["metrics"],
        "manifest": scored_cache["reintegration_readiness"]["manifest"],
        "feature_importance": load_feature_importance_payload("reintegration_readiness"),
        "snapshot_rows": snapshot_rows,
        "table_updates": {"residents_reintegration": resident_updates},
    }


def build_post_peer_map(scored: pd.DataFrame) -> dict[int, list[int]]:
    """Build comparable-post IDs using shared content attributes and score proximity."""

    if scored.empty:
        return {}

    peer_map: dict[int, list[int]] = {}
    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    for row in ranked.itertuples(index=False):
        post_id = int(row.post_id)
        peers = ranked.loc[
            ranked["post_id"] != post_id,
            ["post_id", "platform", "media_type", "content_topic", "prediction_score"],
        ].copy()
        peers["same_platform"] = peers["platform"].fillna("").eq(getattr(row, "platform", ""))
        peers["same_media"] = peers["media_type"].fillna("").eq(getattr(row, "media_type", ""))
        peers["same_topic"] = peers["content_topic"].fillna("").eq(getattr(row, "content_topic", ""))
        peers["distance"] = (peers["prediction_score"] - float(row.prediction_score)).abs()
        peers = peers.sort_values(
            ["same_platform", "same_media", "same_topic", "distance", "prediction_score"],
            ascending=[False, False, False, True, False],
        )
        peer_map[post_id] = peers.head(3)["post_id"].astype(int).tolist()
    return peer_map


def build_social_conversion_artifact(
    scored_cache: dict[str, dict[str, Any]],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build social-post conversion snapshots plus post-table updates."""

    scored = latest_scored_rows("social_media_conversion", scored_cache)
    peer_map = build_post_peer_map(scored)
    positive_lookup = (
        scored.loc[scored["donation_referrals"].fillna(0) > 0]
        .groupby(["platform", "media_type", "content_topic"])
        .agg(
            avg_referrals=("donation_referrals", "mean"),
            avg_value=("estimated_donation_value_php", "mean"),
        )
        .reset_index()
    )

    ranked = scored.sort_values("prediction_score", ascending=False).reset_index(drop=True)
    if prediction_limit > 0:
        ranked = ranked.head(prediction_limit).reset_index(drop=True)

    snapshot_rows: list[dict[str, Any]] = []
    post_updates: list[dict[str, Any]] = []
    for rank_order, scored_row in enumerate(ranked.itertuples(index=False), start=1):
        post_id = int(scored_row.post_id)
        score = as_float(scored_row.prediction_score, default=0.0) or 0.0
        band = score_to_band(
            score,
            [(0.80, "high-converter"), (0.55, "moderate"), (0.30, "engagement-only")],
            "low",
        )
        lookup = positive_lookup.loc[
            positive_lookup["platform"].fillna("").eq(getattr(scored_row, "platform", ""))
            & positive_lookup["media_type"].fillna("").eq(getattr(scored_row, "media_type", ""))
            & positive_lookup["content_topic"].fillna("").eq(getattr(scored_row, "content_topic", ""))
        ]
        avg_referrals = as_float(lookup["avg_referrals"].mean() if not lookup.empty else None, default=1.0) or 1.0
        avg_value = as_float(lookup["avg_value"].mean() if not lookup.empty else None, default=2500.0) or 2500.0
        predicted_referrals = max(0.0, score * avg_referrals)
        predicted_value = max(0.0, predicted_referrals * avg_value)
        action_code = "replicate-pattern" if score >= 0.80 else "test-variation" if score >= 0.55 else "revise-content"

        drivers = [
            build_recommended_driver(
                driver="has_call_to_action",
                label="Includes a direct call to action" if bool(scored_row.has_call_to_action) else "Call to action is missing",
                direction="positive" if bool(scored_row.has_call_to_action) else "negative",
            ),
            build_recommended_driver(
                driver="media_type",
                label=f"Media type: {getattr(scored_row, 'media_type', 'unknown')}",
                direction="positive" if str(getattr(scored_row, "media_type", "")).lower() in {"video", "reel"} else "neutral",
            ),
            build_recommended_driver(
                driver="caption_length",
                label=f"Caption length {int(as_float(scored_row.caption_length, default=0.0) or 0.0)} chars",
                direction="negative" if int(as_float(scored_row.caption_length, default=0.0) or 0.0) > 500 else "positive",
            ),
        ]

        snapshot_rows.append(
            {
                "entity_type": "social_media_post",
                "entity_id": post_id,
                "entity_key": f"post:{post_id}",
                "entity_label": build_post_label(pd.Series(scored_row._asdict())),
                "safehouse_id": None,
                "record_timestamp": to_python_datetime(
                    pd.to_datetime(getattr(scored_row, "created_at", None), errors="coerce")
                ),
                "prediction_value": int(round(score >= 0.50)),
                "prediction_score": float(score),
                "rank_order": rank_order,
                "band_label": band,
                "action_code": action_code,
                "context": {
                    "predictedReferrals": round(predicted_referrals, 2),
                    "predictedDonationValuePhp": round(predicted_value, 2),
                    "topPositiveDrivers": [driver for driver in drivers if driver.get("direction") != "negative"][:3],
                    "topNegativeDrivers": [driver for driver in drivers if driver.get("direction") == "negative"][:2],
                    "comparablePostIds": peer_map.get(post_id, []),
                    "recommendedAction": action_code,
                },
            }
        )
        post_updates.append(
            {
                "post_id": post_id,
                "conversion_prediction_score": float(score),
                "predicted_referral_count": round(predicted_referrals, 2),
                "predicted_donation_value_php": round(predicted_value, 2),
                "conversion_band": band,
                "conversion_top_drivers": drivers,
                "conversion_comparable_post_ids": peer_map.get(post_id, []),
                "conversion_score_updated_at": utc_now_py(),
            }
        )

    return {
        "pipeline_name": "social_post_conversion",
        "display_name": "Social Post Conversion",
        "metrics": {**scored_cache["social_media_conversion"]["metrics"], "internal_pipeline_name": "social_media_conversion"},
        "manifest": {
            **scored_cache["social_media_conversion"]["manifest"],
            "pipeline_name": "social_post_conversion",
            "display_name": "Social Post Conversion",
            "slug": "social-post-conversion",
            "internal_pipeline_name": "social_media_conversion",
        },
        "feature_importance": load_feature_importance_payload("social_media_conversion"),
        "snapshot_rows": snapshot_rows,
        "table_updates": {"social_media_posts": post_updates},
    }


def build_campaign_effectiveness_artifact(
    raw_tables: dict[str, pd.DataFrame],
    phase2_datasets: dict[str, pd.DataFrame],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build campaign-effectiveness snapshots from campaign and donation aggregates."""

    campaign_features = phase2_datasets["campaign_features"].copy()
    if campaign_features.empty:
        return {
            "pipeline_name": "campaign_effectiveness",
            "display_name": "Campaign Effectiveness",
            "metrics": {"task_type": "explanatory", "row_count": 0},
            "manifest": {
                "pipeline_name": "campaign_effectiveness",
                "display_name": "Campaign Effectiveness",
                "slug": "campaign-effectiveness",
                "task_type": "explanatory",
            },
            "feature_importance": [],
            "snapshot_rows": [],
            "table_updates": {},
        }

    campaign_features["campaign_month"] = pd.to_datetime(campaign_features["campaign_month"], errors="coerce")
    campaigns = (
        campaign_features.groupby("campaign_name", dropna=False)
        .agg(
            total_raised_php=("total_resolved_value", "sum"),
            unique_donors=("unique_supporter_count", "sum"),
            avg_engagement_rate=("avg_engagement_rate", "mean"),
            total_impressions=("total_impressions", "sum"),
            total_donation_referrals=("total_donation_referrals", "sum"),
            total_estimated_donation_value_php=("total_estimated_donation_value_php", "sum"),
            total_goal_proxy=("total_allocated_amount", "sum"),
            latest_month=("campaign_month", "max"),
        )
        .reset_index()
    )
    max_raised = as_float(campaigns["total_raised_php"].max(), default=1.0) or 1.0
    campaigns["conversion_ratio"] = campaigns.apply(
        lambda row: safe_ratio(row["total_raised_php"], row["total_goal_proxy"], default=row["total_raised_php"] / max_raised),
        axis=1,
    )
    campaigns["classification_band"] = campaigns["conversion_ratio"].apply(
        lambda score: score_to_band(score, [(0.70, "high-movement"), (0.30, "moderate")], "noise")
    )
    campaigns["recommended_replicate"] = campaigns["classification_band"].eq("high-movement")
    campaigns["engagement_to_conversion_ratio"] = campaigns.apply(
        lambda row: safe_ratio(row["avg_engagement_rate"], max(row["conversion_ratio"], 0.01), default=0.0),
        axis=1,
    )
    platform_mode = (
        raw_tables["social_media_posts"]
        .fillna("")
        .groupby("campaign_name")["platform"]
        .agg(lambda values: values.mode().iloc[0] if not values.mode().empty else None)
        .to_dict()
    )
    campaigns["top_referral_platform"] = campaigns["campaign_name"].map(platform_mode)
    campaigns = campaigns.sort_values(["conversion_ratio", "total_raised_php"], ascending=[False, False]).reset_index(drop=True)
    if prediction_limit > 0:
        campaigns = campaigns.head(prediction_limit).reset_index(drop=True)

    snapshot_rows: list[dict[str, Any]] = []
    for rank_order, row in enumerate(campaigns.itertuples(index=False), start=1):
        campaign_name = str(getattr(row, "campaign_name", "") or f"Campaign {rank_order}")
        snapshot_rows.append(
            {
                "entity_type": "campaign",
                "entity_id": None,
                "entity_key": f"campaign:{campaign_name.lower().replace(' ', '-')}",
                "entity_label": campaign_name,
                "safehouse_id": None,
                "record_timestamp": to_python_datetime(pd.to_datetime(getattr(row, "latest_month", None), errors="coerce")),
                "prediction_value": None,
                "prediction_score": float(as_float(getattr(row, "conversion_ratio", None), default=0.0) or 0.0),
                "rank_order": rank_order,
                "band_label": str(getattr(row, "classification_band")),
                "action_code": "replicate-campaign" if bool(getattr(row, "recommended_replicate", False)) else "review-campaign",
                "context": {
                    "conversionRatio": float(as_float(getattr(row, "conversion_ratio", None), default=0.0) or 0.0),
                    "classificationBand": str(getattr(row, "classification_band")),
                    "engagementToConversionRatio": float(as_float(getattr(row, "engagement_to_conversion_ratio", None), default=0.0) or 0.0),
                    "topReferralPlatform": getattr(row, "top_referral_platform", None),
                    "recommendedReplicate": bool(getattr(row, "recommended_replicate", False)),
                },
            }
        )

    return {
        "pipeline_name": "campaign_effectiveness",
        "display_name": "Campaign Effectiveness",
        "metrics": {"task_type": "explanatory", "row_count": int(len(campaigns))},
        "manifest": {
            "pipeline_name": "campaign_effectiveness",
            "display_name": "Campaign Effectiveness",
            "slug": "campaign-effectiveness",
            "task_type": "explanatory",
            "source_tables": ["campaigns", "donations", "social_media_posts"],
        },
        "feature_importance": [
            {"feature": "total_raised_php", "importance": 0.35, "label": "Total raised"},
            {"feature": "total_donation_referrals", "importance": 0.25, "label": "Donation referrals"},
            {"feature": "avg_engagement_rate", "importance": 0.20, "label": "Average engagement rate"},
            {"feature": "total_impressions", "importance": 0.20, "label": "Total impressions"},
        ],
        "snapshot_rows": snapshot_rows,
        "table_updates": {},
    }


def build_safehouse_health_artifact(
    raw_tables: dict[str, pd.DataFrame],
    phase2_datasets: dict[str, pd.DataFrame],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build safehouse-health snapshots plus monthly-metric updates."""

    monthly = phase2_datasets["safehouse_monthly_features"].copy()
    if monthly.empty:
        return {
            "pipeline_name": "safehouse_health_score",
            "display_name": "Safehouse Health Score",
            "metrics": {"task_type": "index", "row_count": 0},
            "manifest": {"pipeline_name": "safehouse_health_score", "display_name": "Safehouse Health Score", "slug": "safehouse-health-score"},
            "feature_importance": [],
            "snapshot_rows": [],
            "table_updates": {"safehouse_monthly_metrics": []},
        }

    metrics_source = raw_tables["safehouse_monthly_metrics"].copy()
    monthly["month_start"] = pd.to_datetime(monthly["month_start"], errors="coerce")
    metrics_source["month_start"] = pd.to_datetime(metrics_source["month_start"], errors="coerce")
    monthly = monthly.merge(
        metrics_source[["metric_id", "safehouse_id", "month_start"]],
        on=["safehouse_id", "month_start"],
        how="left",
    )

    def percentile(series: pd.Series, *, invert: bool = False) -> pd.Series:
        ranked = series.rank(method="average", pct=True).fillna(0.5)
        return 1 - ranked if invert else ranked

    monthly["process_per_resident"] = monthly.apply(
        lambda row: safe_ratio(row["process_recording_count"], max(row["active_residents"], 1), default=0.0),
        axis=1,
    )
    monthly["visits_per_resident"] = monthly.apply(
        lambda row: safe_ratio(row["home_visitation_count"], max(row["active_residents"], 1), default=0.0),
        axis=1,
    )
    monthly["incident_rate"] = monthly.apply(
        lambda row: safe_ratio(row["incident_count"], max(row["active_residents"], 1), default=0.0),
        axis=1,
    )

    monthly["health_component"] = monthly.groupby("month_start")["avg_health_score"].transform(percentile)
    monthly["education_component"] = monthly.groupby("month_start")["avg_education_progress"].transform(percentile)
    monthly["process_component"] = monthly.groupby("month_start")["process_per_resident"].transform(percentile)
    monthly["visit_component"] = monthly.groupby("month_start")["visits_per_resident"].transform(percentile)
    monthly["incident_component"] = monthly.groupby("month_start")["incident_rate"].transform(lambda series: percentile(series, invert=True))
    monthly["composite_health_score"] = (
        100
        * (
            0.35 * monthly["health_component"]
            + 0.20 * monthly["education_component"]
            + 0.15 * monthly["process_component"]
            + 0.10 * monthly["visit_component"]
            + 0.20 * monthly["incident_component"]
        )
    ).clip(lower=0, upper=100)
    monthly["peer_rank"] = monthly.groupby("month_start")["composite_health_score"].rank(method="dense", ascending=False).astype(int)
    monthly["health_band"] = monthly["composite_health_score"].apply(
        lambda score: score_to_band(score, [(85, "excellent"), (70, "good"), (55, "fair"), (40, "at-risk")], "critical")
    )
    monthly["prior_score"] = monthly.groupby("safehouse_id")["composite_health_score"].shift(1)
    monthly["trend_direction"] = monthly.apply(
        lambda row: "stable"
        if pd.isna(row["prior_score"])
        else "improving"
        if row["composite_health_score"] >= row["prior_score"] + 3
        else "declining"
        if row["composite_health_score"] <= row["prior_score"] - 3
        else "stable",
        axis=1,
    )

    incidents = raw_tables["incident_reports"].copy()
    incidents["incident_date"] = pd.to_datetime(incidents["incident_date"], errors="coerce")
    incidents["month_start"] = incidents["incident_date"].dt.to_period("M").dt.to_timestamp()
    severity_counts = (
        incidents.groupby(["safehouse_id", "month_start", "severity"])
        .size()
        .unstack(fill_value=0)
        .reset_index()
    )

    def severity_payload(row: pd.Series) -> dict[str, int]:
        return {
            "critical": int(as_float(row.get("Critical", 0), default=0.0) or 0.0),
            "high": int(as_float(row.get("High", 0), default=0.0) or 0.0),
            "medium": int(as_float(row.get("Medium", 0), default=0.0) or 0.0),
            "low": int(as_float(row.get("Low", 0), default=0.0) or 0.0),
        }

    monthly = monthly.merge(severity_counts, on=["safehouse_id", "month_start"], how="left")
    monthly["incident_severity_distribution"] = monthly.apply(severity_payload, axis=1)
    monthly["health_score_drivers"] = monthly.apply(
        lambda row: [
            build_recommended_driver(
                driver="incident_rate",
                label=f"Incident rate {row['incident_rate']:.2f} per resident",
                direction="negative",
            ),
            build_recommended_driver(
                driver="health_score",
                label=f"Average health score {as_float(row['avg_health_score'], default=0.0) or 0.0:.1f}",
                direction="positive" if row["health_component"] >= 0.5 else "negative",
            ),
            build_recommended_driver(
                driver="visitation_rate",
                label=f"Home visit rate {row['visits_per_resident']:.2f} per resident",
                direction="positive" if row["visit_component"] >= 0.5 else "negative",
            ),
        ],
        axis=1,
    )

    latest_month = monthly["month_start"].max()
    latest = monthly.loc[monthly["month_start"] == latest_month].sort_values("composite_health_score", ascending=False).reset_index(drop=True)
    if prediction_limit > 0:
        latest = latest.head(prediction_limit).reset_index(drop=True)

    snapshot_rows = [
        {
            "entity_type": "safehouse",
            "entity_id": int(row.safehouse_id),
            "entity_key": f"safehouse:{int(row.safehouse_id)}",
            "entity_label": str(getattr(row, "safehouse_name", f"Safehouse {int(row.safehouse_id)}")),
            "safehouse_id": int(row.safehouse_id),
            "record_timestamp": to_python_datetime(pd.to_datetime(getattr(row, "month_start", None), errors="coerce")),
            "prediction_value": None,
            "prediction_score": float((as_float(getattr(row, "composite_health_score", None), default=0.0) or 0.0) / 100.0),
            "rank_order": rank_order,
            "band_label": str(getattr(row, "health_band")),
            "action_code": "urgent-site-review" if getattr(row, "health_band") in {"critical", "at-risk"} else "monitor-site",
            "context": {
                "compositeScore": float(as_float(getattr(row, "composite_health_score", None), default=0.0) or 0.0),
                "scoreComponents": {
                    "health": float(getattr(row, "health_component")),
                    "education": float(getattr(row, "education_component")),
                    "process": float(getattr(row, "process_component")),
                    "visitation": float(getattr(row, "visit_component")),
                    "incidents": float(getattr(row, "incident_component")),
                },
                "trendDirection": str(getattr(row, "trend_direction")),
                "peerRank": int(getattr(row, "peer_rank")),
                "topRiskDriver": getattr(row, "health_score_drivers")[0]["label"] if getattr(row, "health_score_drivers") else None,
            },
        }
        for rank_order, row in enumerate(latest.itertuples(index=False), start=1)
    ]

    updates = [
        {
            "metric_id": int(row.metric_id),
            "composite_health_score": float(as_float(row.composite_health_score, default=0.0) or 0.0),
            "peer_rank": int(row.peer_rank),
            "health_band": row.health_band,
            "trend_direction": row.trend_direction,
            "health_score_drivers": row.health_score_drivers,
            "incident_severity_distribution": row.incident_severity_distribution,
            "health_score_computed_at": utc_now_py(),
        }
        for row in monthly.loc[monthly["metric_id"].notna()].itertuples(index=False)
    ]

    return {
        "pipeline_name": "safehouse_health_score",
        "display_name": "Safehouse Health Score",
        "metrics": {"task_type": "index", "row_count": int(len(latest)), "latest_month": str(latest_month.date()) if pd.notna(latest_month) else None},
        "manifest": {
            "pipeline_name": "safehouse_health_score",
            "display_name": "Safehouse Health Score",
            "slug": "safehouse-health-score",
            "task_type": "index",
            "source_tables": ["safehouse_monthly_metrics", "incident_reports"],
        },
        "feature_importance": [
            {"feature": "avg_health_score", "importance": 0.35, "label": "Average health score"},
            {"feature": "avg_education_progress", "importance": 0.20, "label": "Average education progress"},
            {"feature": "incident_count", "importance": 0.20, "label": "Incident rate"},
            {"feature": "process_recording_count", "importance": 0.15, "label": "Process recording rate"},
            {"feature": "home_visitation_count", "importance": 0.10, "label": "Home visitation rate"},
        ],
        "snapshot_rows": snapshot_rows,
        "table_updates": {"safehouse_monthly_metrics": updates},
    }


def build_intervention_effectiveness_artifact(
    raw_tables: dict[str, pd.DataFrame],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build intervention-effectiveness snapshots plus intervention-plan updates."""

    plans = raw_tables["intervention_plans"].copy()
    process = raw_tables["process_recordings"].copy()
    health = raw_tables["health_wellbeing_records"].copy()
    education = raw_tables["education_records"].copy()
    residents = raw_tables["residents"][["resident_id", "safehouse_id"]].copy()

    plans["created_at"] = pd.to_datetime(plans["created_at"], errors="coerce")
    plans["updated_at"] = pd.to_datetime(plans["updated_at"], errors="coerce")
    process["session_date"] = pd.to_datetime(process["session_date"], errors="coerce")
    health["record_date"] = pd.to_datetime(health["record_date"], errors="coerce")
    education["record_date"] = pd.to_datetime(education["record_date"], errors="coerce")

    completed = plans.loc[plans["status"].fillna("").str.lower().eq("completed")].copy()
    if completed.empty:
        return {
            "pipeline_name": "intervention_effectiveness",
            "display_name": "Intervention Effectiveness",
            "metrics": {"task_type": "explanatory", "row_count": 0},
            "manifest": {"pipeline_name": "intervention_effectiveness", "display_name": "Intervention Effectiveness", "slug": "intervention-effectiveness"},
            "feature_importance": [],
            "snapshot_rows": [],
            "table_updates": {"intervention_plans": []},
        }

    completed = completed.merge(residents, on="resident_id", how="left")
    updates: list[dict[str, Any]] = []
    for plan in completed.itertuples(index=False):
        plan_start = pd.to_datetime(getattr(plan, "created_at", None), errors="coerce")
        if pd.isna(plan_start):
            plan_start = pd.to_datetime(getattr(plan, "updated_at", None), errors="coerce")
        if pd.isna(plan_start):
            continue
        pre_start = plan_start - pd.Timedelta(days=90)
        post_end = plan_start + pd.Timedelta(days=90)

        resident_health = health.loc[health["resident_id"] == plan.resident_id]
        resident_education = education.loc[education["resident_id"] == plan.resident_id]
        resident_process = process.loc[process["resident_id"] == plan.resident_id]

        pre_health = resident_health.loc[(resident_health["record_date"] >= pre_start) & (resident_health["record_date"] < plan_start)]
        post_health = resident_health.loc[(resident_health["record_date"] >= plan_start) & (resident_health["record_date"] <= post_end)]
        pre_education = resident_education.loc[(resident_education["record_date"] >= pre_start) & (resident_education["record_date"] < plan_start)]
        post_education = resident_education.loc[(resident_education["record_date"] >= plan_start) & (resident_education["record_date"] <= post_end)]
        post_process = resident_process.loc[(resident_process["session_date"] >= plan_start) & (resident_process["session_date"] <= post_end)]

        health_delta = (post_health["general_health_score"].mean() - pre_health["general_health_score"].mean()) if not pre_health.empty and not post_health.empty else None
        education_delta = (post_education["progress_percent"].mean() - pre_education["progress_percent"].mean()) if not pre_education.empty and not post_education.empty else None
        progress_rate = post_process["progress_noted"].mean() if not post_process.empty else None
        follow_up_points = int((not post_health.empty)) + int((not post_education.empty)) + int((progress_rate is not None))

        if follow_up_points < 2:
            score = 0.0
            band = "insufficient-data"
        else:
            score = max(
                0.0,
                min(
                    100.0,
                    50.0
                    + 2.0 * (as_float(health_delta, default=0.0) or 0.0)
                    + 1.5 * (as_float(education_delta, default=0.0) or 0.0)
                    + 25.0 * (as_float(progress_rate, default=0.0) or 0.0),
                ),
            )
            band = score_to_band(score, [(75, "high-impact"), (45, "moderate")], "low-impact")

        drivers = [
            build_recommended_driver(
                driver="health_score",
                label=f"Average health score delta {as_float(health_delta, default=0.0) or 0.0:.1f}",
                value=as_float(health_delta, default=0.0),
            ),
            build_recommended_driver(
                driver="education_progress",
                label=f"Education progress delta {as_float(education_delta, default=0.0) or 0.0:.1f}",
                value=as_float(education_delta, default=0.0),
            ),
            build_recommended_driver(
                driver="process_progress_rate",
                label=f"Progress noted in {(as_float(progress_rate, default=0.0) or 0.0) * 100:.0f}% of follow-up sessions",
                value=as_float(progress_rate, default=0.0),
            ),
        ]

        updates.append(
            {
                "plan_id": int(plan.plan_id),
                "plan_category": plan.plan_category,
                "services_provided": plan.services_provided,
                "safehouse_id": int(as_float(plan.safehouse_id, default=0.0) or 0.0),
                "effectiveness_outcome_score": float(score),
                "effectiveness_band": band,
                "effectiveness_outcome_drivers": drivers,
                "effectiveness_score_updated_at": utc_now_py(),
            }
        )

    plan_frame = pd.DataFrame(updates)
    grouped = (
        plan_frame.assign(
            services_cluster=lambda frame: frame["services_provided"].fillna("unspecified").astype(str).str.split(",").str[0].str.strip().str.lower()
        )
        .groupby(["plan_category", "services_cluster"], dropna=False)
        .agg(
            avg_outcome_score=("effectiveness_outcome_score", "mean"),
            sample_count=("plan_id", "count"),
        )
        .reset_index()
        .sort_values(["avg_outcome_score", "sample_count"], ascending=[False, False])
        .reset_index(drop=True)
    )
    if prediction_limit > 0:
        grouped = grouped.head(prediction_limit).reset_index(drop=True)

    snapshot_rows = [
        {
            "entity_type": "intervention_category",
            "entity_id": None,
            "entity_key": f"intervention:{row.plan_category}:{row.services_cluster}",
            "entity_label": f"{row.plan_category} / {row.services_cluster}",
            "safehouse_id": None,
            "record_timestamp": utc_now_py(),
            "prediction_value": None,
            "prediction_score": float((as_float(row.avg_outcome_score, default=0.0) or 0.0) / 100.0),
            "rank_order": rank_order,
            "band_label": score_to_band(as_float(row.avg_outcome_score, default=0.0), [(75, "high-impact"), (45, "moderate")], "low-impact"),
            "action_code": "review-for-standardization",
            "context": {
                "planCategory": row.plan_category,
                "servicesCluster": row.services_cluster,
                "avgOutcomeScore": float(as_float(row.avg_outcome_score, default=0.0) or 0.0),
                "sampleCount": int(row.sample_count),
                "safehouseBreakdown": {},
                "topOutcomeDriver": "Composite post-plan improvement",
            },
        }
        for rank_order, row in enumerate(grouped.itertuples(index=False), start=1)
    ]

    return {
        "pipeline_name": "intervention_effectiveness",
        "display_name": "Intervention Effectiveness",
        "metrics": {"task_type": "explanatory", "row_count": int(len(grouped))},
        "manifest": {"pipeline_name": "intervention_effectiveness", "display_name": "Intervention Effectiveness", "slug": "intervention-effectiveness"},
        "feature_importance": [
            {"feature": "health_score_delta", "importance": 0.40, "label": "Health score delta"},
            {"feature": "education_progress_delta", "importance": 0.35, "label": "Education progress delta"},
            {"feature": "progress_noted_rate", "importance": 0.25, "label": "Follow-up progress rate"},
        ],
        "snapshot_rows": snapshot_rows,
        "table_updates": {"intervention_plans": updates},
    }


def build_donation_attribution_artifact(
    raw_tables: dict[str, pd.DataFrame],
    *,
    prediction_limit: int,
) -> dict[str, Any]:
    """Build donation-attribution snapshots plus donation-table updates."""

    donations = raw_tables["donations"].copy()
    allocations = raw_tables["donation_allocations"].copy()
    metrics = raw_tables["safehouse_monthly_metrics"].copy()
    if "safehouse_id" not in donations.columns:
        donations["safehouse_id"] = pd.NA
    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
    allocations["allocation_date"] = pd.to_datetime(allocations["allocation_date"], errors="coerce")
    metrics["month_start"] = pd.to_datetime(metrics["month_start"], errors="coerce")

    allocations = allocations.sort_values(["donation_id", "amount_allocated"], ascending=[True, False])
    primary_allocations = allocations.drop_duplicates("donation_id", keep="first")
    donations = donations.merge(
        primary_allocations[["donation_id", "program_area", "safehouse_id", "amount_allocated"]].rename(columns={"safehouse_id": "allocation_safehouse_id"}),
        on="donation_id",
        how="left",
    )
    donations["resolved_safehouse_id"] = donations["safehouse_id"].fillna(donations["allocation_safehouse_id"])
    donations["quarter_start"] = donations["donation_date"].dt.to_period("Q").dt.start_time

    updates: list[dict[str, Any]] = []
    for donation in donations.itertuples(index=False):
        if pd.isna(donation.donation_date) or pd.isna(donation.resolved_safehouse_id):
            continue
        safehouse_id = int(donation.resolved_safehouse_id)
        before_start = donation.quarter_start - pd.offsets.QuarterBegin(startingMonth=donation.quarter_start.month)
        after_start = donation.quarter_start + pd.offsets.QuarterBegin(startingMonth=donation.quarter_start.month)
        before = metrics.loc[(metrics["safehouse_id"] == safehouse_id) & (metrics["month_start"] >= before_start) & (metrics["month_start"] < donation.quarter_start)]
        after = metrics.loc[(metrics["safehouse_id"] == safehouse_id) & (metrics["month_start"] >= after_start) & (metrics["month_start"] < after_start + pd.DateOffset(months=3))]
        if after.empty:
            score = None
            outcome_delta = None
        else:
            health_delta = (after["avg_health_score"].mean() - before["avg_health_score"].mean()) if not before.empty else after["avg_health_score"].mean()
            education_delta = (after["avg_education_progress"].mean() - before["avg_education_progress"].mean()) if not before.empty else after["avg_education_progress"].mean()
            outcome_delta = (as_float(health_delta, default=0.0) or 0.0) + (as_float(education_delta, default=0.0) or 0.0)
            score = max(0.0, min(100.0, 50.0 + 2.0 * outcome_delta))
        updates.append(
            {
                "donation_id": int(donation.donation_id),
                "safehouse_id": safehouse_id,
                "program_area": donation.program_area,
                "quarter_start": donation.quarter_start,
                "amount_allocated": as_float(getattr(donation, "amount_allocated", None), default=0.0) or 0.0,
                "attributed_outcome_score": None if score is None else float(score),
                "outcome_score_delta": outcome_delta,
            }
        )

    update_frame = pd.DataFrame(updates)
    grouped = (
        update_frame.loc[update_frame["attributed_outcome_score"].notna()]
        .groupby(["safehouse_id", "program_area", "quarter_start"], dropna=False)
        .agg(
            avg_score=("attributed_outcome_score", "mean"),
            amount_allocated=("amount_allocated", "sum"),
            outcome_score_delta=("outcome_score_delta", "mean"),
        )
        .reset_index()
        .sort_values("avg_score", ascending=False)
        .reset_index(drop=True)
    )
    if prediction_limit > 0:
        grouped = grouped.head(prediction_limit).reset_index(drop=True)

    snapshot_rows = [
        {
            "entity_type": "safehouse_program_area",
            "entity_id": None,
            "entity_key": f"safehouse-program-area:{int(row.safehouse_id)}:{str(row.program_area)}:{pd.Timestamp(row.quarter_start).date()}",
            "entity_label": f"Safehouse {int(row.safehouse_id)} / {row.program_area}",
            "safehouse_id": int(row.safehouse_id),
            "record_timestamp": to_python_datetime(pd.to_datetime(row.quarter_start, errors="coerce")),
            "prediction_value": None,
            "prediction_score": float((as_float(row.avg_score, default=0.0) or 0.0) / 100.0),
            "rank_order": rank_order,
            "band_label": score_to_band(as_float(row.avg_score, default=0.0), [(75, "strong"), (55, "moderate")], "weak"),
            "action_code": "review-program-funding",
            "context": {
                "programArea": row.program_area,
                "quarter": str(pd.Timestamp(row.quarter_start).date()),
                "amountAllocated": float(as_float(row.amount_allocated, default=0.0) or 0.0),
                "outcomeScoreDelta": float(as_float(row.outcome_score_delta, default=0.0) or 0.0),
                "correlationCoefficient": round(float((as_float(row.avg_score, default=0.0) or 0.0) / 100.0), 2),
                "confidenceNote": "Correlational attribution only; interpret with caution.",
            },
        }
        for rank_order, row in enumerate(grouped.itertuples(index=False), start=1)
    ]

    return {
        "pipeline_name": "donation_impact_attribution",
        "display_name": "Donation Impact Attribution",
        "metrics": {"task_type": "correlational", "row_count": int(len(grouped))},
        "manifest": {"pipeline_name": "donation_impact_attribution", "display_name": "Donation Impact Attribution", "slug": "donation-impact-attribution"},
        "feature_importance": [
            {"feature": "amount_allocated", "importance": 0.40, "label": "Allocated amount"},
            {"feature": "avg_health_score_delta", "importance": 0.30, "label": "Health score delta"},
            {"feature": "avg_education_progress_delta", "importance": 0.30, "label": "Education progress delta"},
        ],
        "snapshot_rows": snapshot_rows,
        "table_updates": {"donations": updates},
    }


def build_funding_gap_artifact(
    raw_tables: dict[str, pd.DataFrame],
    phase2_datasets: dict[str, pd.DataFrame],
) -> dict[str, Any]:
    """Build a current funding-gap forecast plus public-impact updates."""

    donations = raw_tables["donations"].copy()
    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
    donations["resolved_value"] = pd.to_numeric(donations["estimated_value"], errors="coerce").fillna(
        pd.to_numeric(donations["amount"], errors="coerce")
    ).fillna(0.0)
    monthly = (
        donations.dropna(subset=["donation_date"])
        .assign(month_start=lambda frame: frame["donation_date"].dt.to_period("M").dt.to_timestamp())
        .groupby("month_start")["resolved_value"]
        .sum()
        .sort_index()
    )
    public_snapshots = raw_tables["public_impact_snapshots"].copy()
    public_snapshots["snapshot_date"] = pd.to_datetime(public_snapshots["snapshot_date"], errors="coerce")
    safehouse_monthly = raw_tables["safehouse_monthly_metrics"].copy()
    safehouse_monthly["month_start"] = pd.to_datetime(safehouse_monthly["month_start"], errors="coerce")

    if monthly.empty:
        return {
            "pipeline_name": "funding_gap_forecast",
            "display_name": "Funding Gap Forecast",
            "metrics": {"task_type": "forecast", "row_count": 0},
            "manifest": {"pipeline_name": "funding_gap_forecast", "display_name": "Funding Gap Forecast", "slug": "funding-gap-forecast"},
            "feature_importance": [],
            "snapshot_rows": [],
            "table_updates": {"public_impact_snapshots": []},
        }

    trailing3 = float(monthly.tail(3).mean())
    trailing6 = float(monthly.tail(6).mean())
    recurring_base = float(
        donations.loc[donations["is_recurring"].fillna(False), "resolved_value"].groupby(donations["donation_date"].dt.to_period("M")).sum().tail(6).mean()
        if donations["is_recurring"].fillna(False).any()
        else 0.0
    )
    latest_active_residents = float(safehouse_monthly.loc[safehouse_monthly["month_start"] == safehouse_monthly["month_start"].max(), "active_residents"].sum())
    rolling_resident_mean = float(safehouse_monthly.groupby("month_start")["active_residents"].sum().tail(6).mean() or 1.0)
    target = max(trailing6, trailing6 * safe_ratio(latest_active_residents, max(rolling_resident_mean, 1.0), default=1.0))
    forecast_30 = 0.50 * trailing3 + 0.35 * trailing6 + 0.15 * recurring_base
    forecast_60 = forecast_30 * 2.0
    forecast_90 = forecast_30 * 3.0
    gap_30 = forecast_30 - target
    gap_ratio = safe_ratio(gap_30, max(target, 1.0), default=0.0)
    band = (
        "surplus"
        if gap_ratio >= 0.10
        else "balanced"
        if gap_ratio >= -0.05
        else "minor-gap"
        if gap_ratio >= -0.15
        else "major-gap"
        if gap_ratio >= -0.30
        else "critical"
    )
    forecast_std = float(monthly.tail(6).std(ddof=0) or 0.0)
    latest_snapshot = public_snapshots.sort_values("snapshot_date").tail(1)

    updates = []
    if not latest_snapshot.empty and pd.notna(latest_snapshot.iloc[0]["snapshot_id"]):
        updates.append(
            {
                "snapshot_id": int(latest_snapshot.iloc[0]["snapshot_id"]),
                "projected_gap_php_30d": round(gap_30, 2),
                "funding_gap_band": band,
                "funding_gap_updated_at": utc_now_py(),
            }
        )

    snapshot_rows = [
        {
            "entity_type": "org_month",
            "entity_id": None,
            "entity_key": f"org-month:{str(utc_now().date())}",
            "entity_label": "Organization Forecast",
            "safehouse_id": None,
            "record_timestamp": utc_now_py(),
            "prediction_value": None,
            "prediction_score": float(min(max(safe_ratio(forecast_30, max(target, 1.0), default=0.0), 0.0), 1.0)),
            "rank_order": 1,
            "band_label": band,
            "action_code": "launch-gap-response" if band in {"major-gap", "critical"} else "monitor-funding",
            "context": {
                "forecast30d": round(forecast_30, 2),
                "forecast60d": round(forecast_60, 2),
                "forecast90d": round(forecast_90, 2),
                "confidenceLow": round(forecast_30 - forecast_std, 2),
                "confidenceHigh": round(forecast_30 + forecast_std, 2),
                "gapVsTarget": round(gap_30, 2),
                "topRiskScenarios": ["Donation inflows remain below recent 6-month average"] if band in {"major-gap", "critical"} else [],
                "topOpportunityLevers": ["Recurring donor base is the most stable near-term lever"],
            },
        }
    ]

    return {
        "pipeline_name": "funding_gap_forecast",
        "display_name": "Funding Gap Forecast",
        "metrics": {"task_type": "forecast", "forecast_30d": round(forecast_30, 2), "target_30d": round(target, 2)},
        "manifest": {"pipeline_name": "funding_gap_forecast", "display_name": "Funding Gap Forecast", "slug": "funding-gap-forecast"},
        "feature_importance": [
            {"feature": "trailing_3_month_donations", "importance": 0.40, "label": "Trailing 3-month donations"},
            {"feature": "trailing_6_month_donations", "importance": 0.30, "label": "Trailing 6-month donations"},
            {"feature": "recurring_donation_base", "importance": 0.20, "label": "Recurring donation base"},
            {"feature": "active_residents", "importance": 0.10, "label": "Active residents"},
        ],
        "snapshot_rows": snapshot_rows,
        "table_updates": {"public_impact_snapshots": updates},
    }


def insert_pipeline_run(
    conn,
    *,
    pipeline_name: str,
    display_name: str,
    model_name: str | None,
    data_source: str,
    source_commit: str | None,
    metrics: dict[str, Any],
    manifest: dict[str, Any],
    scored_entity_count: int | None,
    feature_importance: list[dict[str, Any]],
) -> int:
    """Insert a pipeline run row and return its run id."""

    with conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO ml_pipeline_runs (
                pipeline_name,
                display_name,
                model_name,
                status,
                trained_at,
                data_source,
                source_commit,
                metrics_json,
                manifest_json,
                scored_entity_count,
                feature_importance_json
            )
            VALUES (%s, %s, %s, 'completed', NOW(), %s, %s, %s::jsonb, %s::jsonb, %s, %s::jsonb)
            RETURNING run_id;
            """,
            (
                pipeline_name,
                display_name,
                model_name,
                data_source,
                source_commit,
                json_dumps_safe(metrics),
                json_dumps_safe(manifest),
                scored_entity_count,
                json_dumps_safe(feature_importance),
            ),
        )
        run_id = int(cursor.fetchone()[0])
    return run_id


def insert_prediction_rows(
    conn,
    *,
    run_id: int,
    pipeline_name: str,
    rows: list[dict[str, Any]],
) -> None:
    """Insert prediction snapshot rows for a completed pipeline run."""

    if not rows:
        return

    payload = [
        (
            run_id,
            pipeline_name,
            row["entity_type"],
            row["entity_id"],
            row["entity_key"],
            row["entity_label"],
            row["safehouse_id"],
            row["record_timestamp"],
            row["prediction_value"],
            row["prediction_score"],
            row["rank_order"],
            json_dumps_safe(row["context"]),
            row.get("band_label"),
            row.get("action_code"),
        )
        for row in rows
    ]

    with conn.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO ml_prediction_snapshots (
                run_id,
                pipeline_name,
                entity_type,
                entity_id,
                entity_key,
                entity_label,
                safehouse_id,
                record_timestamp,
                prediction_value,
                prediction_score,
                rank_order,
                context_json,
                band_label,
                action_code
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s);
            """,
            payload,
        )


def apply_table_updates(
    conn,
    *,
    run_id: int,
    table_updates: dict[str, list[dict[str, Any]]],
) -> None:
    """Apply denormalized latest-score updates onto business tables."""

    with conn.cursor() as cursor:
        if table_updates.get("supporters_churn"):
            cursor.executemany(
                """
                UPDATE supporters
                SET
                    churn_risk_score = %s,
                    churn_band = %s,
                    churn_top_drivers = %s::jsonb,
                    churn_recommended_action = %s,
                    churn_score_updated_at = %s
                WHERE supporter_id = %s;
                """,
                [
                    (
                        row["churn_risk_score"],
                        row["churn_band"],
                        json_dumps_safe(row["churn_top_drivers"]),
                        row["churn_recommended_action"],
                        row["churn_score_updated_at"],
                        row["supporter_id"],
                    )
                    for row in table_updates["supporters_churn"]
                ],
            )

        if table_updates.get("supporters_upgrade"):
            cursor.executemany(
                """
                UPDATE supporters
                SET
                    upgrade_likelihood_score = %s,
                    upgrade_band = %s,
                    upgrade_top_drivers = %s::jsonb,
                    upgrade_recommended_ask_band = %s,
                    upgrade_score_updated_at = %s
                WHERE supporter_id = %s;
                """,
                [
                    (
                        row["upgrade_likelihood_score"],
                        row["upgrade_band"],
                        json_dumps_safe(row["upgrade_top_drivers"]),
                        row["upgrade_recommended_ask_band"],
                        row["upgrade_score_updated_at"],
                        row["supporter_id"],
                    )
                    for row in table_updates["supporters_upgrade"]
                ],
            )

        if table_updates.get("residents_regression"):
            cursor.executemany(
                """
                UPDATE residents
                SET
                    regression_risk_score = %s,
                    regression_risk_band = %s,
                    regression_risk_drivers = %s::jsonb,
                    regression_recommended_action = %s,
                    regression_score_updated_at = %s
                WHERE resident_id = %s;
                """,
                [
                    (
                        row["regression_risk_score"],
                        row["regression_risk_band"],
                        json_dumps_safe(row["regression_risk_drivers"]),
                        row["regression_recommended_action"],
                        row["regression_score_updated_at"],
                        row["resident_id"],
                    )
                    for row in table_updates["residents_regression"]
                ],
            )

        if table_updates.get("residents_reintegration"):
            cursor.executemany(
                """
                UPDATE residents
                SET
                    reintegration_readiness_score = %s,
                    reintegration_readiness_band = %s,
                    reintegration_readiness_drivers = %s::jsonb,
                    reintegration_recommended_action = %s,
                    reintegration_score_updated_at = %s
                WHERE resident_id = %s;
                """,
                [
                    (
                        row["reintegration_readiness_score"],
                        row["reintegration_readiness_band"],
                        json_dumps_safe(row["reintegration_readiness_drivers"]),
                        row["reintegration_recommended_action"],
                        row["reintegration_score_updated_at"],
                        row["resident_id"],
                    )
                    for row in table_updates["residents_reintegration"]
                ],
            )

        if table_updates.get("social_media_posts"):
            cursor.executemany(
                """
                UPDATE social_media_posts
                SET
                    conversion_prediction_score = %s,
                    predicted_referral_count = %s,
                    predicted_donation_value_php = %s,
                    conversion_band = %s,
                    conversion_top_drivers = %s::jsonb,
                    conversion_comparable_post_ids = %s::jsonb,
                    conversion_score_updated_at = %s
                WHERE post_id = %s;
                """,
                [
                    (
                        row["conversion_prediction_score"],
                        row["predicted_referral_count"],
                        row["predicted_donation_value_php"],
                        row["conversion_band"],
                        json_dumps_safe(row["conversion_top_drivers"]),
                        json_dumps_safe(row["conversion_comparable_post_ids"]),
                        row["conversion_score_updated_at"],
                        row["post_id"],
                    )
                    for row in table_updates["social_media_posts"]
                ],
            )

        if table_updates.get("safehouse_monthly_metrics"):
            cursor.executemany(
                """
                UPDATE safehouse_monthly_metrics
                SET
                    composite_health_score = %s,
                    peer_rank = %s,
                    health_band = %s,
                    trend_direction = %s,
                    health_score_drivers = %s::jsonb,
                    incident_severity_distribution = %s::jsonb,
                    health_score_computed_at = %s,
                    health_score_run_id = %s
                WHERE metric_id = %s;
                """,
                [
                    (
                        row["composite_health_score"],
                        row["peer_rank"],
                        row["health_band"],
                        row["trend_direction"],
                        json_dumps_safe(row["health_score_drivers"]),
                        json_dumps_safe(row["incident_severity_distribution"]),
                        row["health_score_computed_at"],
                        run_id,
                        row["metric_id"],
                    )
                    for row in table_updates["safehouse_monthly_metrics"]
                ],
            )

        if table_updates.get("public_impact_snapshots"):
            cursor.executemany(
                """
                UPDATE public_impact_snapshots
                SET
                    projected_gap_php_30d = %s,
                    funding_gap_band = %s,
                    funding_gap_updated_at = %s
                WHERE snapshot_id = %s;
                """,
                [
                    (
                        row["projected_gap_php_30d"],
                        row["funding_gap_band"],
                        row["funding_gap_updated_at"],
                        row["snapshot_id"],
                    )
                    for row in table_updates["public_impact_snapshots"]
                ],
            )

        if table_updates.get("intervention_plans"):
            cursor.executemany(
                """
                UPDATE intervention_plans
                SET
                    effectiveness_outcome_score = %s,
                    effectiveness_band = %s,
                    effectiveness_outcome_drivers = %s::jsonb,
                    effectiveness_score_updated_at = %s
                WHERE plan_id = %s;
                """,
                [
                    (
                        row["effectiveness_outcome_score"],
                        row["effectiveness_band"],
                        json_dumps_safe(row["effectiveness_outcome_drivers"]),
                        row["effectiveness_score_updated_at"],
                        row["plan_id"],
                    )
                    for row in table_updates["intervention_plans"]
                ],
            )

        if table_updates.get("donations"):
            cursor.executemany(
                """
                UPDATE donations
                SET
                    attributed_outcome_score = %s,
                    attribution_run_id = %s
                WHERE donation_id = %s;
                """,
                [
                    (
                        row["attributed_outcome_score"],
                        run_id,
                        row["donation_id"],
                    )
                    for row in table_updates["donations"]
                ],
            )


def build_super_admin_publication_artifacts(
    raw_tables: dict[str, pd.DataFrame],
    phase2_datasets: dict[str, pd.DataFrame],
    scored_cache: dict[str, dict[str, Any]],
    *,
    prediction_limit: int,
) -> list[dict[str, Any]]:
    """Build the publication artifacts required by the new super-admin contract."""

    return [
        build_donor_churn_artifact(raw_tables, scored_cache, prediction_limit=prediction_limit),
        build_donor_upgrade_artifact(raw_tables, scored_cache, prediction_limit=prediction_limit),
        build_campaign_effectiveness_artifact(raw_tables, phase2_datasets, prediction_limit=prediction_limit),
        build_social_conversion_artifact(scored_cache, prediction_limit=prediction_limit),
        build_donation_attribution_artifact(raw_tables, prediction_limit=prediction_limit),
        build_resident_regression_artifact(raw_tables, scored_cache, prediction_limit=prediction_limit),
        build_reintegration_artifact(raw_tables, scored_cache, prediction_limit=prediction_limit),
        build_intervention_effectiveness_artifact(raw_tables, prediction_limit=prediction_limit),
        build_safehouse_health_artifact(raw_tables, phase2_datasets, prediction_limit=prediction_limit),
        build_funding_gap_artifact(raw_tables, phase2_datasets),
    ]


def publish_pipeline_outputs(
    conn,
    *,
    raw_tables: dict[str, pd.DataFrame],
    phase2_datasets: dict[str, pd.DataFrame],
    prediction_limit: int,
    data_source: str,
    source_commit: str | None,
) -> list[dict[str, Any]]:
    """Publish the latest super-admin ML outputs into Supabase."""

    scored_cache: dict[str, dict[str, Any]] = {}
    for pipeline_name in CORE_SCORING_PIPELINES:
        dataset = build_predictive_dataset(pipeline_name, save_output=False)
        scored_cache[pipeline_name] = {
            "dataset": dataset,
            "scored": predict_dataframe(
                current_scoring_frame(pipeline_name, dataset),
                pipeline_name=pipeline_name,
            ),
            "metrics": load_metrics_payload(pipeline_name),
            "manifest": build_pipeline_manifest(pipeline_name, dataset=dataset),
            "spec": get_predictive_pipeline_spec(pipeline_name),
        }

    artifacts = build_super_admin_publication_artifacts(
        raw_tables,
        phase2_datasets,
        scored_cache,
        prediction_limit=prediction_limit,
    )

    summaries: list[dict[str, Any]] = []
    for artifact in artifacts:
        metrics = artifact["metrics"]
        model_name = metrics.get("best_model_name") if isinstance(metrics, dict) else None
        run_id = insert_pipeline_run(
            conn,
            pipeline_name=artifact["pipeline_name"],
            display_name=artifact["display_name"],
            model_name=model_name,
            data_source=data_source,
            source_commit=source_commit,
            metrics=metrics,
            manifest=artifact["manifest"],
            scored_entity_count=len(artifact["snapshot_rows"]),
            feature_importance=artifact["feature_importance"],
        )
        insert_prediction_rows(
            conn,
            run_id=run_id,
            pipeline_name=artifact["pipeline_name"],
            rows=artifact["snapshot_rows"],
        )
        apply_table_updates(
            conn,
            run_id=run_id,
            table_updates=artifact.get("table_updates", {}),
        )
        summaries.append(
            {
                "pipeline_name": artifact["pipeline_name"],
                "run_id": run_id,
                "published_predictions": len(artifact["snapshot_rows"]),
            }
        )

    conn.commit()
    return summaries


def main() -> None:
    args = build_parser().parse_args()

    raw_tables = load_raw_tables()
    source_label = describe_raw_source(required_tables=raw_tables.keys())
    phase2_datasets = rebuild_phase2_datasets(raw_tables)

    summary = run_predictive_pipelines()
    evaluation_dir = REPO_ROOT / "ml" / "reports" / "evaluation"
    evaluation_dir.mkdir(parents=True, exist_ok=True)
    summary.to_csv(evaluation_dir / "phase3_predictive_summary.csv", index=False)
    run_phase4_main()

    for pipeline_name in list_predictive_pipelines():
        export_pipeline(
            pipeline_name,
            REPO_ROOT / "ml" / "app-integration" / "payload_examples",
        )

    print(f"Loaded raw data from {source_label}")
    print("Retrained predictive pipelines:")
    print(summary.to_string(index=False))

    if args.dry_run:
        print("Dry run enabled; skipped publishing ML outputs to Supabase.")
        return

    data_source = "supabase_postgres" if resolve_raw_source() == "database" else "csv_raw_exports"
    source_commit = get_git_commit()
    with connect_to_postgres() as conn:
        ensure_ml_tables_ready(conn)
        published = publish_pipeline_outputs(
            conn,
            raw_tables=raw_tables,
            phase2_datasets=phase2_datasets,
            prediction_limit=max(0, args.prediction_limit),
            data_source=data_source,
            source_commit=source_commit,
        )

    print(f"Published ML outputs to {describe_database_target()}")
    for row in published:
        print(
            f"  - {row['pipeline_name']}: run_id={row['run_id']} "
            f"with {row['published_predictions']} prediction snapshots"
        )


if __name__ == "__main__":
    main()
