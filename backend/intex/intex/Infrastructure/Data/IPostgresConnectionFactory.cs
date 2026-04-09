using Npgsql;

namespace backend.intex.Infrastructure.Data;

public interface IPostgresConnectionFactory
{
    ValueTask<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default);
}
