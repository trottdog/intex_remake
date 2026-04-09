namespace backend.intex.Entities.Database;

public sealed class Partner
{
    public long PartnerId { get; init; }
    public string? PartnerName { get; init; }
    public string? PartnerType { get; init; }
    public string? RoleType { get; init; }
    public string? ContactName { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Region { get; init; }
    public string? Status { get; init; }
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public string? Notes { get; init; }
}
