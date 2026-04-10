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
        var payload = await RunAsync(async db =>
        {
            var residentsServedTotal = await db.Residents.AsNoTracking().CountAsync(cancellationToken);
            var totalDonationsRaised = await db.Donations.AsNoTracking().SumAsync(item => (decimal?)item.Amount, cancellationToken);
            var reintegrationCount = await db.Residents.AsNoTracking()
                .CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "completed"), cancellationToken);
            var safehouseCount = await db.Safehouses.AsNoTracking().CountAsync(cancellationToken);
            var programAreasActive = await db.PartnerAssignments.AsNoTracking()
                .Where(item => item.ProgramArea != null)
                .Select(item => item.ProgramArea!)
                .Distinct()
                .CountAsync(cancellationToken);
            var recentSnapshots = await db.PublicImpactSnapshots.AsNoTracking()
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
                .ToListAsync(cancellationToken);

            return new
            {
                residentsServedTotal,
                totalDonationsRaised = decimal.Round(totalDonationsRaised ?? 0m, 2),
                reintegrationCount,
                safehouseCount,
                programAreasActive,
                recentSnapshots
            };
        });

        return Ok(payload);
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
        var payload = await RunAsync(async db =>
        {
            var donorDonations = db.Donations.AsNoTracking().Where(d => d.SupporterId == sid);
            var lifetimeGiving = await donorDonations.SumAsync(d => (decimal?)d.Amount, cancellationToken) ?? 0m;
            var donationCount = await donorDonations.CountAsync(cancellationToken);
            var lastDonation = await donorDonations.OrderByDescending(d => d.DonationDate).FirstOrDefaultAsync(cancellationToken);
            var trendRows = await donorDonations
                .Where(d => d.DonationDate.HasValue)
                .Select(d => new { d.DonationDate, d.Amount })
                .ToListAsync(cancellationToken);

            var givingTrend = trendRows
                .GroupBy(item => new { item.DonationDate!.Value.Year, item.DonationDate!.Value.Month })
                .OrderBy(group => group.Key.Year).ThenBy(group => group.Key.Month)
                .Select(group => new
                {
                    month = $"{group.Key.Year:D4}-{group.Key.Month:D2}",
                    year = group.Key.Year,
                    amount = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2)
                })
                .ToList();

            return new
            {
                lifetimeGiving = decimal.Round(lifetimeGiving, 2),
                donationCount,
                lastDonationDate = lastDonation?.DonationDate.HasValue == true ? lastDonation.DonationDate!.Value.ToString("yyyy-MM-dd") : null,
                lastDonationAmount = lastDonation != null && lastDonation.Amount.HasValue ? (decimal?)decimal.Round(lastDonation.Amount.Value, 2) : null,
                givingTrend
            };
        });

        return Ok(payload);
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet("admin-summary")]
    public async Task<IActionResult> GetAdminSummary(CancellationToken cancellationToken)
    {
        var assignedSafehouses = await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken);
        var enforceScope = User.GetRole() is BeaconRoles.Staff or BeaconRoles.Admin;
        var scoped = enforceScope && assignedSafehouses.Count > 0;
        var ids = assignedSafehouses;

        var payload = await RunAsync(async db =>
        {
            var residentQuery = db.Residents.AsNoTracking();
            if (scoped)
            {
                residentQuery = residentQuery.Where(r => r.SafehouseId.HasValue && ids.Contains(r.SafehouseId.Value));
            }

            var totalResidents = await residentQuery.CountAsync(cancellationToken);
            var highRiskResidents = await residentQuery.CountAsync(r =>
                r.CurrentRiskLevel != null &&
                (EF.Functions.ILike(r.CurrentRiskLevel, "high") || EF.Functions.ILike(r.CurrentRiskLevel, "critical")), cancellationToken);
            var openIncidents = await db.IncidentReports.AsNoTracking()
                .CountAsync(item => item.Status == null || !EF.Functions.ILike(item.Status, "resolved"), cancellationToken);

            return new
            {
                totalResidents,
                highRiskResidents,
                openIncidents
            };
        });

        return Ok(payload);
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpGet("executive-summary")]
    public async Task<IActionResult> GetExecutiveSummary(CancellationToken cancellationToken)
    {
        var payload = await RunAsync(async db =>
        {
            var totalSafehouses = await db.Safehouses.AsNoTracking().CountAsync(cancellationToken);
            var totalResidents = await db.Residents.AsNoTracking().CountAsync(cancellationToken);
            var totalSupporters = await db.Supporters.AsNoTracking().CountAsync(cancellationToken);
            var totalDonations = await db.Donations.AsNoTracking().SumAsync(d => (decimal?)d.Amount, cancellationToken);
            var openIncidents = await db.IncidentReports.AsNoTracking()
                .CountAsync(item => item.Status == null || !EF.Functions.ILike(item.Status, "resolved"), cancellationToken);
            var safehouseBreakdown = await db.Safehouses.AsNoTracking()
                .Select(item => new
                {
                    item.SafehouseId,
                    item.Name,
                    item.Status,
                    item.CapacityGirls,
                    item.CurrentOccupancy
                })
                .OrderBy(item => item.Name)
                .ToListAsync(cancellationToken);

            return new
            {
                totalSafehouses,
                activeSafehouses = safehouseBreakdown.Count(item => string.Equals(item.Status, "active", StringComparison.OrdinalIgnoreCase)),
                totalResidents,
                totalSupporters,
                totalDonations = decimal.Round(totalDonations ?? 0m, 2),
                openIncidents,
                safehouseBreakdown
            };
        });

        return Ok(payload);
    }

    private async Task<T> RunAsync<T>(Func<BeaconDbContext, Task<T>> work)
    {
        await using var db = await dbFactory.CreateDbContextAsync();
        return await work(db);
    }
}
