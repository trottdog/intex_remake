namespace backend.intex.Entities.Common;

public abstract class AuditableEntity
{
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}
