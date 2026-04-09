"""Example resident risk API integration."""

from __future__ import annotations

from ml.src.inference.batch_score import score_batch_records


def resident_risk_endpoint_example(
    records: list[dict[str, object]],
) -> dict[str, object]:
    """Example endpoint body for resident-risk scoring."""

    return score_batch_records(
        records,
        pipeline_name="resident_risk",
        id_columns=["resident_id", "safehouse_id"],
    )
