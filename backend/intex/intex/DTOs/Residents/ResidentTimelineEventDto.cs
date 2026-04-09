namespace backend.intex.DTOs.Residents;

public sealed record ResidentTimelineEventDto(
    string Id,
    string EventType,
    string? EventDate,
    string Title,
    string? Description,
    string? Severity
);
