using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Npgsql;

var cs = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") ?? Environment.GetEnvironmentVariable("DATABASE_URL");
var builder = new NpgsqlConnectionStringBuilder(cs) { Timeout = 15, CommandTimeout = 15 };
await using var conn = new NpgsqlConnection(builder.ConnectionString);
await conn.OpenAsync();

var queries = new (string Name, string Sql)[]
{
    ("residents_count", "select count(*) from residents"),
    ("latest_published_metrics", "select metric_payload_json from public_impact_snapshots where is_published = true and metric_payload_json is not null order by coalesce(published_at, '0001-01-01'::timestamp) desc, coalesce(snapshot_date, '0001-01-01'::date) desc, snapshot_id desc limit 1"),
    ("reintegration_count", "select count(*) from residents where reintegration_status is not null and reintegration_status ilike 'completed'"),
    ("safehouse_count", "select count(*) from safehouses"),
    ("program_areas_active", "select count(*) from (select distinct program_area from partner_assignments where program_area is not null) t"),
    ("recent_snapshots", "select snapshot_id, headline, summary_text, snapshot_date, published_at, is_published from public_impact_snapshots where is_published = true order by snapshot_id desc limit 5")
};

foreach (var q in queries)
{
    var sw = Stopwatch.StartNew();
    try
    {
        await using var cmd = new NpgsqlCommand(q.Sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();
        var rows = 0;
        while (await reader.ReadAsync()) rows++;
        sw.Stop();
        Console.WriteLine($"{q.Name}: ok rows={rows} ms={sw.ElapsedMilliseconds}");
    }
    catch (Exception ex)
    {
        sw.Stop();
        Console.WriteLine($"{q.Name}: FAIL ms={sw.ElapsedMilliseconds} {ex.GetType().Name}: {ex.Message}");
    }
}
