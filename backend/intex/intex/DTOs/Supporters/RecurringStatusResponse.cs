using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Supporters;

public sealed record RecurringStatusResponse(
    bool RecurringEnabled,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? Message = null
);
