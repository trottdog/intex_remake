from decimal import Decimal

from ml.src.data.loaders import load_raw_tables
from ml.src.features.donor_features import (
    build_campaign_features,
    build_supporter_features,
    build_supporter_monthly_features,
)
from ml.src.features.resident_features import (
    build_resident_features,
    build_resident_monthly_features,
)
from ml.src.features.safehouse_features import (
    build_public_impact_features,
    build_safehouse_features,
    build_safehouse_monthly_features,
)
from ml.src.features.social_features import build_post_features


def test_supporter_features_include_expected_labels() -> None:
    supporter_features = build_supporter_features(load_raw_tables())

    assert len(supporter_features) == 60
    assert int(supporter_features["has_any_donation"].sum()) == 59
    assert int(supporter_features["label_lapsed_180d"].sum()) == 21


def test_supporter_monthly_features_include_phase_c_labels() -> None:
    supporter_monthly = build_supporter_monthly_features(load_raw_tables())

    assert len(supporter_monthly) >= 1500
    assert "label_donor_upgrade_next_180d" in supporter_monthly.columns
    assert "label_recurring_conversion_next_180d" in supporter_monthly.columns
    assert "label_next_monetary_amount_180d" in supporter_monthly.columns
    assert int(supporter_monthly["label_donor_upgrade_next_180d"].sum()) > 0
    assert int(supporter_monthly["label_recurring_conversion_next_180d"].sum()) == 0
    assert int(supporter_monthly["label_has_next_monetary_donation_180d"].sum()) > 0


def test_supporter_monthly_features_accept_decimal_donation_values() -> None:
    tables = load_raw_tables()
    donations = tables["donations"].copy()

    first_monetary_index = donations["amount"].first_valid_index()
    assert first_monetary_index is not None

    donations["amount"] = donations["amount"].astype(object)
    donations["estimated_value"] = donations["estimated_value"].astype(object)
    donations.loc[first_monetary_index, "amount"] = Decimal("125.50")
    donations.loc[first_monetary_index, "estimated_value"] = Decimal("125.50")
    tables["donations"] = donations

    supporter_monthly = build_supporter_monthly_features(tables)

    assert len(supporter_monthly) >= 1500
    assert supporter_monthly["total_monetary_amount_lifetime"].notna().all()
    assert supporter_monthly["total_resolved_value_lifetime"].notna().all()


def test_campaign_and_post_features_build_expected_shapes() -> None:
    tables = load_raw_tables()
    campaign_features = build_campaign_features(tables)
    post_features = build_post_features(tables)

    assert campaign_features["campaign_name"].nunique() == 4
    assert len(campaign_features) >= 21
    assert len(post_features) == 812
    assert "label_donation_referral_positive" in post_features.columns


def test_resident_feature_tables_capture_expected_label_balance() -> None:
    tables = load_raw_tables()
    resident_features = build_resident_features(tables)
    resident_monthly_features = build_resident_monthly_features(tables)

    assert len(resident_features) == 60
    assert len(resident_monthly_features) == 1533
    assert int(resident_monthly_features["label_incident_next_30d"].sum()) == 93
    assert int(
        resident_monthly_features["label_reintegration_complete_next_90d"].sum()
    ) == 36
    assert "label_case_prioritization_next_60d" in resident_monthly_features.columns
    assert "label_counseling_progress_next_90d" in resident_monthly_features.columns
    assert "label_education_improvement_next_120d" in resident_monthly_features.columns
    assert "label_wellbeing_deterioration_next_90d" in resident_monthly_features.columns
    assert "label_supportive_home_visit_next_120d" in resident_monthly_features.columns
    assert int(resident_monthly_features["label_case_prioritization_next_60d"].sum()) > 0
    assert int(resident_monthly_features["label_counseling_progress_next_90d"].sum()) > 0
    assert int(resident_monthly_features["label_education_improvement_next_120d"].sum()) > 0
    assert int(resident_monthly_features["label_wellbeing_deterioration_next_90d"].sum()) > 0
    assert int(resident_monthly_features["label_supportive_home_visit_next_120d"].sum()) > 0


def test_safehouse_feature_tables_capture_phase_e_outputs() -> None:
    tables = load_raw_tables()
    safehouse_features = build_safehouse_features(tables)
    safehouse_monthly_features = build_safehouse_monthly_features(tables)
    public_impact_features = build_public_impact_features(tables)

    assert len(safehouse_features) == 9
    assert len(safehouse_monthly_features) == 450
    assert len(public_impact_features) == 50
    assert "label_capacity_pressure_next_month" in safehouse_monthly_features.columns
    assert "label_next_active_residents" in safehouse_monthly_features.columns
    assert "label_next_public_donations_total_for_month" in public_impact_features.columns
    assert "label_next_public_avg_health_score" in public_impact_features.columns
    assert int(safehouse_monthly_features["label_capacity_pressure_next_month"].sum()) > 0
    assert int(safehouse_monthly_features["future_window_complete_1m"].sum()) > 0
    assert public_impact_features["label_next_public_donations_total_for_month"].notna().sum() > 0
