using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class SocialMediaPost
{
    public long PostId { get; init; }
    public string? Platform { get; init; }
    public string? PlatformPostId { get; init; }
    public string? PostUrl { get; init; }
    public DateTime? CreatedAt { get; init; }
    public string? DayOfWeek { get; init; }
    public int? PostHour { get; init; }
    public string? PostType { get; init; }
    public string? MediaType { get; init; }
    public string? Caption { get; init; }
    public string? Hashtags { get; init; }
    public int? NumHashtags { get; init; }
    public int? MentionsCount { get; init; }
    public bool? HasCallToAction { get; init; }
    public string? CallToActionType { get; init; }
    public string? ContentTopic { get; init; }
    public string? SentimentTone { get; init; }
    public int? CaptionLength { get; init; }
    public bool? FeaturesResidentStory { get; init; }
    public string? CampaignName { get; init; }
    public bool? IsBoosted { get; init; }
    public decimal? BoostBudgetPhp { get; init; }
    public int? Impressions { get; init; }
    public int? Reach { get; init; }
    public int? Likes { get; init; }
    public int? Comments { get; init; }
    public int? Shares { get; init; }
    public int? Saves { get; init; }
    public int? ClickThroughs { get; init; }
    public decimal? VideoViews { get; init; }
    public decimal? EngagementRate { get; init; }
    public int? ProfileVisits { get; init; }
    public int? DonationReferrals { get; init; }
    public decimal? EstimatedDonationValuePhp { get; init; }
    public int? FollowerCountAtPost { get; init; }
    public decimal? WatchTimeSeconds { get; init; }
    public decimal? AvgViewDurationSeconds { get; init; }
    public decimal? SubscriberCountAtPost { get; init; }
    public decimal? Forwards { get; init; }
    public double? ConversionPredictionScore { get; init; }
    public decimal? PredictedReferralCount { get; init; }
    public decimal? PredictedDonationValuePhp { get; init; }
    public string? ConversionBand { get; init; }
    public JsonDocument? ConversionTopDrivers { get; init; }
    public JsonDocument? ConversionComparablePostIds { get; init; }
    public DateTimeOffset? ConversionScoreUpdatedAt { get; init; }
}
