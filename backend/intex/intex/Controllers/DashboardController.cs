using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Route("dashboard")]
public sealed class DashboardController(IDbContextFactory<BeaconDbContext> dbFactory, IUserScopeService userScopeService) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpGet("public-impact")]
    public async Task<IActionResult> GetPublicImpact(CancellationToken cancellationToken)
    {
        var residentsTask = RunAsync(db => db.Residents.AsNoTracking().CountAsync(cancellationToken));
        var donationsTask = RunAsync(db => db.Donations.AsNoTracking().SumAsync(item => (decimal?)item.Amount, cancellationToken));
        var reintegrationTask = RunAsync(db => db.Residents.AsNoTracking()
            .CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "completed"), cancellationToken));
        var safehouseTask = RunAsync(db => db.Safehouses.AsNoTracking().CountAsync(cancellationToken));
        var programAreasTask = RunAsync(db => db.PartnerAssignments.AsNoTracking()
            .Where(item => item.ProgramArea != null)
            .Select(item => item.ProgramArea!)
            .Distinct()
            .CountAsync(cancellationToken));
        var snapshotsTask = RunAsync(db => db.PublicImpactSnapshots.AsNoTracking()
            .Where(item => item.IsPublished == true)
            .OrderByDescending(item => item.SnapshotId)
            .Take(5)
            .Select(item => new
            {
                item.SnapshotId,
                Id = item.SnapshotId,
                item.Headline,
                Title = item.Headline,
                item.SummaryText,
                Summary = item.SummaryText,
                SnapshotDate = item.SnapshotDate.HasValue ? item.SnapshotDate.Value.ToString("yyyy-MM-dd") : null,
                PublishedAt = item.PublishedAt,
                item.IsPublished
            })
            .ToListAsync(cancellationToken));

        await Task.WhenAll(residentsTask, donationsTask, reintegrationTask, safehouseTask, programAreasTask, snapshotsTask);

        return Ok(new
        {
            residentsServedTotal = residentsTask.Result,
            totalDonationsRaised = decimal.Round(donationsTask.Result ?? 0m, 2),
            reintegrationCount = reintegrationTask.Result,
            safehouseCount = safehouseTask.Result,
            programAreasActive = programAreasTask.Result,
            recentSnapshots = snapshotsTask.Result
        });
    }

    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpGet("donor-summary")]
    public async Task<IActionResult> GetDonorSummary(CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return Ok(new { });
        }

        var sid = supporterId.Value;
        var lifetimeTask = RunAsync(db => db.Donations.AsNoTracking().Where(d => d.SupporterId == sid).SumAsync(d => (decimal?)d.Amount, cancellationToken));
        var countTask = RunAsync(db => db.Donations.AsNoTracking().Where(d => d.SupporterId == sid).CountAsync(cancellationToken));
        var lastTask = RunAsync(db => db.Donations.AsNoTracking().Where(d => d.SupporterId == sid).OrderByDescending(d => d.DonationDate).FirstOrDefaultAsync(cancellationToken));
        var trendTask = RunAsync(db => db.Donations.AsNoTracking().Where(d => d.SupporterId == sid)
            .Where(d => d.DonationDate.HasValue)
            .Select(d => new { d.DonationDate, d.Amount })
            .ToListAsync(cancellationToken));

        await Task.WhenAll(lifetimeTask, countTask, lastTask, trendTask);

        var lifetimeGiving = lifetimeTask.Result ?? 0m;
        var lastDonation = lastTask.Result;
        var givingTrend = trendTask.Result
            .GroupBy(item => new { item.DonationDate!.Value.Year, item.DonationDate!.Value.Month })
            .OrderBy(group => group.Key.Year).ThenBy(group => group.Key.Month)
            .Select(group => new
            {
                month = $"{group.Key.Year:D4}-{group.Key.Month:D2}",
                year = group.Key.Year,
                amount = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2)
            })
            .ToList();

        return Ok(new
        {
            lifetimeGiving = decimal.Round(lifetimeGiving, 2),
            donationCount = countTask.Result,
            lastDonationDate = lastDonation?.DonationDate.HasValue == true ? lastDonation.DonationDate!.Value.ToString("yyyy-MM-dd") : null,
            lastDonationAmount = lastDonation != null && lastDonation.Amount.HasValue ? (decimal?)decimal.Round(lastDonation.Amount.Value, 2) : null,
            givingTrend
        });
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet("admin-summary")]
    public async Task<IActionResult> GetAdminSummary(CancellationToken cancellationToken)
    {
        var assignedSafehouses = await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken);
        var enforceScope = User.GetRole() is BeaconRoles.Staff or BeaconRoles.Admin;
        var scoped = enforceScope && assignedSafehouses.Count > 0;
        var ids = assignedSafehouses;

        var totalTask = RunAsync(db =>
        {
            var q = db.Residents.AsNoTracking();
            if (scoped) q = q.Where(r => r.SafehouseId.HasValue && ids.Contains(r.SafehouseId.Value));
            return q.CountAsync(cancellationToken);
        });
        var highRiskTask = RunAsync(db =>
        {
            var q = db.Residents.AsNoTracking();
            if (scoped) q = q.Where(r => r.SafehouseId.HasValue && ids.Contains(r.SafehouseId.Value));
            return q.CountAsync(r => r.CurrentRiskLevel != null && (EF.Functions.ILike(r.CurrentRiskLevel, "high") || EF.Functions.ILike(r.CurrentRiskLevel, "critical")), cancellationToken);
        });
        var incidentsTask = RunAsync(db => db.IncidentReports.AsNoTracking()
            .CountAsync(item => item.Status == null || !EF.Functions.ILike(item.Status, "resolved"), cancellationToken));

        await Task.WhenAll(totalTask, highRiskTask, incidentsTask);

        return Ok(new
        {
            totalResidents = totalTask.Result,
            highRiskResidents = highRiskTask.Result,
            openIncidents = incidentsTask.Result
        });
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpGet("executive-summary")]
    public async Task<IActionResult> GetExecutiveSummary(CancellationToken cancellationToken)
    {
        var safehousesTask = RunAsync(db => db.Safehouses.AsNoTracking().CountAsync(cancellationToken));
        var residentsTask = RunAsync(db => db.Residents.AsNoTracking().CountAsync(cancellationToken));
        var supportersTask = RunAsync(db => db.Supporters.AsNoTracking().CountAsync(cancellationToken));
        var donationsTask = RunAsync(db => db.Donations.AsNoTracking().SumAsync(d => (decimal?)d.Amount, cancellationToken));
        var incidentsTask = RunAsync(db => db.IncidentReports.AsNoTracking()
            .CountAsync(item => item.Status == null || !EF.Functions.ILike(item.Status, "resolved"), cancellationToken));
        var breakdownTask = RunAsync(db => db.Safehouses.AsNoTracking()
            .Select(item => new
            {
                item.SafehouseId,
                item.Name,
                item.Status,
                item.CapacityGirls,
                item.CurrentOccupancy
            })
            .OrderBy(item => item.Name)
            .ToListAsync(cancellationToken));

        await Task.WhenAll(safehousesTask, residentsTask, supportersTask, donationsTask, incidentsTask, breakdownTask);

        return Ok(new
        {
            totalSafehouses = safehousesTask.Result,
            activeSafehouses = breakdownTask.Result.Count(item => string.Equals(item.Status, "active", StringComparison.OrdinalIgnoreCase)),
            totalResidents = residentsTask.Result,
            totalSupporters = supportersTask.Result,
            totalDonations = decimal.Round(donationsTask.Result ?? 0m, 2),
            openIncidents = incidentsTask.Result,
            safehouseBreakdown = breakdownTask.Result
        });
    }

    private async Task<T> RunAsync<T>(Func<BeaconDbContext, Task<T>> work)
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        return await work(db);
    }
}
