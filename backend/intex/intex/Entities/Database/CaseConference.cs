namespace backend.intex.Entities.Database;

public sealed class CaseConference
{
    public long ConferenceId { get; init; }
    public long ResidentId { get; init; }
    public DateOnly ConferenceDate { get; init; }
    public string? ConferenceType { get; init; }
    public string? Summary { get; init; }
    public string? DecisionsMade { get; init; }
    public string? NextSteps { get; init; }
    public DateOnly? NextConferenceDate { get; init; }
    public string? CreatedBy { get; init; }
}
