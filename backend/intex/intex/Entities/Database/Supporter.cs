using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class Supporter
{
    public long SupporterId { get; init; }
    public string? SupporterType { get; init; }
    public string? DisplayName { get; init; }
    public string? OrganizationName { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? RelationshipType { get; init; }
    public string? Region { get; init; }
    public string? Country { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Status { get; init; }
    public string? CreatedAt { get; init; }
    public DateOnly? FirstDonationDate { get; init; }
    public string? AcquisitionChannel { get; init; }
    public string? IdentityUserId { get; init; }
    public bool CanLogin { get; init; }
    public bool RecurringEnabled { get; init; }
    public double? ChurnRiskScore { get; init; }
    public string? ChurnBand { get; init; }
    public JsonDocument? ChurnTopDrivers { get; init; }
    public string? ChurnRecommendedAction { get; init; }
    public DateTimeOffset? ChurnScoreUpdatedAt { get; init; }
    public double? UpgradeLikelihoodScore { get; init; }
    public string? UpgradeBand { get; init; }
    public JsonDocument? UpgradeTopDrivers { get; init; }
    public string? UpgradeRecommendedAskBand { get; init; }
    public DateTimeOffset? UpgradeScoreUpdatedAt { get; init; }
}
