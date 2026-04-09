using Intex.Infrastructure.Api.Contracts;

namespace Intex.Infrastructure.Api.Pagination;

public static class PaginationEnvelopeFactory
{
    public static PaginatedListEnvelope<T> Create<T>(
        IReadOnlyCollection<T> data,
        int total,
        PaginationRequest pagination)
    {
        var totalPages = pagination.Limit <= 0
            ? 0
            : (int)Math.Ceiling(total / (double)pagination.Limit);

        return new PaginatedListEnvelope<T>(
            data,
            total,
            new PaginationMetadata(
                total,
                pagination.Page,
                pagination.Limit,
                totalPages));
    }
}
