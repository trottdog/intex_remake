using System.Text.Json;
using System.Text.Json.Serialization;

namespace Intex.Infrastructure.Public.Contracts;

public sealed record PublicImpactMilestoneResponse(
    string Title,
    string Value,
    string Description);

public sealed class ImpactSnapshotResponse
{
    public int Id { get; init; }
    public string Title { get; init; } = null!;
    public string Period { get; init; } = null!;
    public string? Summary { get; init; }
    public string? Content { get; init; }
    public int ResidentsServed { get; init; }
    public decimal TotalDonationsAmount { get; init; }
    public JsonDocument? ProgramOutcomes { get; init; }
    public int SafehousesCovered { get; init; }
    public int ReintegrationCount { get; init; }
    public bool IsPublished { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }

    [JsonPropertyName("safehousetsCovered")]
    public int SafehousetsCovered => SafehousesCovered;
}

public sealed class PublicImpactSummaryResponse
{
    public int ResidentsServedTotal { get; init; }
    public decimal TotalDonationsRaised { get; init; }
    public int ReintegrationCount { get; init; }
    public int SafehouseCount { get; init; }
    public int ProgramAreasActive { get; init; }
    public IReadOnlyCollection<ImpactSnapshotResponse> RecentSnapshots { get; init; } = [];
    public IReadOnlyCollection<PublicImpactMilestoneResponse> Milestones { get; init; } = [];

    // Compatibility aliases still referenced by the current handwritten frontend.
    public int TotalResidentsServed { get; init; }
    public decimal TotalFundsRaised { get; init; }
    public int ActiveResidents { get; init; }
    public int DonorsCount { get; init; }
}
