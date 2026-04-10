using System;
using System.Threading.Tasks;
using Npgsql;

var cs = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") ?? Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrWhiteSpace(cs))
{
    Console.WriteLine("NO_CONNECTION_STRING");
    return;
}

var builder = new NpgsqlConnectionStringBuilder(cs)
{
    Timeout = 15,
    CommandTimeout = 15
};

await using var conn = new NpgsqlConnection(builder.ConnectionString);
await conn.OpenAsync();
await using var cmd = new NpgsqlCommand("select 1", conn);
var result = await cmd.ExecuteScalarAsync();
Console.WriteLine($"OK:{result}");
