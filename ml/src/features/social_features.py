"""Social media and engagement feature builders."""

from __future__ import annotations

from collections.abc import Mapping

import pandas as pd

from ml.src.data.loaders import load_raw_tables
from ml.src.features.common_features import month_start, safe_divide_series


def build_post_features(
    tables: Mapping[str, pd.DataFrame] | None = None,
) -> pd.DataFrame:
    """Build a post-level analytic feature table."""

    data = load_raw_tables() if tables is None else dict(tables)
    posts = data["social_media_posts"].copy()

    posts = posts.sort_values(["platform", "created_at"]).reset_index(drop=True)
    posts["post_month"] = month_start(posts["created_at"])
    posts["engagement_total"] = (
        posts["likes"].fillna(0)
        + posts["comments"].fillna(0)
        + posts["shares"].fillna(0)
        + posts["saves"].fillna(0)
    )
    posts["engagement_per_1k_reach"] = safe_divide_series(
        posts["engagement_total"] * 1000,
        posts["reach"],
    )
    posts["click_through_rate"] = safe_divide_series(
        posts["click_throughs"],
        posts["reach"],
    )
    posts["profile_visit_rate"] = safe_divide_series(
        posts["profile_visits"],
        posts["reach"],
    )
    posts["donation_referrals_per_100_clicks"] = safe_divide_series(
        posts["donation_referrals"] * 100,
        posts["click_throughs"],
    )
    posts["estimated_donation_value_per_click"] = safe_divide_series(
        posts["estimated_donation_value_php"],
        posts["click_throughs"],
    )
    posts["estimated_donation_value_per_1k_reach"] = safe_divide_series(
        posts["estimated_donation_value_php"] * 1000,
        posts["reach"],
    )
    posts["boost_budget_per_1k_impressions"] = safe_divide_series(
        posts["boost_budget_php"] * 1000,
        posts["impressions"],
    )
    posts["is_video_or_reel"] = posts["media_type"].isin(["Video", "Reel"])
    posts["has_campaign_link"] = posts["campaign_name"].notna()
    posts["is_weekend_post"] = posts["day_of_week"].isin(["Saturday", "Sunday"])
    posts["days_since_previous_post_on_platform"] = (
        posts.groupby("platform")["created_at"].diff().dt.total_seconds().div(86400)
    )
    posts["follower_count_delta"] = posts.groupby("platform")[
        "follower_count_at_post"
    ].diff()
    posts["label_donation_referral_positive"] = posts["donation_referrals"].fillna(0) > 0
    posts["label_estimated_donation_value_php"] = posts[
        "estimated_donation_value_php"
    ].fillna(0.0)

    selected_columns = [
        "post_id",
        "platform",
        "created_at",
        "post_month",
        "day_of_week",
        "post_hour",
        "post_type",
        "media_type",
        "num_hashtags",
        "mentions_count",
        "has_call_to_action",
        "call_to_action_type",
        "content_topic",
        "sentiment_tone",
        "caption_length",
        "features_resident_story",
        "campaign_name",
        "is_boosted",
        "boost_budget_php",
        "impressions",
        "reach",
        "likes",
        "comments",
        "shares",
        "saves",
        "click_throughs",
        "video_views",
        "engagement_rate",
        "profile_visits",
        "follower_count_at_post",
        "watch_time_seconds",
        "avg_view_duration_seconds",
        "subscriber_count_at_post",
        "forwards",
        "engagement_total",
        "engagement_per_1k_reach",
        "click_through_rate",
        "profile_visit_rate",
        "donation_referrals_per_100_clicks",
        "estimated_donation_value_per_click",
        "estimated_donation_value_per_1k_reach",
        "boost_budget_per_1k_impressions",
        "is_video_or_reel",
        "has_campaign_link",
        "is_weekend_post",
        "days_since_previous_post_on_platform",
        "follower_count_delta",
        "donation_referrals",
        "estimated_donation_value_php",
        "label_donation_referral_positive",
        "label_estimated_donation_value_php",
    ]

    post_features = posts[selected_columns].copy()

    numeric_columns = [
        column
        for column in post_features.columns
        if column
        not in {
            "post_id",
            "platform",
            "created_at",
            "post_month",
            "day_of_week",
            "post_type",
            "media_type",
            "call_to_action_type",
            "content_topic",
            "sentiment_tone",
            "campaign_name",
        }
    ]
    post_features[numeric_columns] = post_features[numeric_columns].fillna(0)

    return post_features
