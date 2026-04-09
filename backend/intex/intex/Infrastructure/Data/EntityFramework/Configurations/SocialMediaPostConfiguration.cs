using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class SocialMediaPostConfiguration : IEntityTypeConfiguration<SocialMediaPost>
{
    public void Configure(EntityTypeBuilder<SocialMediaPost> builder)
    {
        builder.ToTable("social_media_posts");
        builder.HasKey(x => x.PostId);
        builder.Property(x => x.PostId).HasColumnName("post_id").ValueGeneratedOnAdd();
        builder.Property(x => x.Platform).HasColumnName("platform");
        builder.Property(x => x.PlatformPostId).HasColumnName("platform_post_id");
        builder.Property(x => x.PostUrl).HasColumnName("post_url");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp");
        builder.Property(x => x.DayOfWeek).HasColumnName("day_of_week");
        builder.Property(x => x.PostHour).HasColumnName("post_hour");
        builder.Property(x => x.PostType).HasColumnName("post_type");
        builder.Property(x => x.MediaType).HasColumnName("media_type");
        builder.Property(x => x.Caption).HasColumnName("caption");
        builder.Property(x => x.Hashtags).HasColumnName("hashtags");
        builder.Property(x => x.NumHashtags).HasColumnName("num_hashtags");
        builder.Property(x => x.MentionsCount).HasColumnName("mentions_count");
        builder.Property(x => x.HasCallToAction).HasColumnName("has_call_to_action");
        builder.Property(x => x.CallToActionType).HasColumnName("call_to_action_type");
        builder.Property(x => x.ContentTopic).HasColumnName("content_topic");
        builder.Property(x => x.SentimentTone).HasColumnName("sentiment_tone");
        builder.Property(x => x.CaptionLength).HasColumnName("caption_length");
        builder.Property(x => x.FeaturesResidentStory).HasColumnName("features_resident_story");
        builder.Property(x => x.CampaignName).HasColumnName("campaign_name");
        builder.Property(x => x.IsBoosted).HasColumnName("is_boosted");
        builder.Property(x => x.BoostBudgetPhp).HasColumnName("boost_budget_php").HasColumnType("numeric");
        builder.Property(x => x.Impressions).HasColumnName("impressions");
        builder.Property(x => x.Reach).HasColumnName("reach");
        builder.Property(x => x.Likes).HasColumnName("likes");
        builder.Property(x => x.Comments).HasColumnName("comments");
        builder.Property(x => x.Shares).HasColumnName("shares");
        builder.Property(x => x.Saves).HasColumnName("saves");
        builder.Property(x => x.ClickThroughs).HasColumnName("click_throughs");
        builder.Property(x => x.VideoViews).HasColumnName("video_views").HasColumnType("numeric");
        builder.Property(x => x.EngagementRate).HasColumnName("engagement_rate").HasColumnType("numeric");
        builder.Property(x => x.ProfileVisits).HasColumnName("profile_visits");
        builder.Property(x => x.DonationReferrals).HasColumnName("donation_referrals");
        builder.Property(x => x.EstimatedDonationValuePhp).HasColumnName("estimated_donation_value_php").HasColumnType("numeric");
        builder.Property(x => x.FollowerCountAtPost).HasColumnName("follower_count_at_post");
        builder.Property(x => x.WatchTimeSeconds).HasColumnName("watch_time_seconds").HasColumnType("numeric");
        builder.Property(x => x.AvgViewDurationSeconds).HasColumnName("avg_view_duration_seconds").HasColumnType("numeric");
        builder.Property(x => x.SubscriberCountAtPost).HasColumnName("subscriber_count_at_post").HasColumnType("numeric");
        builder.Property(x => x.Forwards).HasColumnName("forwards").HasColumnType("numeric");
        builder.Property(x => x.ConversionPredictionScore).HasColumnName("conversion_prediction_score");
        builder.Property(x => x.PredictedReferralCount).HasColumnName("predicted_referral_count").HasColumnType("numeric");
        builder.Property(x => x.PredictedDonationValuePhp).HasColumnName("predicted_donation_value_php").HasColumnType("numeric");
        builder.Property(x => x.ConversionBand).HasColumnName("conversion_band");
        builder.Property(x => x.ConversionTopDrivers).HasColumnName("conversion_top_drivers").HasColumnType("jsonb");
        builder.Property(x => x.ConversionComparablePostIds).HasColumnName("conversion_comparable_post_ids").HasColumnType("jsonb");
        builder.Property(x => x.ConversionScoreUpdatedAt).HasColumnName("conversion_score_updated_at");
    }
}
