using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Donations;

public sealed class UpdateDonationRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
