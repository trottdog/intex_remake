"""Shared feature engineering helpers."""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

import pandas as pd

DATASET_SOURCE_MAP: dict[str, str] = {
    "supporter_features": "supporters, donations, donation_allocations, in_kind_donation_items",
    "supporter_monthly_features": "supporters, donations",
    "campaign_features": "donations, donation_allocations, social_media_posts",
    "post_features": "social_media_posts",
    "resident_features": "residents, safehouses, process_recordings, home_visitations, intervention_plans, incident_reports, education_records, health_wellbeing_records",
    "resident_monthly_features": "residents, process_recordings, home_visitations, intervention_plans, incident_reports, education_records, health_wellbeing_records",
    "safehouse_features": "safehouses, residents, donation_allocations, safehouse_monthly_metrics, incident_reports",
    "safehouse_monthly_features": "safehouses, safehouse_monthly_metrics, donation_allocations",
    "public_impact_features": "public_impact_snapshots, safehouse_monthly_metrics, donation_allocations, donations",
}


def safe_divide_series(
    numerator: pd.Series,
    denominator: pd.Series | float | int,
    *,
    default: float = 0.0,
) -> pd.Series:
    """Safely divide a series by another series or scalar."""

    if isinstance(denominator, pd.Series):
        denominator_values = denominator.replace(0, pd.NA)
    else:
        denominator_values = denominator if denominator not in (0, 0.0) else pd.NA

    return numerator.div(denominator_values).fillna(default)


def month_start(series: pd.Series) -> pd.Series:
    """Convert a datetime-like series to month-start timestamps."""

    return pd.to_datetime(series, errors="coerce").dt.to_period("M").dt.to_timestamp()


def latest_record_per_group(
    df: pd.DataFrame,
    group_col: str,
    sort_col: str,
) -> pd.DataFrame:
    """Return the latest record per group based on a sort column."""

    if df.empty:
        return df.copy()

    return (
        df.sort_values([group_col, sort_col])
        .drop_duplicates(subset=[group_col], keep="last")
        .reset_index(drop=True)
    )


def build_monthly_snapshot_grid(
    entity_df: pd.DataFrame,
    *,
    entity_id_col: str,
    start_date_col: str,
    end_date_col: str,
    max_date: pd.Timestamp,
) -> pd.DataFrame:
    """Build a monthly snapshot grid from entity start and end dates."""

    rows: list[dict[str, object]] = []

    for entity in entity_df[[entity_id_col, start_date_col, end_date_col]].itertuples(index=False):
        entity_id = getattr(entity, entity_id_col)
        start_date = getattr(entity, start_date_col)
        end_date = getattr(entity, end_date_col)

        if pd.isna(start_date):
            continue

        start_month = pd.Timestamp(start_date).to_period("M").to_timestamp()
        end_value = end_date if pd.notna(end_date) else max_date
        end_month = pd.Timestamp(end_value).to_period("M").to_timestamp()

        for snapshot_month in pd.date_range(start=start_month, end=end_month, freq="MS"):
            rows.append(
                {
                    entity_id_col: entity_id,
                    "snapshot_month": snapshot_month,
                }
            )

    return pd.DataFrame(rows)


def save_dataset(df: pd.DataFrame, output_path: Path) -> Path:
    """Save a processed dataset to CSV."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    return output_path


def build_feature_catalog(datasets: Mapping[str, pd.DataFrame]) -> pd.DataFrame:
    """Build a machine-readable feature dictionary from processed datasets."""

    rows: list[dict[str, object]] = []

    for dataset_name, df in datasets.items():
        for column in df.columns:
            rows.append(
                {
                    "dataset": dataset_name,
                    "feature_name": column,
                    "dtype": str(df[column].dtype),
                    "feature_role": infer_feature_role(column, df[column]),
                    "source_tables": DATASET_SOURCE_MAP.get(dataset_name, ""),
                    "description": infer_feature_description(column),
                }
            )

    return pd.DataFrame(rows).sort_values(
        ["dataset", "feature_role", "feature_name"]
    ).reset_index(drop=True)


def infer_feature_role(column_name: str, series: pd.Series) -> str:
    """Infer the role of a feature from its name and dtype."""

    if column_name.startswith("label_"):
        return "label"
    if column_name.endswith("_id") or column_name in {"campaign_name", "snapshot_month"}:
        return "key"
    if "date" in column_name or "month" in column_name:
        return "time_index"
    if pd.api.types.is_bool_dtype(series):
        return "flag"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric_feature"
    return "categorical_feature"


def infer_feature_description(column_name: str) -> str:
    """Generate a readable description from a feature name."""

    readable = column_name.replace("_", " ")
    readable = readable.replace("pct", "percent")
    readable = readable.replace("avg", "average")
    readable = readable.replace("num", "number")
    readable = readable.replace("cta", "call to action")
    return readable.capitalize()
