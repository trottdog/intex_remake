from ml.src.data.loaders import load_raw_tables
from ml.src.data.profiling import (
    build_label_feasibility_report,
    build_table_profile_report,
    build_time_coverage_reports,
)


def test_table_profile_report_includes_key_counts() -> None:
    profiles = build_table_profile_report(load_raw_tables())

    donations = profiles.loc[profiles["table"] == "donations"].iloc[0]

    assert int(donations["row_count"]) == 420
    assert int(donations["column_count"]) == 13


def test_time_coverage_reports_capture_donations_range() -> None:
    summary, monthly = build_time_coverage_reports(
        load_raw_tables(),
        table_names=("donations",),
    )

    donations = summary.loc[summary["table"] == "donations"].iloc[0]

    assert donations["min_value"] == "2023-01-01"
    assert donations["max_value"] == "2026-03-01"
    assert not monthly.empty


def test_label_feasibility_report_contains_expected_prevalence() -> None:
    report = build_label_feasibility_report(load_raw_tables())

    donor_churn = report.loc[report["pipeline"] == "donor_churn"].iloc[0]
    reintegration = report.loc[
        report["pipeline"] == "reintegration_readiness"
    ].iloc[0]
    social = report.loc[report["pipeline"] == "social_post_to_donation"].iloc[0]

    assert int(donor_churn["positive_count"]) == 21
    assert float(donor_churn["prevalence"]) == 0.3559
    assert int(reintegration["positive_count"]) == 36
    assert int(social["positive_count"]) == 522
