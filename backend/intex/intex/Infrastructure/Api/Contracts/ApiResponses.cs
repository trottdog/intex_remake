namespace Intex.Infrastructure.Api.Contracts;

public sealed record PaginationMetadata(
    int Total,
    int Page,
    int Limit,
    int TotalPages);

public sealed record PaginatedListEnvelope<T>(
    IReadOnlyCollection<T> Data,
    int Total,
    PaginationMetadata Pagination);

public sealed record ErrorResponse(string Error);

public sealed record MessageResponse(string Message);
