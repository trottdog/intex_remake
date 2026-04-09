using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class PublicImpactSnapshot
{
    public long SnapshotId { get; init; }
    public DateOnly? SnapshotDate { get; init; }
    public string? Headline { get; init; }
    public string? SummaryText { get; init; }
    public JsonDocument? MetricPayloadJson { get; init; }
    public bool? IsPublished { get; init; }
    public DateTime? PublishedAt { get; init; }
    public decimal? ProjectedGapPhp30d { get; init; }
    public string? FundingGapBand { get; init; }
    public DateTimeOffset? FundingGapUpdatedAt { get; init; }
}
