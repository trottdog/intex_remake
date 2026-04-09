using Npgsql;

namespace backend.intex.Infrastructure.Data;

public sealed class PostgresConnectionFactory(NpgsqlDataSource dataSource) : IPostgresConnectionFactory
{
    public ValueTask<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default) =>
        dataSource.OpenConnectionAsync(cancellationToken);
}
