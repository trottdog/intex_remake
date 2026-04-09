using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Residents;

public sealed class CreateResidentRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
