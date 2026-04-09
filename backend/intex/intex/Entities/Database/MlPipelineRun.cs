using System.Text.Json;

namespace backend.intex.Entities.Database;

public sealed class MlPipelineRun
{
    public long RunId { get; init; }
    public string PipelineName { get; init; } = string.Empty;
    public string? DisplayName { get; init; }
    public string? ModelName { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTimeOffset TrainedAt { get; init; }
    public string? DataSource { get; init; }
    public string? SourceCommit { get; init; }
    public JsonDocument? MetricsJson { get; init; }
    public JsonDocument? ManifestJson { get; init; }
    public int? ScoredEntityCount { get; init; }
    public JsonDocument? FeatureImportanceJson { get; init; }
}
