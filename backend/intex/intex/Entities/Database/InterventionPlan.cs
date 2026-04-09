using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class InterventionPlan
{
    public long PlanId { get; init; }
    public long? ResidentId { get; init; }
    public string? PlanCategory { get; init; }
    public string? PlanDescription { get; init; }
    public string? ServicesProvided { get; init; }
    public decimal? TargetValue { get; init; }
    public DateOnly? TargetDate { get; init; }
    public string? Status { get; init; }
    public DateOnly? CaseConferenceDate { get; init; }
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public double? EffectivenessOutcomeScore { get; init; }
    public string? EffectivenessBand { get; init; }
    public JsonDocument? EffectivenessOutcomeDrivers { get; init; }
    public DateTimeOffset? EffectivenessScoreUpdatedAt { get; init; }
}
