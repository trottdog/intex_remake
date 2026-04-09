using System.Text.Json.Serialization;
using Intex.Persistence.Entities;

namespace Intex.Infrastructure.Donor.Contracts;

public sealed class DonationLedgerItemResponse
{
    public int Id { get; init; }
    public int SupporterId { get; init; }
    public string DonationType { get; init; } = null!;
    public decimal? Amount { get; init; }
    public string Currency { get; init; } = null!;
    public string? Campaign { get; init; }
    public int? SafehouseId { get; init; }
    public string DonationDate { get; init; } = null!;
    public string? ReceiptUrl { get; init; }
    public string? Status { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
    public string? SafehouseName { get; init; }
    public string? Category { get; init; }
}

public sealed class DonationAllocationResponse
{
    public int Id { get; init; }
    public int DonationId { get; init; }
    public int SafehouseId { get; init; }
    public string ProgramArea { get; init; } = null!;
    public decimal Amount { get; init; }
    public decimal Percentage { get; init; }
    public string SafehouseName { get; init; } = string.Empty;
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed record DonationAllocationListResponse(
    IReadOnlyCollection<DonationAllocationResponse> Data,
    int Total);

public sealed class SupporterMeResponse
{
    public int Id { get; init; }
    public string FirstName { get; init; } = null!;
    public string LastName { get; init; } = null!;
    public string Email { get; init; } = null!;
    public string? Phone { get; init; }
    public string? Organization { get; init; }
    public string SupportType { get; init; } = null!;
    public string? AcquisitionChannel { get; init; }
    public string? Segment { get; init; }
    public decimal? ChurnRiskScore { get; init; }
    public decimal? UpgradeScore { get; init; }
    public decimal LifetimeGiving { get; init; }
    public string? LastGiftDate { get; init; }
    public decimal? LastGiftAmount { get; init; }
    public bool IsRecurring { get; init; }
    public string? CommunicationPreference { get; init; }
    public string[] Interests { get; init; } = [];
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}

public sealed class SupporterGivingStatsResponse
{
    public int SupporterId { get; init; }
    public decimal LifetimeGiving { get; init; }
    public decimal GivingThisYear { get; init; }
    public string? LastGiftDate { get; init; }
    public decimal? LastGiftAmount { get; init; }
    public int NumberOfGifts { get; init; }
    public decimal AverageGiftSize { get; init; }
    public decimal LargestGift { get; init; }
    public int CampaignsSupported { get; init; }
    public bool IsRecurring { get; init; }
    public IReadOnlyCollection<DonorDashboardTrendPointResponse> MonthlyTrend { get; init; } = [];
}

public sealed record UpdateMySupporterProfileRequest(
    string? FirstName,
    string? LastName,
    string? Phone,
    string? Organization,
    string? CommunicationPreference);

public sealed class DonorDashboardTrendPointResponse
{
    public string Month { get; init; } = null!;
    public string Period { get; init; } = null!;
    public decimal Amount { get; init; }
    public decimal Total { get; init; }
    public decimal TotalAmount { get; init; }
    public int Count { get; init; }
    public int DonationCount { get; init; }
    public decimal AvgAmount { get; init; }
}

public sealed class DonorDashboardAllocationBreakdownItemResponse
{
    public string Category { get; init; } = null!;
    public string? ProgramArea { get; init; }
    public decimal Amount { get; init; }
    public decimal Percentage { get; init; }
}

public sealed class DonorDashboardImpactCardResponse
{
    public string Label { get; init; } = null!;
    public string? Title { get; init; }
    public string Value { get; init; } = null!;
    public string? Description { get; init; }
}

public sealed class DonorDashboardSummaryResponse
{
    public int SupporterId { get; init; }
    public decimal LifetimeGiving { get; init; }
    public decimal GivingThisYear { get; init; }
    public string? LastGiftDate { get; init; }
    public bool IsRecurring { get; init; }
    public int NumberOfGifts { get; init; }
    public int CampaignsSupported { get; init; }
    public IReadOnlyCollection<DonorDashboardTrendPointResponse> GivingTrend { get; init; } = [];
    public IReadOnlyCollection<DonorDashboardAllocationBreakdownItemResponse> AllocationBreakdown { get; init; } = [];
    public IReadOnlyCollection<DonorDashboardImpactCardResponse> ImpactCards { get; init; } = [];
    public IReadOnlyCollection<object> MlRecommendations { get; init; } = [];

    // Compatibility alias still present in handwritten donor frontend.
    public decimal TotalGiven { get; init; }
}

public sealed class SocialMediaPostResponse
{
    public int Id { get; init; }
    public string Platform { get; init; } = null!;
    public string PostType { get; init; } = null!;
    public string Content { get; init; } = null!;
    public string PostDate { get; init; } = null!;
    public string? TimeWindow { get; init; }
    public int Likes { get; init; }
    public int Shares { get; init; }
    public int Comments { get; init; }
    public int Reach { get; init; }
    public decimal EngagementRate { get; init; }
    public int DonationReferrals { get; init; }
    public decimal DonationValueFromPost { get; init; }
    public decimal? PredictedConversionScore { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }

    [JsonPropertyName("postedAt")]
    public string PostedAt => PostDate;

    [JsonPropertyName("donationsAttributed")]
    public decimal DonationsAttributed => DonationValueFromPost;

    [JsonPropertyName("conversionScore")]
    public decimal? ConversionScore => PredictedConversionScore;
}
