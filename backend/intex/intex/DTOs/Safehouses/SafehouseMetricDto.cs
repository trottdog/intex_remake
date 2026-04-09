using System.Text.Json;

namespace backend.intex.DTOs.Safehouses;

public sealed record SafehouseMetricDto(
    long MetricId,
    long Id,
    long? SafehouseId,
    string? Month,
    string? MonthStart,
    string? MonthEnd,
    int? ActiveResidents,
    int? NewAdmissions,
    int? Discharges,
    decimal? AvgEducationProgress,
    decimal? AvgHealthScore,
    int? ProcessRecordingCount,
    int? VisitCount,
    int? HomeVisitationCount,
    int? IncidentCount,
    string? Notes,
    double? CompositeHealthScore,
    int? PeerRank,
    string? HealthBand,
    string? TrendDirection,
    JsonDocument? HealthScoreDrivers,
    JsonDocument? IncidentSeverityDistribution,
    string? HealthScoreComputedAt,
    long? HealthScoreRunId
);
