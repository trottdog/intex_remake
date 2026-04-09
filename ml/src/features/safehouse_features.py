"""Safehouse-focused feature builders."""

from __future__ import annotations

import ast
from collections.abc import Mapping

import pandas as pd

from ml.src.data.loaders import load_raw_tables


def build_safehouse_features(
    tables: Mapping[str, pd.DataFrame] | None = None,
) -> pd.DataFrame:
    """Build a safehouse-level analytic feature table."""

    data = load_raw_tables() if tables is None else dict(tables)

    safehouses = data["safehouses"].copy()
    residents = data["residents"].copy()
    allocations = data["donation_allocations"].copy()
    monthly_metrics = data["safehouse_monthly_metrics"].copy()
    incidents = data["incident_reports"].copy()
    latest_observation_date = monthly_metrics["month_end"].max()

    residents["length_of_stay_days_computed"] = (
        residents["date_closed"].fillna(latest_observation_date) - residents["date_of_admission"]
    ).dt.days.fillna(0)

    resident_agg = (
        residents.groupby("safehouse_id")
        .agg(
            resident_count=("resident_id", "count"),
            active_resident_count=("case_status", lambda s: int(s.eq("Active").sum())),
            completed_reintegration_count=("reintegration_status", lambda s: int(s.eq("Completed").sum())),
            avg_length_of_stay_days=("length_of_stay_days_computed", "mean"),
        )
        .reset_index()
    )

    allocation_agg = (
        allocations.groupby("safehouse_id")
        .agg(
            total_allocated_amount=("amount_allocated", "sum"),
            allocation_program_diversity=("program_area", "nunique"),
        )
        .reset_index()
    )

    monthly_agg = (
        monthly_metrics.groupby("safehouse_id")
        .agg(
            avg_active_residents_monthly=("active_residents", "mean"),
            avg_education_progress_monthly=("avg_education_progress", "mean"),
            avg_health_score_monthly=("avg_health_score", "mean"),
            total_process_recordings_monthly=("process_recording_count", "sum"),
            total_home_visitations_monthly=("home_visitation_count", "sum"),
            total_incidents_monthly=("incident_count", "sum"),
        )
        .reset_index()
    )

    incident_agg = (
        incidents.groupby("safehouse_id")
        .agg(
            incident_report_count=("incident_id", "count"),
            high_severity_incident_count=("severity", lambda s: int(s.eq("High").sum())),
        )
        .reset_index()
    )

    safehouse_features = (
        safehouses.merge(resident_agg, on="safehouse_id", how="left")
        .merge(allocation_agg, on="safehouse_id", how="left")
        .merge(monthly_agg, on="safehouse_id", how="left")
        .merge(incident_agg, on="safehouse_id", how="left")
    )

    numeric_columns = safehouse_features.select_dtypes(include=["number", "boolean"]).columns
    safehouse_features[numeric_columns] = safehouse_features[numeric_columns].fillna(0)
    safehouse_features["capacity_utilization_ratio"] = (
        safehouse_features["current_occupancy"]
        .div(safehouse_features["capacity_girls"].replace(0, pd.NA))
        .fillna(0.0)
    )

    return safehouse_features.sort_values("safehouse_id").reset_index(drop=True)


def build_safehouse_monthly_features(
    tables: Mapping[str, pd.DataFrame] | None = None,
) -> pd.DataFrame:
    """Build a safehouse-month analytic feature table with next-month labels."""

    data = load_raw_tables() if tables is None else dict(tables)

    safehouses = data["safehouses"].copy()
    monthly_metrics = data["safehouse_monthly_metrics"].copy()
    allocations = data["donation_allocations"].copy()

    monthly_metrics["month_start"] = pd.to_datetime(monthly_metrics["month_start"], errors="coerce")
    monthly_metrics["month_end"] = pd.to_datetime(monthly_metrics["month_end"], errors="coerce")
    allocations["allocation_date"] = pd.to_datetime(allocations["allocation_date"], errors="coerce")
    allocations["allocation_month"] = (
        allocations["allocation_date"].dt.to_period("M").dt.to_timestamp()
    )

    allocation_monthly = (
        allocations.groupby(["safehouse_id", "allocation_month"])
        .agg(
            allocated_amount_month=("amount_allocated", "sum"),
            allocation_count_month=("allocation_id", "count"),
            allocation_program_diversity_month=("program_area", "nunique"),
        )
        .reset_index()
        .rename(columns={"allocation_month": "month_start"})
    )

    allocation_program_amounts = (
        allocations.pivot_table(
            index=["safehouse_id", "allocation_month"],
            columns="program_area",
            values="amount_allocated",
            aggfunc="sum",
            fill_value=0.0,
        )
        .reset_index()
        .rename(columns={"allocation_month": "month_start"})
    )
    if not allocation_program_amounts.empty:
        allocation_program_amounts.columns = [
            "safehouse_id" if column == "safehouse_id" else
            "month_start" if column == "month_start" else
            f"allocated_amount_{str(column).lower().replace(' ', '_')}_month"
            for column in allocation_program_amounts.columns
        ]

    safehouse_monthly = (
        monthly_metrics[
            [
                "safehouse_id",
                "month_start",
                "month_end",
                "active_residents",
                "avg_education_progress",
                "avg_health_score",
                "process_recording_count",
                "home_visitation_count",
                "incident_count",
            ]
        ]
        .merge(
            safehouses[
                [
                    "safehouse_id",
                    "safehouse_code",
                    "name",
                    "region",
                    "city",
                    "status",
                    "open_date",
                    "capacity_girls",
                    "capacity_staff",
                ]
            ].rename(columns={"name": "safehouse_name"}),
            on="safehouse_id",
            how="left",
        )
        .merge(allocation_monthly, on=["safehouse_id", "month_start"], how="left")
        .merge(allocation_program_amounts, on=["safehouse_id", "month_start"], how="left")
        .sort_values(["safehouse_id", "month_start"])
        .reset_index(drop=True)
    )

    allocation_columns = [
        column
        for column in safehouse_monthly.columns
        if column.startswith("allocated_amount_") or column.endswith("_count_month")
    ]
    for column in allocation_columns + ["allocation_program_diversity_month"]:
        if column in safehouse_monthly.columns:
            safehouse_monthly[column] = safehouse_monthly[column].fillna(0.0)

    safehouse_monthly["safehouse_age_months"] = [
        _month_diff(open_date, snapshot_month)
        for open_date, snapshot_month in zip(
            safehouse_monthly["open_date"],
            safehouse_monthly["month_start"],
            strict=False,
        )
    ]
    safehouse_monthly["capacity_utilization_ratio"] = (
        safehouse_monthly["active_residents"]
        .div(safehouse_monthly["capacity_girls"].replace(0, pd.NA))
        .fillna(0.0)
    )
    safehouse_monthly["capacity_gap"] = (
        safehouse_monthly["capacity_girls"] - safehouse_monthly["active_residents"]
    )

    feature_columns = [
        "active_residents",
        "avg_education_progress",
        "avg_health_score",
        "process_recording_count",
        "home_visitation_count",
        "incident_count",
        "allocated_amount_month",
        "allocation_count_month",
        "allocation_program_diversity_month",
        "capacity_utilization_ratio",
    ]
    feature_columns.extend(
        [
            column
            for column in safehouse_monthly.columns
            if column.startswith("allocated_amount_") and column.endswith("_month")
        ]
    )

    for lag in (1, 2, 3):
        for column in feature_columns:
            safehouse_monthly[f"{column}_lag{lag}"] = (
                safehouse_monthly.groupby("safehouse_id")[column].shift(lag)
            )

    for window in (3, 6):
        for column in [
            "active_residents",
            "process_recording_count",
            "home_visitation_count",
            "incident_count",
            "allocated_amount_month",
            "capacity_utilization_ratio",
        ]:
            safehouse_monthly[f"{column}_rolling_mean_{window}"] = (
                safehouse_monthly.groupby("safehouse_id")[column]
                .transform(lambda series: series.shift(1).rolling(window, min_periods=1).mean())
            )

    next_month = safehouse_monthly[
        [
            "safehouse_id",
            "month_start",
            "active_residents",
            "process_recording_count",
            "home_visitation_count",
            "incident_count",
            "capacity_utilization_ratio",
        ]
    ].copy()
    next_month["month_start"] = next_month["month_start"] - pd.DateOffset(months=1)
    next_month = next_month.rename(
        columns={
            "active_residents": "next_active_residents",
            "process_recording_count": "next_process_recording_count",
            "home_visitation_count": "next_home_visitation_count",
            "incident_count": "next_incident_count",
            "capacity_utilization_ratio": "next_capacity_utilization_ratio",
        }
    )
    safehouse_monthly = safehouse_monthly.merge(
        next_month,
        on=["safehouse_id", "month_start"],
        how="left",
    )

    safehouse_monthly["future_window_complete_1m"] = safehouse_monthly[
        "next_active_residents"
    ].notna()
    safehouse_monthly["label_capacity_pressure_next_month"] = (
        safehouse_monthly["next_capacity_utilization_ratio"] >= 0.95
    )
    safehouse_monthly["label_next_active_residents"] = safehouse_monthly[
        "next_active_residents"
    ]

    return safehouse_monthly.sort_values(["safehouse_id", "month_start"]).reset_index(drop=True)


def build_public_impact_features(
    tables: Mapping[str, pd.DataFrame] | None = None,
) -> pd.DataFrame:
    """Build a public-impact monthly feature table for leadership analysis."""

    data = load_raw_tables() if tables is None else dict(tables)

    public_snapshots = data["public_impact_snapshots"].copy()
    monthly_metrics = data["safehouse_monthly_metrics"].copy()
    allocations = data["donation_allocations"].copy()
    donations = data["donations"].copy()

    public_snapshots["snapshot_date"] = pd.to_datetime(
        public_snapshots["snapshot_date"],
        errors="coerce",
    )
    monthly_metrics["month_start"] = pd.to_datetime(monthly_metrics["month_start"], errors="coerce")
    allocations["allocation_date"] = pd.to_datetime(allocations["allocation_date"], errors="coerce")
    allocations["allocation_month"] = (
        allocations["allocation_date"].dt.to_period("M").dt.to_timestamp()
    )
    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
    donations["donation_month"] = donations["donation_date"].dt.to_period("M").dt.to_timestamp()
    donations["resolved_value"] = donations["estimated_value"].fillna(donations["amount"]).fillna(0.0)

    payload = public_snapshots["metric_payload_json"].apply(_parse_metric_payload).apply(pd.Series)
    public_impact = pd.concat(
        [public_snapshots[["snapshot_date", "is_published", "published_at"]], payload],
        axis=1,
    )

    ops_monthly = (
        monthly_metrics.groupby("month_start")
        .agg(
            total_active_residents=("active_residents", "sum"),
            avg_education_progress_ops=("avg_education_progress", "mean"),
            avg_health_score_ops=("avg_health_score", "mean"),
            total_process_recordings=("process_recording_count", "sum"),
            total_home_visitations=("home_visitation_count", "sum"),
            total_incidents=("incident_count", "sum"),
        )
        .reset_index()
        .rename(columns={"month_start": "snapshot_date"})
    )

    allocation_monthly = (
        allocations.groupby("allocation_month")
        .agg(
            total_allocated_amount=("amount_allocated", "sum"),
            allocation_count=("allocation_id", "count"),
        )
        .reset_index()
        .rename(columns={"allocation_month": "snapshot_date"})
    )

    donation_monthly = (
        donations.groupby("donation_month")
        .agg(
            donation_count=("donation_id", "count"),
            monetary_donation_count=("amount", lambda series: int(series.notna().sum())),
            total_resolved_value=("resolved_value", "sum"),
            recurring_donation_share=("is_recurring", "mean"),
        )
        .reset_index()
        .rename(columns={"donation_month": "snapshot_date"})
    )

    public_impact = (
        public_impact.merge(ops_monthly, on="snapshot_date", how="left")
        .merge(allocation_monthly, on="snapshot_date", how="left")
        .merge(donation_monthly, on="snapshot_date", how="left")
        .sort_values("snapshot_date")
        .reset_index(drop=True)
    )

    # Public reporting snapshots do not always include every rolled-up summary.
    # Keep stable canonical columns by backfilling from the operational monthly aggregates
    # and monthly donation rollups when the public payload omits them.
    for canonical, fallback in (
        ("avg_health_score", "avg_health_score_ops"),
        ("avg_education_progress", "avg_education_progress_ops"),
        ("donations_total_for_month", "total_resolved_value"),
    ):
        if canonical not in public_impact.columns:
            public_impact[canonical] = public_impact[fallback]
        else:
            public_impact[canonical] = public_impact[canonical].fillna(public_impact[fallback])

    for column in [
        "total_allocated_amount",
        "allocation_count",
        "donation_count",
        "monetary_donation_count",
        "total_resolved_value",
        "recurring_donation_share",
    ]:
        public_impact[column] = public_impact[column].fillna(0.0)

    lag_columns = [
        "avg_health_score",
        "avg_education_progress",
        "donations_total_for_month",
        "total_active_residents",
        "avg_education_progress_ops",
        "avg_health_score_ops",
        "total_process_recordings",
        "total_home_visitations",
        "total_incidents",
        "total_allocated_amount",
        "donation_count",
        "total_resolved_value",
    ]
    for lag in (1, 2, 3):
        for column in lag_columns:
            public_impact[f"{column}_lag{lag}"] = public_impact[column].shift(lag)

    public_impact["snapshot_month_number"] = public_impact["snapshot_date"].dt.month
    public_impact["snapshot_quarter"] = public_impact["snapshot_date"].dt.quarter
    public_impact["snapshot_year"] = public_impact["snapshot_date"].dt.year
    public_impact["future_window_complete_1m"] = public_impact["snapshot_date"].shift(-1).notna()
    public_impact["label_next_public_donations_total_for_month"] = public_impact[
        "donations_total_for_month"
    ].shift(-1)
    public_impact["label_next_public_avg_health_score"] = public_impact["avg_health_score"].shift(-1)
    public_impact["label_next_public_avg_education_progress"] = public_impact[
        "avg_education_progress"
    ].shift(-1)

    return public_impact.sort_values("snapshot_date").reset_index(drop=True)


def _parse_metric_payload(value: object) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    if pd.isna(value):
        return {}
    return dict(ast.literal_eval(str(value)))


def _month_diff(start_value: pd.Timestamp, end_value: pd.Timestamp) -> int:
    if pd.isna(start_value) or pd.isna(end_value):
        return 0
    start = pd.Timestamp(start_value)
    end = pd.Timestamp(end_value)
    return (end.year - start.year) * 12 + (end.month - start.month)
