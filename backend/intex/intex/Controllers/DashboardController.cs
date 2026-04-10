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
            var donorDonations = await db.Donations.AsNoTracking()
                .Where(item => item.SupporterId == sid)
                .ToListAsync(cancellationToken);

            var sortedDonations = donorDonations
                .OrderByDescending(item => item.DonationDate ?? DateOnly.MinValue)
                .ThenByDescending(item => item.DonationId)
                .ToList();

            var lifetimeGiving = donorDonations.Sum(item => item.Amount ?? 0m);
            var donationCount = donorDonations.Count;
            var lastDonation = sortedDonations.FirstOrDefault();

            var now = DateTime.UtcNow;
            var currentYear = now.Year;
            var givingThisYear = donorDonations
                .Where(item => item.DonationDate.HasValue && item.DonationDate.Value.Year == currentYear)
                .Sum(item => item.Amount ?? 0m);

            var campaignsSupported = donorDonations
                .Select(item => item.CampaignName)
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item!.Trim().ToLowerInvariant())
                .Distinct()
                .Count();

            var monthStart = new DateTime(now.Year, now.Month, 1);
            var givingTrend = Enumerable.Range(0, 12)
                .Select(offset =>
                {
                    var d = monthStart.AddMonths(-(11 - offset));
                    var total = donorDonations
                        .Where(item => item.DonationDate.HasValue
                                       && item.DonationDate.Value.Year == d.Year
                                       && item.DonationDate.Value.Month == d.Month)
                        .Sum(item => item.Amount ?? 0m);

                    return new
                    {
                        month = $"{d.Year:D4}-{d.Month:D2}",
                        year = d.Year,
                        amount = decimal.Round(total, 2)
                    };
                })
                .ToList();

            var donationIds = donorDonations.Select(item => item.DonationId).ToList();
            var allocations = donationIds.Count > 0
                ? await db.DonationAllocations.AsNoTracking()
                    .Where(item => item.DonationId.HasValue && donationIds.Contains(item.DonationId.Value))
                    .ToListAsync(cancellationToken)
                : new List<Entities.Database.DonationAllocation>();

            var allocationRows = allocations
                .Select(item => new
                {
                    ProgramArea = string.IsNullOrWhiteSpace(item.ProgramArea) ? "general fund" : item.ProgramArea!.Trim().ToLowerInvariant(),
                    Amount = item.AmountAllocated ?? 0m
                })
                .ToList();

            var groupedAllocations = allocationRows
                .GroupBy(item => item.ProgramArea)
                .Select(group => new
                {
                    ProgramArea = group.Key,
                    Amount = group.Sum(item => item.Amount)
                })
                .Where(item => item.Amount > 0m)
                .OrderByDescending(item => item.Amount)
                .ToList();

            var totalAllocated = groupedAllocations.Sum(item => item.Amount);
            var allocationDenominator = totalAllocated > 0m ? totalAllocated : lifetimeGiving;

            var allocationBreakdown = groupedAllocations
                .Select(item => new
                {
                    programArea = ToTitleCase(item.ProgramArea.Replace("_", " ")),
                    amount = decimal.Round(item.Amount, 2),
                    percentage = allocationDenominator > 0m ? decimal.Round((item.Amount / allocationDenominator) * 100m, 1) : 0m
                })
                .ToList();

            if (allocationBreakdown.Count == 0 && lifetimeGiving > 0m)
            {
                allocationBreakdown.Add(new
                {
                    programArea = "General Fund",
                    amount = decimal.Round(lifetimeGiving, 2),
                    percentage = 100m
                });
            }

            var residents = await db.Residents.AsNoTracking().ToListAsync(cancellationToken);
            var activeResidents = residents.Count(item => string.Equals(item.CaseStatus, "active", StringComparison.OrdinalIgnoreCase));
            var reintegrations = residents.Count(item => string.Equals(item.ReintegrationStatus, "completed", StringComparison.OrdinalIgnoreCase));
            var safehouseCount = await db.Safehouses.AsNoTracking().CountAsync(cancellationToken);

            var healthScores = await db.HealthWellbeingRecords.AsNoTracking()
                .Where(item => item.GeneralHealthScore.HasValue)
                .Select(item => item.GeneralHealthScore!.Value)
                .ToListAsync(cancellationToken);

            var educationProgress = await db.EducationRecords.AsNoTracking()
                .Where(item => item.ProgressPercent.HasValue)
                .Select(item => item.ProgressPercent!.Value)
                .ToListAsync(cancellationToken);

            var avgHealthScore = healthScores.Count > 0
                ? (decimal?)decimal.Round(healthScores.Average(), 1)
                : null;

            var avgEducationProgress = educationProgress.Count > 0
                ? (decimal?)decimal.Round(educationProgress.Average(), 1)
                : null;

            var recentSnapshots = await db.PublicImpactSnapshots.AsNoTracking()
                .Where(item => item.IsPublished == true)
                .OrderByDescending(item => item.SnapshotDate)
                .ThenByDescending(item => item.SnapshotId)
                .Take(3)
                .Select(item => new
                {
                    snapshotId = item.SnapshotId,
                    snapshotDate = item.SnapshotDate.HasValue ? item.SnapshotDate.Value.ToString("yyyy-MM-dd") : null,
                    headline = item.Headline,
                    summaryText = item.SummaryText,
                    metricPayloadJson = item.MetricPayloadJson,
                    publishedAt = item.PublishedAt
                })
                .ToListAsync(cancellationToken);

            var mlReintegrationReadiness = await db.MlPredictionSnapshots.AsNoTracking()
                .Where(item => EF.Functions.ILike(item.PipelineName, "reintegration_predictor_v1"))
                .OrderByDescending(item => item.PredictionScore)
                .Take(3)
                .Select(item => new
                {
                    predictionId = item.PredictionId,
                    entityLabel = item.EntityLabel,
                    predictionScore = item.PredictionScore,
                    contextJson = item.ContextJson
                })
                .ToListAsync(cancellationToken);

            var recentDonations = sortedDonations
                .Take(5)
                .Select(item => new
                {
                    donationId = item.DonationId,
                    donationType = item.DonationType,
                    donationDate = item.DonationDate.HasValue ? item.DonationDate.Value.ToString("yyyy-MM-dd") : null,
                    campaignName = item.CampaignName,
                    currencyCode = item.CurrencyCode,
                    amount = item.Amount.HasValue ? decimal.Round(item.Amount.Value, 2) : (decimal?)null,
                    channelSource = item.ChannelSource
                })
                .ToList();

            return new
            {
                lifetimeGiving = decimal.Round(lifetimeGiving, 2),
                givingThisYear = decimal.Round(givingThisYear, 2),
                donationCount,
                lastDonationDate = lastDonation?.DonationDate.HasValue == true ? lastDonation.DonationDate!.Value.ToString("yyyy-MM-dd") : null,
                lastDonationAmount = lastDonation != null && lastDonation.Amount.HasValue ? (decimal?)decimal.Round(lastDonation.Amount.Value, 2) : null,
                campaignsSupported,
                givingTrend,
                allocationBreakdown,
                recentDonations,
                impactStats = new
                {
                    activeResidents,
                    totalResidentsServed = residents.Count,
                    safehouses = safehouseCount,
                    reintegrations,
                    avgHealthScore,
                    avgEducationProgress
                },
                recentSnapshots,
                mlReintegrationReadiness
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

        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var residentsQuery = db.Residents.AsNoTracking();
        if (scoped)
        {
            residentsQuery = residentsQuery.Where(item => item.SafehouseId.HasValue && ids.Contains(item.SafehouseId.Value));
        }

        var residents = await residentsQuery
            .Select(item => new
            {
                item.ResidentId,
                item.SafehouseId,
                item.CaseStatus,
                item.CurrentRiskLevel,
                item.ReintegrationStatus,
                item.DateOfAdmission
            })
            .ToListAsync(cancellationToken);

        var residentIds = residents.Select(item => item.ResidentId).ToHashSet();
        var activeResidents = residents
            .Where(item => string.Equals(item.CaseStatus, "active", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo = today.AddDays(-30);
        var sevenDaysAgo = today.AddDays(-7);
        var sevenDaysAhead = today.AddDays(7);

        var safehousesQuery = db.Safehouses.AsNoTracking();
        if (scoped)
        {
            safehousesQuery = safehousesQuery.Where(item => ids.Contains(item.SafehouseId));
        }

        var safehouses = await safehousesQuery
            .Select(item => new
            {
                item.SafehouseId,
                item.Name
            })
            .OrderBy(item => item.Name)
            .ToListAsync(cancellationToken);

        var incidentQuery = db.IncidentReports.AsNoTracking();
        if (scoped)
        {
            incidentQuery = incidentQuery.Where(item =>
                (item.SafehouseId.HasValue && ids.Contains(item.SafehouseId.Value))
                || (item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value)));
        }

        var incidents = await incidentQuery
            .Select(item => new
            {
                item.IncidentId,
                item.ResidentId,
                item.SafehouseId,
                item.IncidentDate,
                item.Status
            })
            .ToListAsync(cancellationToken);

        var conferenceQuery = db.CaseConferences.AsNoTracking();
        if (scoped)
        {
            conferenceQuery = conferenceQuery.Where(item => residentIds.Contains(item.ResidentId));
        }

        var conferences = await conferenceQuery
            .Select(item => new
            {
                item.ConferenceId,
                item.ResidentId,
                item.ConferenceDate
            })
            .ToListAsync(cancellationToken);

        var processRecordingQuery = db.ProcessRecordings.AsNoTracking();
        if (scoped)
        {
            processRecordingQuery = processRecordingQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var processRecordingCount = await processRecordingQuery
            .CountAsync(item => item.SessionDate.HasValue && item.SessionDate.Value >= sevenDaysAgo, cancellationToken);

        var interventionPlanQuery = db.InterventionPlans.AsNoTracking();
        if (scoped)
        {
            interventionPlanQuery = interventionPlanQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var activeInterventionPlans = await interventionPlanQuery
            .CountAsync(item =>
                item.Status != null
                && !EF.Functions.ILike(item.Status, "completed")
                && !EF.Functions.ILike(item.Status, "discontinued")
                && !EF.Functions.ILike(item.Status, "cancelled"), cancellationToken);

        var donationTotalThisMonth = await db.Donations.AsNoTracking()
            .Where(item => item.DonationDate.HasValue && item.DonationDate.Value >= thirtyDaysAgo)
            .SumAsync(item => (decimal?)item.Amount, cancellationToken) ?? 0m;

        var donationTrend = await db.Donations.AsNoTracking()
            .Where(item => item.DonationDate.HasValue)
            .Select(item => new
            {
                item.DonationDate,
                item.Amount
            })
            .ToListAsync(cancellationToken);

        var socialReferralsThisMonth = await db.SocialMediaPosts.AsNoTracking()
            .CountAsync(item => item.CreatedAt.HasValue && item.CreatedAt.Value >= thirtyDaysAgo.ToDateTime(TimeOnly.MinValue), cancellationToken);

        var mlAlerts = await db.MlPredictionSnapshots.AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(5)
            .Select(item => new
            {
                item.PredictionId,
                item.RunId,
                item.PipelineName,
                item.EntityType,
                item.EntityId,
                item.EntityKey,
                item.EntityLabel,
                item.SafehouseId,
                item.RecordTimestamp,
                item.PredictionValue,
                item.PredictionScore,
                item.RankOrder,
                item.ContextJson,
                item.CreatedAt,
                item.BandLabel,
                item.ActionCode
            })
            .ToListAsync(cancellationToken);

        var openIncidents = incidents.Count(item =>
            item.Status is null
            || string.Equals(item.Status, "open", StringComparison.OrdinalIgnoreCase)
            || string.Equals(item.Status, "under_review", StringComparison.OrdinalIgnoreCase)
            || string.Equals(item.Status, "investigating", StringComparison.OrdinalIgnoreCase));

        var incidentsThisWeek = incidents.Count(item => item.IncidentDate.HasValue && item.IncidentDate.Value >= sevenDaysAgo);
        var highRiskResidents = activeResidents.Count(item => IsHighRisk(item.CurrentRiskLevel));
        var admissionsThisMonth = activeResidents.Count(item => item.DateOfAdmission.HasValue && item.DateOfAdmission.Value >= thirtyDaysAgo);
        var upcomingCaseConferences = conferences.Count(item => item.ConferenceDate >= today && item.ConferenceDate <= sevenDaysAhead);
        var overdueFollowUps = conferences.Count(item => item.ConferenceDate < today);

        var residentsByRisk = safehouses.Select(safehouse =>
        {
            var safehouseResidents = activeResidents
                .Where(item => item.SafehouseId == safehouse.SafehouseId)
                .ToList();

            return new
            {
                safehouse = safehouse.Name,
                low = safehouseResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "low")),
                medium = safehouseResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "medium")),
                high = safehouseResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "high")),
                critical = safehouseResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "critical"))
            };
        }).ToList();

        var reintegrationBreakdown = new
        {
            notStarted = activeResidents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "not_started"),
            inProgress = activeResidents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "in_progress"),
            ready = activeResidents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "ready"),
            completed = residents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "completed")
        };

        var priorityAlerts = new List<object>();
        if (highRiskResidents > 0)
        {
            priorityAlerts.Add(new
            {
                type = "risk",
                message = $"{highRiskResidents} resident{(highRiskResidents == 1 ? string.Empty : "s")} at high or critical risk level",
                entityId = 0,
                severity = "high"
            });
        }

        if (openIncidents > 0)
        {
            priorityAlerts.Add(new
            {
                type = "incident",
                message = $"{openIncidents} open incident{(openIncidents == 1 ? string.Empty : "s")} require follow-up",
                entityId = 0,
                severity = openIncidents > 2 ? "high" : "medium"
            });
        }

        if (overdueFollowUps > 0)
        {
            priorityAlerts.Add(new
            {
                type = "conference",
                message = $"{overdueFollowUps} case conference{(overdueFollowUps == 1 ? string.Empty : "s")} overdue",
                entityId = 0,
                severity = "medium"
            });
        }

        var donationTrendByMonth = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var monthDate = DateTime.UtcNow.AddMonths(-(5 - offset));
                var monthKey = monthDate.ToString("yyyy-MM");
                var monthRows = donationTrend.Where(item =>
                    item.DonationDate.HasValue
                    && $"{item.DonationDate.Value.Year:D4}-{item.DonationDate.Value.Month:D2}" == monthKey);

                return new
                {
                    month = monthDate.ToString("MMM yy"),
                    amount = decimal.Round(monthRows.Sum(item => item.Amount ?? 0m), 2),
                    count = monthRows.Count()
                };
            })
            .ToList();

        return Ok(new
        {
            totalResidents = residents.Count,
            activeResidents = activeResidents.Count,
            highRiskResidents,
            highRiskCount = highRiskResidents,
            openIncidents,
            incidentsThisWeek,
            admissionsThisMonth,
            upcomingCaseConferences,
            overdueFollowUps,
            socialReferralsThisMonth,
            donationTotalThisMonth = decimal.Round(donationTotalThisMonth, 2),
            donationTrend = donationTrendByMonth,
            residentsByRisk,
            reintegrationBreakdown,
            processRecordingsThisWeek = processRecordingCount,
            activeInterventionPlans,
            priorityAlerts,
            mlAlerts
        });
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

    private static bool IsHighRisk(string? value) =>
        string.Equals(value, "high", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "critical", StringComparison.OrdinalIgnoreCase);

    private static bool EqualsIgnoreCase(string? left, string right) =>
        string.Equals(left, right, StringComparison.OrdinalIgnoreCase);

    private static string ToTitleCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return string.Join(" ", value
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => char.ToUpperInvariant(part[0]) + part[1..].ToLowerInvariant()));
    }

    private static string NormalizeReintegrationDashboardStage(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "not_started";
        }

        var normalized = value.Trim().Replace(" ", "_").ToLowerInvariant();
        return normalized switch
        {
            "on_hold" => "ready",
            "not_started" => "not_started",
            "in_progress" => "in_progress",
            "ready" => "ready",
            "completed" => "completed",
            _ => "not_started"
        };
    }
}
