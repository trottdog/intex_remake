namespace backend.intex.DTOs.Supporters;

public sealed record RecurringStatusResponse(
    bool RecurringEnabled,
    string? Message = null
);
