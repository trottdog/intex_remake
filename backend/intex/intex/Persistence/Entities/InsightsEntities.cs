using System.Text.Json;

namespace Intex.Persistence.Entities;

public sealed class SocialMediaPost
{
    public int Id { get; set; }
    public string Platform { get; set; } = null!;
    public string PostType { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string PostDate { get; set; } = null!;
    public string? TimeWindow { get; set; }
    public int Likes { get; set; }
    public int Shares { get; set; }
    public int Comments { get; set; }
    public int Reach { get; set; }
    public decimal EngagementRate { get; set; }
    public int DonationReferrals { get; set; }
    public decimal DonationValueFromPost { get; set; }
    public decimal? PredictedConversionScore { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class SafehouseMonthlyMetric
{
    public int Id { get; set; }
    public int SafehouseId { get; set; }
    public string Month { get; set; } = null!;
    public int ActiveResidents { get; set; }
    public int NewAdmissions { get; set; }
    public int Discharges { get; set; }
    public int IncidentCount { get; set; }
    public int ProcessRecordingCount { get; set; }
    public int VisitCount { get; set; }
    public decimal? AvgHealthScore { get; set; }
    public decimal? AvgEducationProgress { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Safehouse Safehouse { get; set; } = null!;
}

public sealed class ImpactSnapshot
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Period { get; set; } = null!;
    public bool IsPublished { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public int ResidentsServed { get; set; }
    public decimal TotalDonationsAmount { get; set; }
    public JsonDocument? ProgramOutcomes { get; set; }
    public int SafehousesCovered { get; set; }
    public int ReintegrationCount { get; set; }
    public string? Summary { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class MlPipelineRun
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string ModelVersion { get; set; } = null!;
    public string LastRetrained { get; set; } = null!;
    public int PredictionCount { get; set; }
    public decimal AvgConfidence { get; set; }
    public int DriftFlags { get; set; }
    public decimal OverrideRate { get; set; }
    public string HealthStatus { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class MlPredictionSnapshot
{
    public int Id { get; set; }
    public string Pipeline { get; set; } = null!;
    public string EntityType { get; set; } = null!;
    public int EntityId { get; set; }
    public decimal PredictionValue { get; set; }
    public decimal ConfidenceScore { get; set; }
    public string? RiskBand { get; set; }
    public JsonDocument TopFeatures { get; set; } = null!;
    public string? RecommendedAction { get; set; }
    public string ModelVersion { get; set; } = null!;
    public DateTimeOffset PredictedAt { get; set; }
}

public sealed class ReportDonationTrend
{
    public int Id { get; set; }
    public string Period { get; set; } = null!;
    public decimal TotalAmount { get; set; }
    public int DonorCount { get; set; }
    public int NewDonors { get; set; }
    public decimal RecurringRevenue { get; set; }
    public decimal AvgGiftSize { get; set; }
    public decimal RetentionRate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class ReportAccomplishment
{
    public int Id { get; set; }
    public int Year { get; set; }
    public string ServiceArea { get; set; } = null!;
    public string Category { get; set; } = null!;
    public int BeneficiaryCount { get; set; }
    public int SessionsDelivered { get; set; }
    public string OutcomeSummary { get; set; } = null!;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class ReportReintegrationStat
{
    public int Id { get; set; }
    public string Period { get; set; } = null!;
    public int? SafehouseId { get; set; }
    public string? SafehouseName { get; set; }
    public int TotalResidents { get; set; }
    public int ReintegrationCompleted { get; set; }
    public decimal AvgDaysToReintegration { get; set; }
    public decimal SuccessRate { get; set; }
    public decimal? AvgHealthScoreAtDischarge { get; set; }
    public decimal? AvgEducationProgressAtDischarge { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Safehouse? Safehouse { get; set; }
}

public sealed class AuditLog
{
    public int Id { get; set; }
    public int ActorId { get; set; }
    public string ActorName { get; set; } = null!;
    public string ActorRole { get; set; } = null!;
    public string Action { get; set; } = null!;
    public string EntityType { get; set; } = null!;
    public int? EntityId { get; set; }
    public string? EntityDescription { get; set; }
    public JsonDocument? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
