namespace backend.intex.Entities.Database;

public sealed class Campaign
{
    public long CampaignId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? Category { get; init; }
    public decimal? Goal { get; init; }
    public DateOnly? Deadline { get; init; }
    public string? Status { get; init; }
    public long? CreatedBy { get; init; }
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}
