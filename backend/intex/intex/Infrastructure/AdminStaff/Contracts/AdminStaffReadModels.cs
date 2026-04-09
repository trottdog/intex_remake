using Intex.Infrastructure.Api.Contracts;

namespace Intex.Infrastructure.AdminStaff.Contracts;

public sealed class AdminDashboardTrendPointResponse
{
    public string Month { get; init; } = null!;
    public decimal Amount { get; init; }
    public int Count { get; init; }
}

public sealed class ResidentsByRiskItemResponse
{
    public string Safehouse { get; init; } = null!;
    public int Low { get; init; }
    public int Medium { get; init; }
    public int High { get; init; }
    public int Critical { get; init; }
}

public sealed class AdminDashboardPriorityAlertResponse
{
    public string Type { get; init; } = null!;
    public string Message { get; init; } = null!;
    public string Severity { get; init; } = null!;
    public int? EntityId { get; init; }
    public int? ResidentId { get; init; }
}

public sealed class AdminDashboardMlAlertResponse
{
    public int Id { get; init; }
    public int? ResidentId { get; init; }
    public decimal? RiskScore { get; init; }
    public string? RiskLabel { get; init; }
    public string? RiskBand { get; init; }
    public string? Pipeline { get; init; }
    public string? EntityType { get; init; }
    public int? EntityId { get; init; }
    public decimal? PredictionValue { get; init; }
    public decimal? ConfidenceScore { get; init; }
    public string? RecommendedAction { get; init; }
}

public sealed class AdminDashboardSummaryResponse
{
    public int TotalResidents { get; init; }
    public int ActiveResidents { get; init; }
    public int HighRiskResidents { get; init; }
    public int AdmissionsThisMonth { get; init; }
    public int IncidentsThisWeek { get; init; }
    public int UpcomingCaseConferences { get; init; }
    public int OverdueFollowUps { get; init; }
    public decimal DonationTotalThisMonth { get; init; }
    public int SocialReferralsThisMonth { get; init; }
    public IReadOnlyCollection<AdminDashboardTrendPointResponse> DonationTrend { get; init; } = [];
    public IReadOnlyCollection<ResidentsByRiskItemResponse> ResidentsByRisk { get; init; } = [];
    public IReadOnlyCollection<AdminDashboardPriorityAlertResponse> PriorityAlerts { get; init; } = [];
    public IReadOnlyCollection<AdminDashboardMlAlertResponse> MlAlerts { get; init; } = [];

    public int OpenIncidents { get; init; }
    public int UpcomingConferences { get; init; }
}

public sealed class ResidentListItemResponse
{
    public int Id { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string ResidentCode { get; init; } = null!;
    public int? SafehouseId { get; init; }
    public string? IntakeDate { get; init; }
    public string? AdmissionDate { get; init; }
    public string? Status { get; init; }
    public string? CaseStatus { get; init; }
    public string? RiskLevel { get; init; }
    public string? AgeGroup { get; init; }
    public string? CaseType { get; init; }
    public string? Notes { get; init; }
    public int? AssignedWorkerId { get; init; }
    public int? AssignedStaffId { get; init; }
    public string? ExitDate { get; init; }
    public string? ReintegrationStatus { get; init; }
    public string? DischargeDate { get; init; }
    public string? CaseCategory { get; init; }
    public string SafehouseName { get; init; } = string.Empty;
    public string? AssignedStaffName { get; init; }
    public string? AssignedWorkerName { get; init; }
    public DateTimeOffset? LastUpdated { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed class RiskDistributionItemResponse
{
    public string Level { get; init; } = null!;
    public int Count { get; init; }
}

public sealed class StatusDistributionItemResponse
{
    public string Status { get; init; } = null!;
    public int Count { get; init; }
}

public sealed class ResidentStatsResponse
{
    public int TotalActive { get; init; }
    public int NewAdmissions { get; init; }
    public int CasesNeedingUpdate { get; init; }
    public int HighRiskResidents { get; init; }
    public IReadOnlyCollection<RiskDistributionItemResponse> RiskDistribution { get; init; } = [];
    public IReadOnlyCollection<StatusDistributionItemResponse> StatusDistribution { get; init; } = [];

    public int Total { get; init; }
    public int Active { get; init; }
    public IReadOnlyDictionary<string, int> ByRisk { get; init; } = new Dictionary<string, int>();
    public IReadOnlyDictionary<string, int> ByCaseType { get; init; } = new Dictionary<string, int>();
}

public sealed class ResidentTimelineEventResponse
{
    public string Id { get; init; } = null!;
    public string EventType { get; init; } = null!;
    public string? EventDate { get; init; }
    public string Title { get; init; } = null!;
    public string? Description { get; init; }
    public string? Actor { get; init; }
    public string? Severity { get; init; }
}

public sealed class SupportTypeMixItemResponse
{
    public string Type { get; init; } = null!;
    public int Count { get; init; }
    public decimal Percentage { get; init; }
}

public sealed class AcquisitionChannelItemResponse
{
    public string Channel { get; init; } = null!;
    public int Count { get; init; }
}

public sealed class SupporterListItemResponse
{
    public int Id { get; init; }
    public string FirstName { get; init; } = null!;
    public string LastName { get; init; } = null!;
    public string Email { get; init; } = null!;
    public string? Phone { get; init; }
    public string? Organization { get; init; }
    public string? SupportType { get; init; }
    public string? Segment { get; init; }
    public decimal? LifetimeGiving { get; init; }
    public string? LastGiftDate { get; init; }
    public decimal? ChurnRiskScore { get; init; }
    public bool? IsRecurring { get; init; }
}

public sealed class SupporterStatsResponse
{
    public int TotalSupporters { get; init; }
    public int ActiveSupporters { get; init; }
    public decimal RaisedThisMonth { get; init; }
    public int RecurringDonors { get; init; }
    public decimal AvgGiftSize { get; init; }
    public int NewSupporters { get; init; }
    public decimal InKindEstimatedValue { get; init; }
    public decimal RetentionEstimate { get; init; }
    public IReadOnlyCollection<AcquisitionChannelItemResponse> AcquisitionByChannel { get; init; } = [];
    public IReadOnlyCollection<SupportTypeMixItemResponse> SupportTypeMix { get; init; } = [];

    public int Total { get; init; }
    public IReadOnlyCollection<SupportTypeMixItemResponse> ByType { get; init; } = [];
}

public sealed class DonationListItemResponse
{
    public int Id { get; init; }
    public int SupporterId { get; init; }
    public decimal? Amount { get; init; }
    public string Currency { get; init; } = null!;
    public string DonationDate { get; init; } = null!;
    public string? Category { get; init; }
    public string? DonationType { get; init; }
    public string? Campaign { get; init; }
    public string? Status { get; init; }
    public string? SafehouseName { get; init; }
    public int? SafehouseId { get; init; }
    public string? ReceiptUrl { get; init; }
    public string? Notes { get; init; }
    public bool IsAnonymous { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}

public sealed class DonationTrendPointResponse
{
    public string Month { get; init; } = null!;
    public string Period { get; init; } = null!;
    public decimal Total { get; init; }
    public decimal TotalAmount { get; init; }
    public int Count { get; init; }
    public int DonationCount { get; init; }
    public decimal AvgAmount { get; init; }
}

public sealed record DonationTrendListResponse(
    IReadOnlyCollection<DonationTrendPointResponse> Data);
