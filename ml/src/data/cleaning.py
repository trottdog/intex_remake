"""Data cleaning utilities."""

from __future__ import annotations

import re
from collections.abc import Iterable

import pandas as pd

DATE_SUFFIXES = ("_date", "_at")
DATE_EXACT_NAMES = {
    "assignment_start",
    "assignment_end",
    "month_start",
    "month_end",
}


def standardize_column_name(column_name: str) -> str:
    """Convert a column header to snake_case ASCII-friendly text."""

    normalized = re.sub(r"[^0-9A-Za-z]+", "_", str(column_name).strip())
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", normalized)
    normalized = re.sub(r"_+", "_", normalized)
    return normalized.strip("_").lower()


def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy with standardized snake_case column names."""

    renamed_columns = {
        column: standardize_column_name(str(column))
        for column in df.columns
    }
    return df.rename(columns=renamed_columns)


def infer_date_columns(columns: Iterable[str]) -> list[str]:
    """Infer which columns should be parsed as datetimes."""

    inferred: list[str] = []

    for column in columns:
        column_name = str(column)
        if (
            column_name.endswith(DATE_SUFFIXES)
            or column_name.startswith("date_")
            or column_name in DATE_EXACT_NAMES
        ):
            inferred.append(column_name)

    return inferred


def parse_dates(
    df: pd.DataFrame,
    date_columns: Iterable[str] | None = None,
) -> pd.DataFrame:
    """Parse date-like columns into pandas datetime values."""

    parsed = df.copy()
    columns_to_parse = list(date_columns or infer_date_columns(parsed.columns))

    for column in columns_to_parse:
        if column in parsed.columns:
            parsed[column] = pd.to_datetime(parsed[column], errors="coerce")

    return parsed
