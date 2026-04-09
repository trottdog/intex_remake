using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class SafehouseMonthlyMetric
{
    public long MetricId { get; init; }
    public long? SafehouseId { get; init; }
    public DateOnly? MonthStart { get; init; }
    public DateOnly? MonthEnd { get; init; }
    public int? ActiveResidents { get; init; }
    public decimal? AvgEducationProgress { get; init; }
    public decimal? AvgHealthScore { get; init; }
    public int? ProcessRecordingCount { get; init; }
    public int? HomeVisitationCount { get; init; }
    public int? IncidentCount { get; init; }
    public string? Notes { get; init; }
    public double? CompositeHealthScore { get; init; }
    public int? PeerRank { get; init; }
    public string? HealthBand { get; init; }
    public string? TrendDirection { get; init; }
    public JsonDocument? HealthScoreDrivers { get; init; }
    public JsonDocument? IncidentSeverityDistribution { get; init; }
    public DateTimeOffset? HealthScoreComputedAt { get; init; }
    public long? HealthScoreRunId { get; init; }
}
