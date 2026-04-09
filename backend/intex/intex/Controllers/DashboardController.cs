using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Route("dashboard")]
public sealed class DashboardController(BeaconDbContext dbContext, IUserScopeService userScopeService) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpGet("public-impact")]
    public async Task<IActionResult> GetPublicImpact(CancellationToken cancellationToken)
    {
        var residentsServedTotal = await dbContext.Residents.AsNoTracking().CountAsync(cancellationToken);
        var totalDonationsRaised = await dbContext.Donations.AsNoTracking().SumAsync(item => (decimal?)item.Amount, cancellationToken) ?? 0m;
        var reintegrationCount = await dbContext.Residents.AsNoTracking()
            .CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "completed"), cancellationToken);
        var safehouseCount = await dbContext.Safehouses.AsNoTracking().CountAsync(cancellationToken);
        var programAreasActive = await dbContext.PartnerAssignments.AsNoTracking()
            .Where(item => item.ProgramArea != null)
            .Select(item => item.ProgramArea!)
            .Distinct()
            .CountAsync(cancellationToken);

        var recentSnapshots = await dbContext.PublicImpactSnapshots.AsNoTracking()
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

        return Ok(new
        {
            residentsServedTotal,
            totalDonationsRaised = decimal.Round(totalDonationsRaised, 2),
            reintegrationCount,
            safehouseCount,
            programAreasActive,
            recentSnapshots
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

        var donations = dbContext.Donations.AsNoTracking().Where(item => item.SupporterId == supporterId.Value);
        var lifetimeGiving = await donations.SumAsync(item => (decimal?)item.Amount, cancellationToken) ?? 0m;
        var donationCount = await donations.CountAsync(cancellationToken);
        var lastDonation = await donations.OrderByDescending(item => item.DonationDate).FirstOrDefaultAsync(cancellationToken);

        var givingTrend = await donations
            .Where(item => item.DonationDate.HasValue)
            .GroupBy(item => new { Year = item.DonationDate!.Value.Year, Month = item.DonationDate!.Value.Month })
            .Select(group => new
            {
                month = $"{group.Key.Year:D4}-{group.Key.Month:D2}",
                year = group.Key.Year,
                amount = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2)
            })
            .OrderBy(item => item.month)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            lifetimeGiving = decimal.Round(lifetimeGiving, 2),
            donationCount,
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

        var residentsQuery = dbContext.Residents.AsNoTracking();
        if (enforceScope && assignedSafehouses.Count > 0)
        {
            residentsQuery = residentsQuery.Where(item => item.SafehouseId.HasValue && assignedSafehouses.Contains(item.SafehouseId.Value));
        }

        var totalResidents = await residentsQuery.CountAsync(cancellationToken);
        var highRiskResidents = await residentsQuery.CountAsync(
            item => item.CurrentRiskLevel != null && (EF.Functions.ILike(item.CurrentRiskLevel, "high") || EF.Functions.ILike(item.CurrentRiskLevel, "critical")),
            cancellationToken);

        var openIncidents = await dbContext.IncidentReports.AsNoTracking()
            .CountAsync(item => item.Status == null || !EF.Functions.ILike(item.Status, "resolved"), cancellationToken);

        return Ok(new
        {
            totalResidents,
            highRiskResidents,
            openIncidents
        });
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpGet("executive-summary")]
    public async Task<IActionResult> GetExecutiveSummary(CancellationToken cancellationToken)
    {
        var totalSafehouses = await dbContext.Safehouses.AsNoTracking().CountAsync(cancellationToken);
        var totalResidents = await dbContext.Residents.AsNoTracking().CountAsync(cancellationToken);
        var totalSupporters = await dbContext.Supporters.AsNoTracking().CountAsync(cancellationToken);
        var totalDonations = await dbContext.Donations.AsNoTracking().SumAsync(item => (decimal?)item.Amount, cancellationToken) ?? 0m;
        var openIncidents = await dbContext.IncidentReports.AsNoTracking()
            .CountAsync(item => item.Status == null || !EF.Functions.ILike(item.Status, "resolved"), cancellationToken);

        var safehouseBreakdown = await dbContext.Safehouses.AsNoTracking()
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

        return Ok(new
        {
            totalSafehouses,
            activeSafehouses = safehouseBreakdown.Count(item => string.Equals(item.Status, "active", StringComparison.OrdinalIgnoreCase)),
            totalResidents,
            totalSupporters,
            totalDonations = decimal.Round(totalDonations, 2),
            openIncidents,
            safehouseBreakdown
        });
    }
}
