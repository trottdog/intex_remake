"""Source and dataset validation utilities."""

from __future__ import annotations

from collections.abc import Mapping

import pandas as pd

from ml.src.data.cleaning import infer_date_columns
from ml.src.data.schemas import (
    DATE_COLUMNS,
    EXPECTED_TABLES,
    LEAKAGE_RISK_NOTES,
    PIPELINE_TARGET_CANDIDATES,
    TABLE_METADATA,
)


def validate_expected_tables(tables: Mapping[str, pd.DataFrame]) -> list[str]:
    """Return the expected tables that are missing from a load result."""

    available = set(tables.keys())
    return sorted(set(EXPECTED_TABLES) - available)


def schema_summary(tables: Mapping[str, pd.DataFrame]) -> pd.DataFrame:
    """Build a high-level schema summary for loaded tables."""

    rows: list[dict[str, object]] = []

    for table_name, df in tables.items():
        metadata = TABLE_METADATA.get(table_name, {})
        date_columns = [
            column
            for column in DATE_COLUMNS.get(table_name, infer_date_columns(df.columns))
            if column in df.columns
        ]
        rows.append(
            {
                "table": table_name,
                "domain": metadata.get("domain", ""),
                "grain": metadata.get("grain", ""),
                "table_level": metadata.get("table_level", ""),
                "primary_key": metadata.get("primary_key", ""),
                "row_count": len(df),
                "column_count": len(df.columns),
                "date_columns": ", ".join(date_columns),
                "columns": ", ".join(map(str, df.columns)),
            }
        )

    return pd.DataFrame(rows).sort_values("table").reset_index(drop=True)


def build_date_inventory(tables: Mapping[str, pd.DataFrame]) -> pd.DataFrame:
    """Build a per-column date coverage inventory."""

    rows: list[dict[str, object]] = []

    for table_name, df in tables.items():
        for column in DATE_COLUMNS.get(table_name, infer_date_columns(df.columns)):
            if column not in df.columns:
                continue

            series = pd.to_datetime(df[column], errors="coerce")
            non_null = int(series.notna().sum())
            minimum = _format_timestamp(series.min()) if non_null else None
            maximum = _format_timestamp(series.max()) if non_null else None
            rows.append(
                {
                    "table": table_name,
                    "date_column": column,
                    "non_null_count": non_null,
                    "min_value": minimum,
                    "max_value": maximum,
                }
            )

    return pd.DataFrame(rows).sort_values(
        ["table", "date_column"]
    ).reset_index(drop=True)


def target_candidate_summary() -> pd.DataFrame:
    """Return the planned target-label candidates as a dataframe."""

    return pd.DataFrame(PIPELINE_TARGET_CANDIDATES)


def leakage_risk_summary() -> pd.DataFrame:
    """Return the planned leakage risks as a dataframe."""

    return pd.DataFrame(LEAKAGE_RISK_NOTES)


def _format_timestamp(value: pd.Timestamp | float | None) -> str | None:
    if value is None or pd.isna(value):
        return None

    timestamp = pd.Timestamp(value)
    if timestamp.hour == 0 and timestamp.minute == 0 and timestamp.second == 0:
        return timestamp.date().isoformat()
    return timestamp.isoformat(sep=" ")
