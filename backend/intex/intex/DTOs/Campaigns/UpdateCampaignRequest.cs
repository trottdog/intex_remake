using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Campaigns;

public sealed class UpdateCampaignRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
