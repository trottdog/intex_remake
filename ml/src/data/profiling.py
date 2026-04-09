"""Shared exploratory data analysis helpers for Phase 1."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from pathlib import Path

import matplotlib
import pandas as pd
from pandas.api.types import (
    is_bool_dtype,
    is_datetime64_any_dtype,
    is_numeric_dtype,
)

matplotlib.use("Agg")

import matplotlib.pyplot as plt

from ml.src.data.schemas import DATE_COLUMNS, TABLE_METADATA

KEY_PHASE1_TABLES: tuple[str, ...] = (
    "supporters",
    "donations",
    "residents",
    "process_recordings",
    "home_visitations",
    "intervention_plans",
    "incident_reports",
    "social_media_posts",
)

PRIMARY_DATE_COLUMNS: dict[str, str] = {
    "supporters": "first_donation_date",
    "donations": "donation_date",
    "residents": "date_of_admission",
    "process_recordings": "session_date",
    "home_visitations": "visit_date",
    "intervention_plans": "created_at",
    "incident_reports": "incident_date",
    "social_media_posts": "created_at",
}

_AUTO_PREVALENCE = object()


def profile_table(df: pd.DataFrame, table_name: str) -> dict[str, object]:
    """Build a one-row table profile."""

    row_count = len(df)
    column_count = len(df.columns)
    total_cells = row_count * column_count
    missing_cells = int(df.isna().sum().sum())

    return {
        "table": table_name,
        "domain": TABLE_METADATA.get(table_name, {}).get("domain", ""),
        "grain": TABLE_METADATA.get(table_name, {}).get("grain", ""),
        "row_count": row_count,
        "column_count": column_count,
        "numeric_column_count": sum(is_numeric_dtype(df[column]) for column in df.columns),
        "datetime_column_count": sum(
            is_datetime64_any_dtype(df[column]) for column in df.columns
        ),
        "boolean_column_count": sum(is_bool_dtype(df[column]) for column in df.columns),
        "categorical_column_count": len(_categorical_columns(df)),
        "duplicate_row_count": int(df.duplicated().sum()),
        "columns_with_missing_values": int((df.isna().sum() > 0).sum()),
        "missing_cell_count": missing_cells,
        "missing_cell_pct": round(
            (missing_cells / total_cells) * 100,
            2,
        )
        if total_cells
        else 0.0,
    }


def build_table_profile_report(
    tables: Mapping[str, pd.DataFrame],
    *,
    table_names: Sequence[str] | None = None,
) -> pd.DataFrame:
    """Build the profile report for one or more tables."""

    selected_tables = tuple(table_names or tables.keys())
    rows = [profile_table(tables[table_name], table_name) for table_name in selected_tables]

    return pd.DataFrame(rows).sort_values("table").reset_index(drop=True)


def build_missingness_report(
    tables: Mapping[str, pd.DataFrame],
    *,
    table_names: Sequence[str] | None = None,
) -> pd.DataFrame:
    """Return a long-form missingness report."""

    selected_tables = tuple(table_names or tables.keys())
    rows: list[dict[str, object]] = []

    for table_name in selected_tables:
        df = tables[table_name]
        row_count = len(df)

        for column in df.columns:
            missing_count = int(df[column].isna().sum())
            rows.append(
                {
                    "table": table_name,
                    "column": column,
                    "dtype": str(df[column].dtype),
                    "row_count": row_count,
                    "non_null_count": int(df[column].notna().sum()),
                    "missing_count": missing_count,
                    "missing_pct": round((missing_count / row_count) * 100, 2)
                    if row_count
                    else 0.0,
                }
            )

    return (
        pd.DataFrame(rows)
        .sort_values(["table", "missing_pct", "column"], ascending=[True, False, True])
        .reset_index(drop=True)
    )


def summarize_categoricals(
    df: pd.DataFrame,
    table_name: str,
    *,
    top_n: int = 5,
) -> pd.DataFrame:
    """Summarize categorical-like columns for one table."""

    rows: list[dict[str, object]] = []

    for column in _categorical_columns(df):
        series = df[column]
        non_null = series.dropna()
        unique_count = int(non_null.nunique(dropna=True))
        unique_ratio = round((unique_count / len(non_null)) * 100, 2) if len(non_null) else 0.0
        average_length = round(non_null.astype(str).str.len().mean(), 2) if len(non_null) else 0.0
        rows.append(
            {
                "table": table_name,
                "column": column,
                "dtype": str(series.dtype),
                "non_null_count": int(non_null.shape[0]),
                "missing_pct": round((series.isna().mean()) * 100, 2),
                "unique_count": unique_count,
                "unique_ratio_pct": unique_ratio,
                "avg_text_length": average_length,
                "column_role": _categorical_role(series, unique_count, unique_ratio, average_length),
                "top_values": _format_top_values(non_null, top_n=top_n),
            }
        )

    return pd.DataFrame(rows)


def build_categorical_report(
    tables: Mapping[str, pd.DataFrame],
    *,
    table_names: Sequence[str] | None = None,
    top_n: int = 5,
) -> pd.DataFrame:
    """Build categorical summaries for one or more tables."""

    selected_tables = tuple(table_names or tables.keys())
    frames = [
        summarize_categoricals(tables[table_name], table_name, top_n=top_n)
        for table_name in selected_tables
    ]
    frames = [frame for frame in frames if not frame.empty]

    if not frames:
        return pd.DataFrame()

    return pd.concat(frames, ignore_index=True).sort_values(
        ["table", "column"]
    ).reset_index(drop=True)


def summarize_time_coverage(
    df: pd.DataFrame,
    date_col: str,
    table_name: str,
    *,
    freq: str = "MS",
) -> pd.DataFrame:
    """Summarize record counts over time for a single date column."""

    if date_col not in df.columns:
        return pd.DataFrame(
            columns=["table", "date_column", "period_start", "record_count"]
        )

    series = pd.to_datetime(df[date_col], errors="coerce").dropna()
    if series.empty:
        return pd.DataFrame(
            columns=["table", "date_column", "period_start", "record_count"]
        )

    if freq != "MS":
        raise ValueError("Only monthly frequency is currently supported.")

    counts = (
        series.dt.to_period("M").dt.to_timestamp().value_counts().sort_index()
    )

    return pd.DataFrame(
        {
            "table": table_name,
            "date_column": date_col,
            "period_start": counts.index,
            "record_count": counts.values,
        }
    )


def build_time_coverage_reports(
    tables: Mapping[str, pd.DataFrame],
    *,
    table_names: Sequence[str] | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Build summary and monthly time-coverage reports."""

    selected_tables = tuple(table_names or tables.keys())
    summary_rows: list[dict[str, object]] = []
    monthly_frames: list[pd.DataFrame] = []

    for table_name in selected_tables:
        df = tables[table_name]
        for date_column in DATE_COLUMNS.get(table_name, []):
            monthly = summarize_time_coverage(df, date_column, table_name)
            if monthly.empty:
                continue

            monthly_frames.append(monthly)
            peak_row = monthly.loc[monthly["record_count"].idxmax()]
            summary_rows.append(
                {
                    "table": table_name,
                    "date_column": date_column,
                    "non_null_count": int(monthly["record_count"].sum()),
                    "min_value": monthly["period_start"].min().date().isoformat(),
                    "max_value": monthly["period_start"].max().date().isoformat(),
                    "active_month_count": int(monthly["period_start"].nunique()),
                    "peak_month": peak_row["period_start"].date().isoformat(),
                    "peak_month_record_count": int(peak_row["record_count"]),
                    "median_monthly_record_count": float(monthly["record_count"].median()),
                }
            )

    monthly_report = (
        pd.concat(monthly_frames, ignore_index=True)
        if monthly_frames
        else pd.DataFrame(columns=["table", "date_column", "period_start", "record_count"])
    )
    summary_report = pd.DataFrame(summary_rows).sort_values(
        ["table", "date_column"]
    ).reset_index(drop=True)

    return summary_report, monthly_report


def plot_missingness(
    df: pd.DataFrame,
    table_name: str,
    output_path: Path,
    *,
    max_columns: int = 25,
) -> Path:
    """Save a missingness plot for a table."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    missing_pct = (df.isna().mean() * 100).sort_values(ascending=False)

    fig, ax = plt.subplots(figsize=(10, 6))

    if float(missing_pct.max()) == 0.0:
        ax.text(0.5, 0.5, "No missing values", ha="center", va="center", fontsize=14)
        ax.set_axis_off()
    else:
        plot_data = missing_pct.head(max_columns)
        ax.barh(plot_data.index[::-1], plot_data.values[::-1], color="#d97706")
        ax.set_xlabel("Missing Percentage")
        ax.set_ylabel("Column")
        ax.set_title(f"{table_name}: missingness by column")

    fig.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return output_path


def plot_time_coverage(
    df: pd.DataFrame,
    date_col: str,
    table_name: str,
    output_path: Path,
) -> Path:
    """Save a monthly record-count plot for a date column."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    monthly = summarize_time_coverage(df, date_col, table_name)

    fig, ax = plt.subplots(figsize=(10, 4.5))
    if monthly.empty:
        ax.text(0.5, 0.5, "No valid dates available", ha="center", va="center", fontsize=14)
        ax.set_axis_off()
    else:
        ax.plot(monthly["period_start"], monthly["record_count"], color="#0f766e", linewidth=2)
        ax.fill_between(
            monthly["period_start"],
            monthly["record_count"],
            color="#99f6e4",
            alpha=0.5,
        )
        ax.set_title(f"{table_name}: monthly counts for {date_col}")
        ax.set_xlabel("Month")
        ax.set_ylabel("Record count")
        ax.tick_params(axis="x", rotation=45)

    fig.tight_layout()
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    return output_path


def build_label_feasibility_report(
    tables: Mapping[str, pd.DataFrame],
) -> pd.DataFrame:
    """Estimate class balance and viability for the planned pipeline labels."""

    donations = tables["donations"].copy()
    residents = tables["residents"].copy()
    incidents = tables["incident_reports"].copy()
    posts = tables["social_media_posts"].copy()
    plans = tables["intervention_plans"].copy()

    max_donation_date = donations["donation_date"].max()
    donor_last_dates = donations.groupby("supporter_id")["donation_date"].max()
    donor_positive = int(
        (donor_last_dates <= (max_donation_date - pd.Timedelta(days=180))).sum()
    )
    donor_observations = int(donor_last_dates.shape[0])

    resident_month_grid = _build_resident_month_grid(tables)
    incident_positive = _count_incident_next_30d(resident_month_grid, incidents)
    reintegration_positive = _count_reintegration_next_90d(resident_month_grid, residents)

    post_positive = int(
        (
            (posts["donation_referrals"].fillna(0) > 0)
            | (posts["estimated_donation_value_php"].fillna(0) > 0)
        ).sum()
    )

    campaign_periods = (
        donations.dropna(subset=["campaign_name"])
        .assign(
            campaign_month=lambda frame: frame["donation_date"]
            .dt.to_period("M")
            .dt.to_timestamp()
        )
        .groupby(["campaign_name", "campaign_month"])
        .size()
        .reset_index(name="donation_count")
    )

    intervention_achieved = int((plans["status"] == "Achieved").sum())

    rows = [
        _label_row(
            pipeline="donor_churn",
            task_type="predictive",
            label_definition="Supporter has no donation in the next 180 days as of the data end-state.",
            observation_grain="supporter",
            observation_count=donor_observations,
            positive_count=donor_positive,
            notes="Healthy class balance and clear timestamping make this the strongest first predictive label.",
            feasibility_override="high",
        ),
        _label_row(
            pipeline="reintegration_readiness",
            task_type="predictive",
            label_definition="Resident reaches Completed reintegration status within 90 days of a resident-month snapshot, using date_closed as the completion proxy.",
            observation_grain="resident_month",
            observation_count=int(len(resident_month_grid)),
            positive_count=reintegration_positive,
            notes="Feasible but highly imbalanced and relies on completion timing proxy from date_closed.",
        ),
        _label_row(
            pipeline="social_post_to_donation",
            task_type="predictive",
            label_definition="Social post produces at least one donation referral or positive referred donation value.",
            observation_grain="post",
            observation_count=int(len(posts)),
            positive_count=post_positive,
            notes="Strong sample size, though the high positive rate suggests regression or multi-threshold framing may work better than a simple binary target.",
        ),
        _label_row(
            pipeline="resident_regression_risk",
            task_type="predictive",
            label_definition="Resident has an incident within the next 30 days of a resident-month snapshot.",
            observation_grain="resident_month",
            observation_count=int(len(resident_month_grid)),
            positive_count=incident_positive,
            notes="Useful resident safety target with manageable but meaningful imbalance.",
        ),
        _label_row(
            pipeline="campaign_effectiveness_explanation",
            task_type="explanatory",
            label_definition="Campaign-period donation lift and donor response across named campaigns.",
            observation_grain="campaign_month",
            observation_count=int(len(campaign_periods)),
            positive_count=int((campaign_periods["donation_count"] > 0).sum()),
            notes="Only four campaign names and 21 campaign-month observations exist, so this should stay explanation-first.",
            prevalence_override=None,
            feasibility_override="medium",
        ),
        _label_row(
            pipeline="intervention_effectiveness_explanation",
            task_type="explanatory",
            label_definition="Intervention plans associated with achieved status and downstream resident progress.",
            observation_grain="intervention_plan",
            observation_count=int(len(plans)),
            positive_count=intervention_achieved,
            notes="Enough plans for descriptive analysis, but treatment selection bias makes causal prediction inappropriate.",
            prevalence_override=None,
            feasibility_override="medium",
        ),
    ]

    return pd.DataFrame(rows)


def _categorical_columns(df: pd.DataFrame) -> list[str]:
    columns: list[str] = []

    for column in df.columns:
        series = df[column]
        if is_bool_dtype(series) or is_datetime64_any_dtype(series):
            continue
        if not is_numeric_dtype(series):
            columns.append(column)

    return columns


def _categorical_role(
    series: pd.Series,
    unique_count: int,
    unique_ratio_pct: float,
    average_length: float,
) -> str:
    if is_bool_dtype(series):
        return "boolean"
    if unique_count <= 12:
        return "low_cardinality_categorical"
    if unique_ratio_pct >= 50 or average_length >= 35:
        return "high_cardinality_or_text"
    return "moderate_cardinality_categorical"


def _format_top_values(series: pd.Series, *, top_n: int) -> str:
    if series.empty:
        return ""

    counts = series.astype(str).value_counts().head(top_n)
    total = counts.sum()
    parts = []
    for label, count in counts.items():
        pct = round((count / total) * 100, 1) if total else 0.0
        parts.append(f"{label}={count} ({pct}%)")
    return " | ".join(parts)


def _build_resident_month_grid(tables: Mapping[str, pd.DataFrame]) -> pd.DataFrame:
    residents = tables["residents"].copy()
    max_observation_date = max(
        _max_timestamp(tables["residents"]["date_closed"]),
        _max_timestamp(tables["process_recordings"]["session_date"]),
        _max_timestamp(tables["home_visitations"]["visit_date"]),
        _max_timestamp(tables["education_records"]["record_date"]),
        _max_timestamp(tables["health_wellbeing_records"]["record_date"]),
        _max_timestamp(tables["incident_reports"]["incident_date"]),
        _max_timestamp(tables["intervention_plans"]["updated_at"]),
    )

    rows: list[dict[str, object]] = []
    for resident in residents[["resident_id", "date_of_admission", "date_closed"]].itertuples(
        index=False
    ):
        if pd.isna(resident.date_of_admission):
            continue

        start_month = pd.Timestamp(resident.date_of_admission).to_period("M").to_timestamp()
        end_value = resident.date_closed if pd.notna(resident.date_closed) else max_observation_date
        end_month = pd.Timestamp(end_value).to_period("M").to_timestamp()
        for snapshot_month in pd.date_range(start=start_month, end=end_month, freq="MS"):
            rows.append(
                {
                    "resident_id": int(resident.resident_id),
                    "snapshot_month": snapshot_month,
                }
            )

    return pd.DataFrame(rows)


def _count_incident_next_30d(
    resident_month_grid: pd.DataFrame,
    incidents: pd.DataFrame,
) -> int:
    incident_dates_by_resident = (
        incidents.dropna(subset=["incident_date"])
        .groupby("resident_id")["incident_date"]
        .apply(list)
        .to_dict()
    )

    positive_count = 0
    for row in resident_month_grid.itertuples(index=False):
        horizon_end = row.snapshot_month + pd.Timedelta(days=30)
        positive_count += int(
            any(
                row.snapshot_month < incident_date <= horizon_end
                for incident_date in incident_dates_by_resident.get(row.resident_id, [])
            )
        )

    return positive_count


def _count_reintegration_next_90d(
    resident_month_grid: pd.DataFrame,
    residents: pd.DataFrame,
) -> int:
    completion_dates = (
        residents.loc[
            (residents["reintegration_status"] == "Completed")
            & residents["date_closed"].notna(),
            ["resident_id", "date_closed"],
        ]
        .set_index("resident_id")["date_closed"]
        .to_dict()
    )

    positive_count = 0
    for row in resident_month_grid.itertuples(index=False):
        completion_date = completion_dates.get(row.resident_id)
        if pd.isna(completion_date):
            continue
        positive_count += int(
            row.snapshot_month < completion_date <= row.snapshot_month + pd.Timedelta(days=90)
        )

    return positive_count


def _label_row(
    *,
    pipeline: str,
    task_type: str,
    label_definition: str,
    observation_grain: str,
    observation_count: int,
    positive_count: int,
    notes: str,
    prevalence_override: float | None | object = _AUTO_PREVALENCE,
    feasibility_override: str | None = None,
) -> dict[str, object]:
    if prevalence_override is _AUTO_PREVALENCE:
        prevalence: float | None = positive_count / observation_count if observation_count else 0.0
    else:
        prevalence = prevalence_override
    feasibility = (
        feasibility_override
        if feasibility_override is not None
        else _classify_feasibility(task_type, observation_count, positive_count, prevalence)
    )

    return {
        "pipeline": pipeline,
        "task_type": task_type,
        "label_definition": label_definition,
        "observation_grain": observation_grain,
        "observation_count": observation_count,
        "positive_count": positive_count,
        "prevalence": round(prevalence, 4) if prevalence is not None else None,
        "feasibility": feasibility,
        "notes": notes,
    }


def _classify_feasibility(
    task_type: str,
    observation_count: int,
    positive_count: int,
    prevalence: float,
) -> str:
    if task_type == "explanatory":
        if observation_count >= 100:
            return "medium"
        return "low"

    if observation_count < 100 or positive_count < 20:
        return "low"
    if 0.05 <= prevalence <= 0.7 and observation_count >= 300:
        return "high"
    return "medium"


def _max_timestamp(series: pd.Series) -> pd.Timestamp:
    return pd.to_datetime(series, errors="coerce").dropna().max()
