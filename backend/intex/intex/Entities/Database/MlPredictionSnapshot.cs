using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class MlPredictionSnapshot
{
    public long PredictionId { get; init; }
    public long RunId { get; init; }
    public string PipelineName { get; init; } = string.Empty;
    public string EntityType { get; init; } = string.Empty;
    public long? EntityId { get; init; }
    public string EntityKey { get; init; } = string.Empty;
    public string? EntityLabel { get; init; }
    public long? SafehouseId { get; init; }
    public DateTimeOffset? RecordTimestamp { get; init; }
    public int? PredictionValue { get; init; }
    public double PredictionScore { get; init; }
    public int RankOrder { get; init; }
    public JsonDocument? ContextJson { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string? BandLabel { get; init; }
    public string? ActionCode { get; init; }
}
