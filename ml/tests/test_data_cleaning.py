import pandas as pd

from ml.src.data.cleaning import infer_date_columns, parse_dates, standardize_column_names


def test_standardize_column_names_uses_snake_case() -> None:
    df = pd.DataFrame(columns=["Donation Date", "Supporter-ID", "Created At"])

    standardized = standardize_column_names(df)

    assert list(standardized.columns) == [
        "donation_date",
        "supporter_id",
        "created_at",
    ]


def test_parse_dates_infers_common_date_fields() -> None:
    df = pd.DataFrame(
        {
            "created_at": ["2024-01-05 10:15:00"],
            "month_start": ["2024-01-01"],
            "name": ["demo"],
        }
    )

    parsed = parse_dates(df)

    assert "created_at" in infer_date_columns(df.columns)
    assert str(parsed["created_at"].dtype).startswith("datetime64")
    assert str(parsed["month_start"].dtype).startswith("datetime64")
