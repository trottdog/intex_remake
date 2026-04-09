namespace backend.intex.Entities.Database;

public sealed class HomeVisitation
{
    public long VisitationId { get; init; }
    public long? ResidentId { get; init; }
    public DateOnly? VisitDate { get; init; }
    public string? SocialWorker { get; init; }
    public string? VisitType { get; init; }
    public string? LocationVisited { get; init; }
    public string? FamilyMembersPresent { get; init; }
    public string? Purpose { get; init; }
    public string? Observations { get; init; }
    public string? FamilyCooperationLevel { get; init; }
    public bool? SafetyConcernsNoted { get; init; }
    public bool? FollowUpNeeded { get; init; }
    public string? FollowUpNotes { get; init; }
    public string? VisitOutcome { get; init; }
}
