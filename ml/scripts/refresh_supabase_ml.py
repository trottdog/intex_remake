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
        manifest_json JSONB
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
POST_PIPELINES = {
    "best_posting_time",
    "social_media_conversion",
}
SAFEHOUSE_PIPELINES = {
    "capacity_pressure",
    "resource_demand",
}


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
        default=200,
        help="Maximum number of predictions to persist per pipeline run.",
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
        .head(prediction_limit)
        .reset_index(drop=True)
    )

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
                manifest_json
            )
            VALUES (%s, %s, %s, 'completed', NOW(), %s, %s, %s::jsonb, %s::jsonb)
            RETURNING run_id;
            """,
            (
                pipeline_name,
                display_name,
                model_name,
                data_source,
                source_commit,
                json.dumps(metrics),
                json.dumps(manifest),
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
            json.dumps(row["context"]),
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
                context_json
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb);
            """,
            payload,
        )


def publish_pipeline_outputs(
    conn,
    *,
    raw_tables: dict[str, pd.DataFrame],
    prediction_limit: int,
    data_source: str,
    source_commit: str | None,
) -> list[dict[str, Any]]:
    """Publish the latest trained predictive outputs into Supabase."""

    summaries: list[dict[str, Any]] = []
    for pipeline_name in list_predictive_pipelines():
        spec = get_predictive_pipeline_spec(pipeline_name)
        dataset = build_predictive_dataset(pipeline_name, save_output=False)
        scored = predict_dataframe(
            current_scoring_frame(pipeline_name, dataset),
            pipeline_name=pipeline_name,
        )
        metrics = load_metrics_payload(pipeline_name)
        manifest = build_pipeline_manifest(pipeline_name, dataset=dataset)
        prediction_rows = build_prediction_rows(
            pipeline_name,
            scored,
            raw_tables,
            prediction_limit=prediction_limit,
            task_type=str(manifest["task_type"]),
        )
        run_id = insert_pipeline_run(
            conn,
            pipeline_name=pipeline_name,
            display_name=str(spec["display_name"]),
            model_name=metrics.get("best_model_name"),
            data_source=data_source,
            source_commit=source_commit,
            metrics=metrics,
            manifest=manifest,
        )
        insert_prediction_rows(
            conn,
            run_id=run_id,
            pipeline_name=pipeline_name,
            rows=prediction_rows,
        )
        summaries.append(
            {
                "pipeline_name": pipeline_name,
                "run_id": run_id,
                "published_predictions": len(prediction_rows),
            }
        )

    conn.commit()
    return summaries


def main() -> None:
    args = build_parser().parse_args()

    raw_tables = load_raw_tables()
    source_label = describe_raw_source(required_tables=raw_tables.keys())
    rebuild_phase2_datasets(raw_tables)

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
            prediction_limit=max(1, args.prediction_limit),
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
