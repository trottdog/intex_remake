"""Example donor retention API integration."""

from __future__ import annotations

from ml.src.inference.batch_score import score_batch_records


def donor_retention_endpoint_example(
    records: list[dict[str, object]],
) -> dict[str, object]:
    """Example endpoint body for donor-retention scoring."""

    return score_batch_records(
        records,
        pipeline_name="donor_retention",
        id_columns=["supporter_id"],
    )
