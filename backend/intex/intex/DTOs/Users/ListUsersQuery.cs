namespace backend.intex.DTOs.Users;

public sealed record ListUsersQuery(
    int Page = 1,
    int? PageSize = null,
    int? Limit = null,
    string? Role = null
);
