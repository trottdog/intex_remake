"""Batch scoring helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from ml.src.inference.predict import predict_dataframe
from ml.src.inference.serializers import (
    build_prediction_response_payload,
    build_request_frame,
    dataframe_to_records,
)


def score_batch_dataframe(
    df: pd.DataFrame,
    *,
    pipeline_name: str,
    id_columns: list[str] | None = None,
) -> pd.DataFrame:
    """Score a dataframe and return the scored rows."""

    return predict_dataframe(df, pipeline_name=pipeline_name)


def score_batch_records(
    records: list[dict[str, Any]],
    *,
    pipeline_name: str,
    id_columns: list[str] | None = None,
) -> dict[str, Any]:
    """Score a list of records and return an API-style payload."""

    source = pd.DataFrame.from_records(records)
    scored = score_batch_dataframe(
        source,
        pipeline_name=pipeline_name,
        id_columns=id_columns,
    )
    return build_prediction_response_payload(
        pipeline_name,
        scored,
        id_columns=id_columns,
    )


def score_batch_csv(
    input_path: Path | str,
    *,
    pipeline_name: str,
    output_path: Path | str | None = None,
) -> pd.DataFrame:
    """Score a CSV file and optionally persist the scored output."""

    source_path = Path(input_path)
    scored = score_batch_dataframe(
        pd.read_csv(source_path),
        pipeline_name=pipeline_name,
    )

    if output_path is not None:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        scored.to_csv(destination, index=False)

    return scored


def build_sample_batch_request(
    pipeline_name: str,
    *,
    sample_size: int = 3,
) -> list[dict[str, Any]]:
    """Build a small request payload sample for a pipeline."""

    request_frame = build_request_frame(
        pipeline_name,
        sample_size=sample_size,
    )
    return dataframe_to_records(request_frame)
