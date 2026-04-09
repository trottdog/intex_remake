namespace backend.intex.Entities.Database;

public sealed class ProcessRecording
{
    public long RecordingId { get; init; }
    public long? ResidentId { get; init; }
    public DateOnly? SessionDate { get; init; }
    public string? SocialWorker { get; init; }
    public string? SessionType { get; init; }
    public int? SessionDurationMinutes { get; init; }
    public string? EmotionalStateObserved { get; init; }
    public string? EmotionalStateEnd { get; init; }
    public string? SessionNarrative { get; init; }
    public string? InterventionsApplied { get; init; }
    public string? FollowUpActions { get; init; }
    public bool? ProgressNoted { get; init; }
    public bool? ConcernsFlagged { get; init; }
    public bool? ReferralMade { get; init; }
    public string? NotesRestricted { get; init; }
}
