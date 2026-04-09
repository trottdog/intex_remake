using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Safehouses;

public sealed class UpdateSafehouseRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
