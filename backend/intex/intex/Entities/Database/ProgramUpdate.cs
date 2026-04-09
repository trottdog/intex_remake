namespace backend.intex.Entities.Database;

public sealed class ProgramUpdate
{
    public long UpdateId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Summary { get; init; }
    public string? Category { get; init; }
    public bool? IsPublished { get; init; }
    public DateTime? PublishedAt { get; init; }
    public long? CreatedBy { get; init; }
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
