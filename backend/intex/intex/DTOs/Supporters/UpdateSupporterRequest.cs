using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Supporters;

public sealed class UpdateSupporterRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
