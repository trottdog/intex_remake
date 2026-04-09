using System.Text.Json.Serialization;

namespace Intex.Infrastructure.ExtendedAdmin.Contracts;

public sealed class SafehouseResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = null!;
    public string Location { get; init; } = null!;
    public int Capacity { get; init; }
    public int CurrentOccupancy { get; init; }
    public string[] ProgramAreas { get; init; } = [];
    public string Status { get; init; } = null!;
    public string? ContactName { get; init; }
    public string? ContactEmail { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}

public sealed record CreateSafehouseRequest(
    string? Name,
    string? Location,
    int? Capacity,
    string[]? ProgramAreas,
    string? Status,
    string? ContactName,
    string? ContactEmail);

public sealed record UpdateSafehouseRequest(
    string? Name,
    string? Location,
    int? Capacity,
    string[]? ProgramAreas,
    string? Status,
    string? ContactName,
    string? ContactEmail);

public sealed class SafehouseMonthlyMetricResponse
{
    public int Id { get; init; }
    public int SafehouseId { get; init; }
    public string Month { get; init; } = null!;
    public int ActiveResidents { get; init; }
    public int NewAdmissions { get; init; }
    public int Discharges { get; init; }
    public int IncidentCount { get; init; }
    public int ProcessRecordingCount { get; init; }
    public int VisitCount { get; init; }
    public decimal? AvgHealthScore { get; init; }
    public decimal? AvgEducationProgress { get; init; }
}

public sealed class PartnerResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = null!;
    public string ProgramArea { get; init; } = null!;
    public string? ContactName { get; init; }
    public string? ContactEmail { get; init; }
    public string? Phone { get; init; }
    public string Status { get; init; } = null!;
    public int AssignmentCount { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed record CreatePartnerRequest(
    string? Name,
    string? ProgramArea,
    string? ContactName,
    string? ContactEmail,
    string? Phone,
    string? Status);

public sealed record UpdatePartnerRequest(
    string? Name,
    string? ProgramArea,
    string? ContactName,
    string? ContactEmail,
    string? Phone,
    string? Status);

public sealed class PartnerAssignmentResponse
{
    public int Id { get; init; }
    public int PartnerId { get; init; }
    public int SafehouseId { get; init; }
    public string? PartnerName { get; init; }
    public string? SafehouseName { get; init; }
    public string? ProgramArea { get; init; }
    public string StartDate { get; init; } = null!;
    public string? EndDate { get; init; }
    public string? Notes { get; init; }
}

public sealed record CreatePartnerAssignmentRequest(
    int? PartnerId,
    int? SafehouseId,
    string? ProgramArea,
    string? StartDate,
    string? EndDate,
    string? Notes);

public sealed class DataListResponse<T>
{
    public IReadOnlyList<T> Data { get; init; } = [];
}

public sealed class ReportDonationTrendResponse
{
    public int Id { get; init; }
    public string Period { get; init; } = null!;
    public decimal TotalAmount { get; init; }
    public int DonorCount { get; init; }
    public int NewDonors { get; init; }
    public decimal RecurringRevenue { get; init; }
    public decimal AvgGiftSize { get; init; }
    public decimal RetentionRate { get; init; }
}

public sealed class ReportAccomplishmentResponse
{
    public int Id { get; init; }
    public int Year { get; init; }
    public string ServiceArea { get; init; } = null!;
    public string Category { get; init; } = null!;
    public int BeneficiaryCount { get; init; }
    public int SessionsDelivered { get; init; }
    public string OutcomeSummary { get; init; } = null!;
    public string? Notes { get; init; }
}

public sealed class ReportReintegrationStatResponse
{
    public int Id { get; init; }
    public string Period { get; init; } = null!;
    public int? SafehouseId { get; init; }
    public string? SafehouseName { get; init; }
    public int TotalResidents { get; init; }
    public int ReintegrationCompleted { get; init; }
    public decimal AvgDaysToReintegration { get; init; }
    public decimal SuccessRate { get; init; }
    public decimal? AvgHealthScoreAtDischarge { get; init; }
    public decimal? AvgEducationProgressAtDischarge { get; init; }

    [JsonPropertyName("reintegrated")]
    public int Reintegrated => ReintegrationCompleted;

    [JsonPropertyName("total")]
    public int Total => TotalResidents;
}

public sealed class SocialMediaAnalyticsPlatformBreakdownItemResponse
{
    public string Platform { get; init; } = null!;
    public int Posts { get; init; }
    public decimal AvgEngagement { get; init; }
    public int DonationReferrals { get; init; }
}

public sealed class SocialMediaAnalyticsEngagementHeatmapItemResponse
{
    public int DayOfWeek { get; init; }
    public int Hour { get; init; }
    public decimal AvgEngagement { get; init; }
}

public sealed class SocialMediaAnalyticsResponse
{
    public int PostsThisMonth { get; init; }
    public decimal AvgEngagementRate { get; init; }
    public int DonationReferrals { get; init; }
    public decimal DonationValueFromSocial { get; init; }
    public string BestPlatform { get; init; } = "instagram";
    public string BestPostType { get; init; } = "story";
    public string BestTimeWindow { get; init; } = "18:00–20:00";
    public IReadOnlyList<SocialMediaAnalyticsPlatformBreakdownItemResponse> PlatformBreakdown { get; init; } = [];
    public IReadOnlyList<SocialMediaAnalyticsEngagementHeatmapItemResponse> EngagementHeatmap { get; init; } = [];
}

public sealed record CreateSocialMediaPostRequest(
    string? Platform,
    string? PostType,
    string? Content,
    string? PostDate,
    string? TimeWindow,
    int? Likes,
    int? Shares,
    int? Comments,
    int? Reach,
    int? DonationReferrals,
    decimal? DonationValueFromPost);

public sealed record UpdateSocialMediaPostRequest(
    string? Platform,
    string? PostType,
    string? Content,
    string? PostDate,
    string? TimeWindow,
    int? Likes,
    int? Shares,
    int? Comments,
    int? Reach,
    int? DonationReferrals,
    decimal? DonationValueFromPost);

public sealed class InKindDonationItemResponse
{
    public int Id { get; init; }
    public int DonationId { get; init; }
    public string ItemDescription { get; init; } = null!;
    public string Category { get; init; } = null!;
    public int Quantity { get; init; }
    public string? Unit { get; init; }
    public decimal? EstimatedValuePerUnit { get; init; }
    public decimal? TotalEstimatedValue { get; init; }
    public string Condition { get; init; } = null!;
    public int? ReceivedBy { get; init; }
    public DateTimeOffset? ReceivedAt { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    [JsonPropertyName("description")]
    public string Description => ItemDescription;

    [JsonPropertyName("estimatedValue")]
    public decimal? EstimatedValue => TotalEstimatedValue;

    [JsonPropertyName("donatedAt")]
    public DateTimeOffset? DonatedAt => ReceivedAt;
}

public sealed record CreateInKindDonationItemRequest(
    int? DonationId,
    string? ItemDescription,
    string? Category,
    int? Quantity,
    string? Unit,
    decimal? EstimatedValuePerUnit,
    decimal? TotalEstimatedValue,
    string? Condition,
    int? ReceivedBy,
    string? ReceivedAt,
    string? Notes);
