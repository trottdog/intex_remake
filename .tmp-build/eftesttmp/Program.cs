using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.EntityFrameworkCore;

var conn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
var options = new DbContextOptionsBuilder<BeaconDbContext>()
    .UseNpgsql(conn, npgsql =>
    {
        npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SingleQuery);
        npgsql.CommandTimeout(15);
        npgsql.EnableRetryOnFailure(2, TimeSpan.FromSeconds(3), null);
    })
    .Options;

await using var db = new BeaconDbContext(options);
await db.Database.OpenConnectionAsync();
Console.WriteLine("opened");

async Task Time(string name, Func<Task> work)
{
    var sw = Stopwatch.StartNew();
    try
    {
        await work();
        Console.WriteLine($"{name}: ok ms={sw.ElapsedMilliseconds}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"{name}: FAIL ms={sw.ElapsedMilliseconds} {ex.GetType().Name}: {ex.Message}");
    }
}

await Time("residentsServedTotal", async () => { Console.WriteLine(await db.Residents.AsNoTracking().CountAsync()); });
await Time("latestPublishedMetrics", async () => {
    var x = await db.PublicImpactSnapshots.AsNoTracking().Where(item => item.IsPublished == true && item.MetricPayloadJson != null).OrderByDescending(item => item.PublishedAt ?? DateTime.MinValue).ThenByDescending(item => item.SnapshotDate ?? DateOnly.MinValue).ThenByDescending(item => item.SnapshotId).Select(item => item.MetricPayloadJson).FirstOrDefaultAsync();
    Console.WriteLine(x is null ? "null" : x.RootElement.ToString());
});
await Time("reintegrationCount", async () => { Console.WriteLine(await db.Residents.AsNoTracking().CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "completed"))); });
await Time("safehouseCount", async () => { Console.WriteLine(await db.Safehouses.AsNoTracking().CountAsync()); });
await Time("programAreasActive", async () => { Console.WriteLine(await db.PartnerAssignments.AsNoTracking().Where(item => item.ProgramArea != null).Select(item => item.ProgramArea!).Distinct().CountAsync()); });
await Time("recentSnapshots", async () => { Console.WriteLine((await db.PublicImpactSnapshots.AsNoTracking().Where(item => item.IsPublished == true).OrderByDescending(item => item.SnapshotId).Take(5).Select(item => new { item.SnapshotId }).ToListAsync()).Count); });
