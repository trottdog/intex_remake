using System.Text.Json;
using System.Text.Json.Serialization;
using Intex.Infrastructure.ExtendedAdmin.Contracts;

namespace Intex.Infrastructure.SuperAdmin.Contracts;

public sealed class UserResponse
{
    public int Id { get; init; }
    public string Username { get; init; } = null!;
    public string Email { get; init; } = null!;
    public string FirstName { get; init; } = null!;
    public string LastName { get; init; } = null!;
    public string Role { get; init; } = null!;
    public bool IsActive { get; init; }
    public bool MfaEnabled { get; init; }
    public DateTimeOffset? LastLogin { get; init; }
    public int? SupporterId { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public IReadOnlyList<int> AssignedSafehouses { get; init; } = [];
}

public sealed record CreateUserRequest(
    string? Username,
    string? Email,
    string? FirstName,
    string? LastName,
    string? Password,
    string? Role,
    bool? MfaEnabled,
    int? SupporterId,
    int[]? AssignedSafehouses);

public sealed record UpdateUserRequest(
    string? Email,
    string? FirstName,
    string? LastName,
    string? Role,
    bool? IsActive,
    bool? MfaEnabled,
    int? SupporterId,
    int[]? AssignedSafehouses);

public sealed class AuditLogResponse
{
    public int Id { get; init; }
    public int ActorId { get; init; }
    public string ActorName { get; init; } = null!;
    public string ActorRole { get; init; } = null!;
    public string Action { get; init; } = null!;
    public string EntityType { get; init; } = null!;
    public int? EntityId { get; init; }
    public string? EntityDescription { get; init; }
    public JsonDocument? Details { get; init; }
    public DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("userId")]
    public int UserId => ActorId;

    [JsonPropertyName("resource")]
    public string Resource => EntityType;

    [JsonPropertyName("resourceId")]
    public string? ResourceId => EntityId?.ToString();
}

public sealed class MlPipelineResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = null!;
    public string Description { get; init; } = null!;
    public string Status { get; init; } = null!;
    public string ModelVersion { get; init; } = null!;
    public string LastRetrained { get; init; } = null!;
    public int PredictionCount { get; init; }
    public decimal AvgConfidence { get; init; }
    public int DriftFlags { get; init; }
    public decimal OverrideRate { get; init; }
    public string HealthStatus { get; init; } = null!;
    public DateTimeOffset? LastRunAt { get; init; }
    public IReadOnlyList<Dictionary<string, object?>> PerformanceTrend { get; init; } = [];
}

public sealed class MlPredictionResponse
{
    public int Id { get; init; }
    public string Pipeline { get; init; } = null!;
    public string EntityType { get; init; } = null!;
    public int EntityId { get; init; }
    public decimal PredictionValue { get; init; }
    public decimal ConfidenceScore { get; init; }
    public string? RiskBand { get; init; }
    public IReadOnlyList<Dictionary<string, object?>> TopFeatures { get; init; } = [];
    public string? RecommendedAction { get; init; }
    public string ModelVersion { get; init; } = null!;
    public DateTimeOffset PredictedAt { get; init; }
}

public sealed class ExecutiveDashboardSummaryResponse
{
    public int TotalDonors { get; init; }
    public int TotalActiveResidents { get; init; }
    public int TotalSafehouses { get; init; }
    public decimal DonationsYtd { get; init; }
    public decimal OrgRetentionEstimate { get; init; }
    public decimal ReintegrationSuccessRate { get; init; }
    public decimal AvgHealthScore { get; init; }
    public decimal AvgEducationProgress { get; init; }
    public decimal IncidentRate { get; init; }
    public decimal SocialDrivenDonations { get; init; }
    public IReadOnlyList<ExecutiveSafehouseComparisonItemResponse> SafehouseComparison { get; init; } = [];
    public IReadOnlyList<ExecutiveDonationTrendItemResponse> DonationTrend { get; init; } = [];

    // Compatibility aliases still used by the handwritten super-admin dashboard.
    public int TotalResidents => TotalActiveResidents;
    public int ActiveSafehouses => TotalSafehouses;
    public decimal TotalFundsRaised => DonationsYtd;
}

public sealed class ExecutiveSafehouseComparisonItemResponse
{
    public string SafehouseName { get; init; } = null!;
    public int Residents { get; init; }
    public decimal Donations { get; init; }
    public decimal HealthScore { get; init; }
    public int IncidentCount { get; init; }
}

public sealed class ExecutiveDonationTrendItemResponse
{
    public string Month { get; init; } = null!;
    public decimal Amount { get; init; }
    public int Count { get; init; }
    public decimal AvgAmount { get; init; }

    [JsonPropertyName("totalAmount")]
    public decimal TotalAmount => Amount;

    [JsonPropertyName("donationCount")]
    public int DonationCount => Count;
}

public sealed record CreateImpactSnapshotRequest(
    string? Title,
    string? Period,
    int? ResidentsServed,
    decimal? TotalDonationsAmount,
    JsonDocument? ProgramOutcomes,
    int? SafehousesCovered,
    int? ReintegrationCount,
    string? Summary,
    bool? IsPublished,
    string? PeriodLabel,
    int? Year,
    int? Quarter,
    int? NewSupporters,
    string? Highlights);

public sealed record UpdateImpactSnapshotRequest(
    string? Title,
    string? Period,
    int? ResidentsServed,
    decimal? TotalDonationsAmount,
    JsonDocument? ProgramOutcomes,
    int? SafehousesCovered,
    int? ReintegrationCount,
    string? Summary,
    bool? IsPublished,
    string? PeriodLabel,
    int? Year,
    int? Quarter,
    int? NewSupporters,
    string? Highlights);

public sealed class ImpactSnapshotAdminResponse
{
    public int Id { get; init; }
    public string Title { get; init; } = null!;
    public string Period { get; init; } = null!;
    public bool IsPublished { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
    public int ResidentsServed { get; init; }
    public decimal TotalDonationsAmount { get; init; }
    public JsonDocument? ProgramOutcomes { get; init; }
    public int SafehousesCovered { get; init; }
    public int ReintegrationCount { get; init; }
    public string? Summary { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }

    [JsonPropertyName("safehousetsCovered")]
    public int SafehousetsCovered => SafehousesCovered;

    [JsonPropertyName("periodLabel")]
    public string PeriodLabel => Period;

    [JsonPropertyName("year")]
    public int Year => ImpactSnapshotLegacyAliasParser.GetYear(Period);

    [JsonPropertyName("quarter")]
    public int? Quarter => ImpactSnapshotLegacyAliasParser.GetQuarter(Period);

    [JsonPropertyName("newSupporters")]
    public int NewSupporters => ImpactSnapshotLegacyAliasParser.GetNewSupporters(ProgramOutcomes);

    [JsonPropertyName("highlights")]
    public string? Highlights => Summary;
}

internal static class ImpactSnapshotLegacyAliasParser
{
    public static int GetYear(string period)
    {
        var match = System.Text.RegularExpressions.Regex.Match(period, @"(20\d{2})");
        return match.Success && int.TryParse(match.Value, out var parsedYear)
            ? parsedYear
            : 0;
    }

    public static int? GetQuarter(string period)
    {
        var match = System.Text.RegularExpressions.Regex.Match(period, @"Q([1-4])", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return match.Success && int.TryParse(match.Groups[1].Value, out var parsedQuarter)
            ? parsedQuarter
            : null;
    }

    public static int GetNewSupporters(JsonDocument? programOutcomes)
    {
        if (programOutcomes?.RootElement.ValueKind != JsonValueKind.Object)
        {
            return 0;
        }

        if (!programOutcomes.RootElement.TryGetProperty("newSupporters", out var newSupporters))
        {
            return 0;
        }

        return newSupporters.ValueKind switch
        {
            JsonValueKind.Number when newSupporters.TryGetInt32(out var parsedNumber) => parsedNumber,
            JsonValueKind.String when int.TryParse(newSupporters.GetString(), out var parsedString) => parsedString,
            _ => 0
        };
    }
}
