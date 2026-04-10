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

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet("admin-reports")]
    public async Task<IActionResult> GetAdminReports(CancellationToken cancellationToken)
    {
        var assignedSafehouses = await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken);
        var enforceScope = User.GetRole() is BeaconRoles.Staff or BeaconRoles.Admin;
        var scoped = enforceScope && assignedSafehouses.Count > 0;
        var scopedSafehouseIds = assignedSafehouses;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentMonthStart = new DateOnly(today.Year, today.Month, 1);
        var monthWindowStart = currentMonthStart.AddMonths(-11);
        var comparisonWindowStart = currentMonthStart.AddMonths(-5);
        var recentQuarterStart = today.AddDays(-90);

        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var safehouses = await db.Safehouses.AsNoTracking()
            .Select(item => new
            {
                item.SafehouseId,
                item.Name,
                item.Region,
                item.Status,
                item.CapacityGirls,
                item.CurrentOccupancy
            })
            .OrderBy(item => item.Name)
            .ToListAsync(cancellationToken);

        var scopedSafehouseRows = scoped
            ? safehouses.Where(item => scopedSafehouseIds.Contains(item.SafehouseId)).ToList()
            : safehouses;

        var primarySafehouse = scopedSafehouseRows
            .OrderBy(item => item.Name)
            .FirstOrDefault();

        var residentsQuery = db.Residents.AsNoTracking();
        if (scoped)
        {
            residentsQuery = residentsQuery.Where(item => item.SafehouseId.HasValue && scopedSafehouseIds.Contains(item.SafehouseId.Value));
        }

        var scopedResidents = await residentsQuery
            .Select(item => new
            {
                item.ResidentId,
                item.SafehouseId,
                item.CaseStatus,
                item.CurrentRiskLevel,
                item.InitialRiskLevel,
                item.ReintegrationStatus,
                item.DateOfAdmission,
                item.DateClosed
            })
            .ToListAsync(cancellationToken);

        var residentIds = scopedResidents.Select(item => item.ResidentId).ToHashSet();
        var activeResidents = scopedResidents
            .Where(item => string.Equals(item.CaseStatus, "active", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var donationsQuery = db.Donations.AsNoTracking()
            .Where(item => item.DonationDate.HasValue && item.DonationDate.Value >= monthWindowStart);
        if (scoped)
        {
            donationsQuery = donationsQuery.Where(item => item.SafehouseId.HasValue && scopedSafehouseIds.Contains(item.SafehouseId.Value));
        }

        var scopedDonations = await donationsQuery
            .Select(item => new
            {
                item.DonationDate,
                item.Amount,
                item.EstimatedValue,
                item.IsRecurring,
                item.DonationType
            })
            .ToListAsync(cancellationToken);

        var educationQuery = db.EducationRecords.AsNoTracking();
        if (scoped)
        {
            educationQuery = educationQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var scopedEducation = await educationQuery
            .Select(item => new
            {
                item.RecordDate,
                item.AttendanceRate,
                item.ProgressPercent,
                item.CompletionStatus
            })
            .ToListAsync(cancellationToken);

        var healthQuery = db.HealthWellbeingRecords.AsNoTracking();
        if (scoped)
        {
            healthQuery = healthQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var scopedHealth = await healthQuery
            .Select(item => new
            {
                item.RecordDate,
                item.GeneralHealthScore,
                item.NutritionScore,
                item.SleepQualityScore,
                item.EnergyLevelScore,
                item.MedicalCheckupDone,
                item.DentalCheckupDone,
                item.PsychologicalCheckupDone
            })
            .ToListAsync(cancellationToken);

        var incidentsQuery = db.IncidentReports.AsNoTracking();
        if (scoped)
        {
            incidentsQuery = incidentsQuery.Where(item =>
                (item.SafehouseId.HasValue && scopedSafehouseIds.Contains(item.SafehouseId.Value))
                || (item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value)));
        }

        var scopedIncidents = await incidentsQuery
            .Select(item => new
            {
                item.IncidentDate,
                item.Resolved
            })
            .ToListAsync(cancellationToken);

        var processRecordingsQuery = db.ProcessRecordings.AsNoTracking();
        if (scoped)
        {
            processRecordingsQuery = processRecordingsQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var scopedProcessRecordings = await processRecordingsQuery
            .Select(item => new
            {
                item.SessionDate
            })
            .ToListAsync(cancellationToken);

        var homeVisitationsQuery = db.HomeVisitations.AsNoTracking();
        if (scoped)
        {
            homeVisitationsQuery = homeVisitationsQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var scopedHomeVisitations = await homeVisitationsQuery
            .Select(item => new
            {
                item.VisitDate
            })
            .ToListAsync(cancellationToken);

        var interventionPlansQuery = db.InterventionPlans.AsNoTracking();
        if (scoped)
        {
            interventionPlansQuery = interventionPlansQuery.Where(item => item.ResidentId.HasValue && residentIds.Contains(item.ResidentId.Value));
        }

        var scopedInterventionPlans = await interventionPlansQuery
            .Select(item => new
            {
                item.Status
            })
            .ToListAsync(cancellationToken);

        var allResidents = await db.Residents.AsNoTracking()
            .Where(item => item.SafehouseId.HasValue)
            .Select(item => new
            {
                item.SafehouseId,
                item.CaseStatus,
                item.ReintegrationStatus
            })
            .ToListAsync(cancellationToken);

        var comparisonMetrics = await db.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(item => item.MonthStart.HasValue && item.MonthStart.Value >= comparisonWindowStart)
            .Select(item => new
            {
                item.SafehouseId,
                item.MonthStart,
                item.ActiveResidents,
                item.AvgEducationProgress,
                item.AvgHealthScore,
                item.ProcessRecordingCount,
                item.HomeVisitationCount,
                item.IncidentCount,
                item.CompositeHealthScore,
                item.PeerRank,
                item.TrendDirection
            })
            .ToListAsync(cancellationToken);

        var donationTrends = Enumerable.Range(0, 12)
            .Select(offset =>
            {
                var month = monthWindowStart.AddMonths(offset);
                var monthRows = scopedDonations
                    .Where(item => item.DonationDate.HasValue
                                   && item.DonationDate.Value.Year == month.Year
                                   && item.DonationDate.Value.Month == month.Month)
                    .ToList();

                var totalAmount = monthRows.Sum(item => item.Amount ?? 0m);
                var recurringAmount = monthRows
                    .Where(item => item.IsRecurring == true)
                    .Sum(item => item.Amount ?? 0m);
                var inKindEstimatedValue = monthRows
                    .Where(item => string.Equals(item.DonationType, "inkind", StringComparison.OrdinalIgnoreCase))
                    .Sum(item => item.EstimatedValue ?? 0m);

                return new
                {
                    period = month.ToString("MMM yyyy"),
                    monthKey = $"{month.Year:D4}-{month.Month:D2}",
                    totalAmount = decimal.Round(totalAmount, 2),
                    recurringAmount = decimal.Round(recurringAmount, 2),
                    inKindEstimatedValue = decimal.Round(inKindEstimatedValue, 2),
                    donationCount = monthRows.Count
                };
            })
            .ToList();

        var riskDistribution = new[] { "Low", "Medium", "High", "Critical" }
            .Select(level => new
            {
                level,
                count = activeResidents.Count(item => string.Equals(item.CurrentRiskLevel ?? item.InitialRiskLevel, level, StringComparison.OrdinalIgnoreCase))
            })
            .ToList();

        var outcomeStatus = new[] { "Active", "Closed", "Transferred" }
            .Select(status => new
            {
                status,
                count = scopedResidents.Count(item => string.Equals(item.CaseStatus, status, StringComparison.OrdinalIgnoreCase))
            })
            .ToList();

        var reintegrationStatus = new[] { "Not Started", "On Hold", "In Progress", "Completed" }
            .Select(status => new
            {
                status,
                count = scopedResidents.Count(item => string.Equals(NormalizeReintegrationReportLabel(item.ReintegrationStatus), status, StringComparison.OrdinalIgnoreCase))
            })
            .ToList();

        var educationMonthly = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var month = comparisonWindowStart.AddMonths(offset);
                var rows = scopedEducation
                    .Where(item => item.RecordDate.HasValue
                                   && item.RecordDate.Value.Year == month.Year
                                   && item.RecordDate.Value.Month == month.Month)
                    .ToList();

                var avgProgress = rows.Count > 0 && rows.Any(item => item.ProgressPercent.HasValue)
                    ? decimal.Round(rows.Where(item => item.ProgressPercent.HasValue).Average(item => item.ProgressPercent!.Value), 1)
                    : 0m;

                var avgAttendanceRate = rows.Count > 0 && rows.Any(item => item.AttendanceRate.HasValue)
                    ? decimal.Round(rows.Where(item => item.AttendanceRate.HasValue).Average(item => item.AttendanceRate!.Value) * 100m, 1)
                    : 0m;

                return new
                {
                    period = month.ToString("MMM yyyy"),
                    monthKey = $"{month.Year:D4}-{month.Month:D2}",
                    avgProgressPercent = avgProgress,
                    avgAttendanceRate = avgAttendanceRate
                };
            })
            .ToList();

        var healthMonthly = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var month = comparisonWindowStart.AddMonths(offset);
                var rows = scopedHealth
                    .Where(item => item.RecordDate.HasValue
                                   && item.RecordDate.Value.Year == month.Year
                                   && item.RecordDate.Value.Month == month.Month)
                    .ToList();

                decimal AverageOrZero(IEnumerable<decimal?> values)
                {
                    var present = values.Where(value => value.HasValue).Select(value => value!.Value).ToList();
                    return present.Count > 0 ? decimal.Round(present.Average(), 2) : 0m;
                }

                return new
                {
                    period = month.ToString("MMM yyyy"),
                    monthKey = $"{month.Year:D4}-{month.Month:D2}",
                    avgGeneralHealthScore = AverageOrZero(rows.Select(item => item.GeneralHealthScore)),
                    avgNutritionScore = AverageOrZero(rows.Select(item => item.NutritionScore)),
                    avgSleepScore = AverageOrZero(rows.Select(item => item.SleepQualityScore)),
                    avgEnergyScore = AverageOrZero(rows.Select(item => item.EnergyLevelScore))
                };
            })
            .ToList();

        decimal AverageOrNull<T>(IEnumerable<T> items, Func<T, decimal?> selector)
        {
            var values = items.Select(selector).Where(value => value.HasValue).Select(value => value!.Value).ToList();
            return values.Count > 0 ? decimal.Round(values.Average(), 2) : 0m;
        }

        var openIncidents = scopedIncidents.Count(item => item.Resolved != true);
        var completedReintegrations = scopedResidents.Count(item => string.Equals(NormalizeReintegrationReportLabel(item.ReintegrationStatus), "Completed", StringComparison.OrdinalIgnoreCase));
        var totalResidents = scopedResidents.Count;
        var reintegrationCompletionRate = totalResidents > 0
            ? Math.Round((completedReintegrations / (double)totalResidents) * 100d, 1)
            : 0d;

        var safehouseComparisons = safehouses
            .Select(safehouse =>
            {
                var latestMetric = comparisonMetrics
                    .Where(item => item.SafehouseId == safehouse.SafehouseId)
                    .OrderByDescending(item => item.MonthStart)
                    .FirstOrDefault();

                return new
                {
                    safehouseId = safehouse.SafehouseId,
                    safehouseName = safehouse.Name,
                    region = safehouse.Region,
                    isPrimary = primarySafehouse?.SafehouseId == safehouse.SafehouseId,
                    capacityGirls = safehouse.CapacityGirls,
                    currentOccupancy = safehouse.CurrentOccupancy,
                    capacityUtilization = safehouse.CapacityGirls.GetValueOrDefault() > 0
                        ? Math.Round((safehouse.CurrentOccupancy.GetValueOrDefault() / (double)safehouse.CapacityGirls.GetValueOrDefault()) * 100d, 1)
                        : 0d,
                    avgEducationProgress = latestMetric?.AvgEducationProgress,
                    avgHealthScore = latestMetric?.AvgHealthScore,
                    activeResidents = latestMetric?.ActiveResidents,
                    processRecordingCount = latestMetric?.ProcessRecordingCount,
                    homeVisitationCount = latestMetric?.HomeVisitationCount,
                    incidentCount = latestMetric?.IncidentCount,
                    compositeHealthScore = latestMetric?.CompositeHealthScore,
                    peerRank = latestMetric?.PeerRank,
                    trendDirection = latestMetric?.TrendDirection,
                    month = latestMetric?.MonthStart.HasValue == true ? latestMetric.MonthStart.Value.ToString("MMM yyyy") : null
                };
            })
            .OrderByDescending(item => item.compositeHealthScore ?? 0d)
            .ThenBy(item => item.safehouseName)
            .ToList();

        var reintegrationComparison = safehouses
            .Select(safehouse =>
            {
                var rows = allResidents
                    .Where(item => item.SafehouseId == safehouse.SafehouseId)
                    .ToList();

                var completed = rows.Count(item => string.Equals(NormalizeReintegrationReportLabel(item.ReintegrationStatus), "Completed", StringComparison.OrdinalIgnoreCase));
                var total = rows.Count;

                return new
                {
                    safehouseId = safehouse.SafehouseId,
                    safehouseName = safehouse.Name,
                    isPrimary = primarySafehouse?.SafehouseId == safehouse.SafehouseId,
                    totalResidents = total,
                    completedCount = completed,
                    successRate = total > 0 ? Math.Round((completed / (double)total) * 100d, 1) : 0d,
                    notStarted = rows.Count(item => string.Equals(NormalizeReintegrationReportLabel(item.ReintegrationStatus), "Not Started", StringComparison.OrdinalIgnoreCase)),
                    onHold = rows.Count(item => string.Equals(NormalizeReintegrationReportLabel(item.ReintegrationStatus), "On Hold", StringComparison.OrdinalIgnoreCase)),
                    inProgress = rows.Count(item => string.Equals(NormalizeReintegrationReportLabel(item.ReintegrationStatus), "In Progress", StringComparison.OrdinalIgnoreCase)),
                    completed
                };
            })
            .OrderByDescending(item => item.successRate)
            .ThenBy(item => item.safehouseName)
            .ToList();

        return Ok(new
        {
            generatedAt = DateTime.UtcNow.ToString("O"),
            scope = new
            {
                primarySafehouseId = primarySafehouse?.SafehouseId,
                primarySafehouseName = primarySafehouse?.Name,
                scopedSafehouseIds = scopedSafehouseRows.Select(item => item.SafehouseId).ToList(),
                scopedSafehouseNames = scopedSafehouseRows.Select(item => item.Name).Where(item => !string.IsNullOrWhiteSpace(item)).ToList(),
                reportWindowMonths = 12
            },
            summary = new
            {
                totalDonationsRaised = decimal.Round(scopedDonations.Sum(item => item.Amount ?? 0m), 2),
                donationCount = scopedDonations.Count,
                recurringDonationCount = scopedDonations.Count(item => item.IsRecurring == true),
                inKindDonationValue = decimal.Round(scopedDonations
                    .Where(item => string.Equals(item.DonationType, "inkind", StringComparison.OrdinalIgnoreCase))
                    .Sum(item => item.EstimatedValue ?? 0m), 2),
                activeResidents = activeResidents.Count,
                totalResidents,
                highRiskResidents = activeResidents.Count(item => IsHighRisk(item.CurrentRiskLevel ?? item.InitialRiskLevel)),
                openIncidents,
                processRecordings = scopedProcessRecordings.Count,
                homeVisitations = scopedHomeVisitations.Count,
                activeInterventionPlans = scopedInterventionPlans.Count(item =>
                    !string.IsNullOrWhiteSpace(item.Status)
                    && !string.Equals(item.Status, "closed", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(item.Status, "achieved", StringComparison.OrdinalIgnoreCase)),
                completedReintegrations,
                reintegrationCompletionRate,
                avgEducationProgress = AverageOrNull(scopedEducation, item => item.ProgressPercent),
                avgAttendanceRate = decimal.Round(AverageOrNull(scopedEducation, item => item.AttendanceRate) * 100m, 1),
                avgHealthScore = AverageOrNull(scopedHealth, item => item.GeneralHealthScore),
                avgNutritionScore = AverageOrNull(scopedHealth, item => item.NutritionScore)
            },
            donationTrends,
            residentOutcomes = new
            {
                caseStatus = outcomeStatus,
                riskDistribution,
                reintegrationStatus,
                activeResidents = activeResidents.Count,
                closedCases = outcomeStatus.First(item => item.status == "Closed").count,
                transferredCases = outcomeStatus.First(item => item.status == "Transferred").count,
                newAdmissionsThisQuarter = scopedResidents.Count(item => item.DateOfAdmission.HasValue && item.DateOfAdmission.Value >= recentQuarterStart),
                casesClosedThisQuarter = scopedResidents.Count(item => item.DateClosed.HasValue && item.DateClosed.Value >= recentQuarterStart)
            },
            educationMetrics = new
            {
                avgProgressPercent = AverageOrNull(scopedEducation, item => item.ProgressPercent),
                avgAttendanceRate = decimal.Round(AverageOrNull(scopedEducation, item => item.AttendanceRate) * 100m, 1),
                completedCount = scopedEducation.Count(item => string.Equals(item.CompletionStatus, "completed", StringComparison.OrdinalIgnoreCase)),
                inProgressCount = scopedEducation.Count(item => string.Equals(item.CompletionStatus, "inprogress", StringComparison.OrdinalIgnoreCase) || string.Equals(item.CompletionStatus, "in_progress", StringComparison.OrdinalIgnoreCase)),
                notStartedCount = scopedEducation.Count(item => string.Equals(item.CompletionStatus, "notstarted", StringComparison.OrdinalIgnoreCase) || string.Equals(item.CompletionStatus, "not_started", StringComparison.OrdinalIgnoreCase)),
                monthlyTrend = educationMonthly
            },
            healthMetrics = new
            {
                avgGeneralHealthScore = AverageOrNull(scopedHealth, item => item.GeneralHealthScore),
                avgNutritionScore = AverageOrNull(scopedHealth, item => item.NutritionScore),
                avgSleepScore = AverageOrNull(scopedHealth, item => item.SleepQualityScore),
                avgEnergyScore = AverageOrNull(scopedHealth, item => item.EnergyLevelScore),
                medicalCoverageRate = scopedHealth.Count > 0 ? Math.Round((scopedHealth.Count(item => item.MedicalCheckupDone == true) / (double)scopedHealth.Count) * 100d, 1) : 0d,
                dentalCoverageRate = scopedHealth.Count > 0 ? Math.Round((scopedHealth.Count(item => item.DentalCheckupDone == true) / (double)scopedHealth.Count) * 100d, 1) : 0d,
                psychologicalCoverageRate = scopedHealth.Count > 0 ? Math.Round((scopedHealth.Count(item => item.PsychologicalCheckupDone == true) / (double)scopedHealth.Count) * 100d, 1) : 0d,
                monthlyTrend = healthMonthly,
                improvementDelta = healthMonthly.Count >= 2
                    ? Math.Round((double)(healthMonthly[^1].avgGeneralHealthScore - healthMonthly[0].avgGeneralHealthScore), 2)
                    : 0d
            },
            safehouseComparisons,
            reintegrationComparisons = reintegrationComparison
        });
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpGet("executive-summary")]
    public async Task<IActionResult> GetExecutiveSummary([FromQuery] long? safehouseId, [FromQuery] int months = 12, CancellationToken cancellationToken = default)
    {
        var resolvedMonths = Math.Clamp(months <= 0 ? 12 : months, 1, 24);

        var payload = await RunAsync(async db =>
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var sevenDaysAgo = today.AddDays(-7);
            var currentYear = today.Year;

            var safehousesQuery = db.Safehouses.AsNoTracking();
            if (safehouseId.HasValue)
            {
                safehousesQuery = safehousesQuery.Where(item => item.SafehouseId == safehouseId.Value);
            }

            var safehouses = await safehousesQuery
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

            var residentsQuery = db.Residents.AsNoTracking();
            if (safehouseId.HasValue)
            {
                residentsQuery = residentsQuery.Where(item => item.SafehouseId == safehouseId.Value);
            }

            var residents = await residentsQuery
                .Select(item => new
                {
                    item.ResidentId,
                    item.SafehouseId,
                    item.CaseStatus,
                    item.CurrentRiskLevel,
                    item.ReintegrationStatus
                })
                .ToListAsync(cancellationToken);

            var donationsQuery = db.Donations.AsNoTracking();
            if (safehouseId.HasValue)
            {
                donationsQuery = donationsQuery.Where(item => item.SafehouseId == safehouseId.Value);
            }

            var donations = await donationsQuery
                .Select(item => new
                {
                    item.SupporterId,
                    item.DonationDate,
                    item.Amount,
                    item.ChannelSource
                })
                .ToListAsync(cancellationToken);

            var incidentsQuery = db.IncidentReports.AsNoTracking();
            if (safehouseId.HasValue)
            {
                incidentsQuery = incidentsQuery.Where(item => item.SafehouseId == safehouseId.Value);
            }

            var incidents = await incidentsQuery
                .Select(item => new
                {
                    item.SafehouseId,
                    item.IncidentDate,
                    item.Status
                })
                .ToListAsync(cancellationToken);

            var activeResidents = residents
                .Where(item => string.Equals(item.CaseStatus, "active", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var highRiskResidents = activeResidents.Count(item => IsHighRisk(item.CurrentRiskLevel));
            var openIncidents = incidents.Count(item =>
                item.Status is null || !string.Equals(item.Status, "resolved", StringComparison.OrdinalIgnoreCase));
            var incidentsThisWeek = incidents.Count(item => item.IncidentDate.HasValue && item.IncidentDate.Value >= sevenDaysAgo);

            var totalDonations = decimal.Round(donations.Sum(item => item.Amount ?? 0m), 2);
            var totalDonationCount = donations.Count;
            var donationsYtd = decimal.Round(
                donations.Where(item => item.DonationDate.HasValue && item.DonationDate.Value.Year == currentYear)
                    .Sum(item => item.Amount ?? 0m),
                2);

            var donorGroups = donations
                .Where(item => item.SupporterId.HasValue)
                .GroupBy(item => item.SupporterId!.Value)
                .ToList();
            var totalUniqueDonors = donorGroups.Count;
            var returningDonorCount = donorGroups.Count(group => group.Count() > 1);
            var orgRetentionEstimate = totalUniqueDonors > 0
                ? Math.Round((returningDonorCount / (double)totalUniqueDonors) * 100d, 1)
                : 0d;

            var totalSupporters = safehouseId.HasValue
                ? totalUniqueDonors
                : await db.Supporters.AsNoTracking().CountAsync(cancellationToken);

            var riskDistribution = new
            {
                low = activeResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "low")),
                medium = activeResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "medium")),
                high = activeResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "high")),
                critical = activeResidents.Count(item => EqualsIgnoreCase(item.CurrentRiskLevel, "critical")),
                unknown = activeResidents.Count(item => string.IsNullOrWhiteSpace(item.CurrentRiskLevel))
            };

            var reintegrationBreakdown = new
            {
                notStarted = activeResidents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "not_started"),
                inProgress = activeResidents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "in_progress"),
                ready = activeResidents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "ready"),
                completed = residents.Count(item => NormalizeReintegrationDashboardStage(item.ReintegrationStatus) == "completed")
            };

            var completedReintegrations = reintegrationBreakdown.completed;
            var reintegrationSuccessRate = residents.Count > 0
                ? Math.Round((completedReintegrations / (double)residents.Count) * 100d, 1)
                : 0d;

            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var donationTrend = Enumerable.Range(0, resolvedMonths)
                .Select(offset =>
                {
                    var point = monthStart.AddMonths(-(resolvedMonths - 1 - offset));
                    var total = donations
                        .Where(item =>
                            item.DonationDate.HasValue
                            && item.DonationDate.Value.Year == point.Year
                            && item.DonationDate.Value.Month == point.Month)
                        .ToList();

                    return new
                    {
                        month = $"{point.Year:D4}-{point.Month:D2}",
                        year = point.Year.ToString(),
                        label = point.ToString("MMM yy"),
                        amount = decimal.Round(total.Sum(item => item.Amount ?? 0m), 2),
                        count = total.Count
                    };
                })
                .ToList();

            var donationByChannel = donations
                .GroupBy(item => string.IsNullOrWhiteSpace(item.ChannelSource) ? "unknown" : item.ChannelSource!.Trim().ToLowerInvariant())
                .Select(group => new
                {
                    channel = group.Key,
                    amount = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2)
                })
                .OrderByDescending(item => item.amount)
                .ToList();

            var safehouseBreakdown = safehouses.Select(item =>
            {
                var safehouseResidents = residents.Where(resident => resident.SafehouseId == item.SafehouseId).ToList();
                var safehouseActiveResidents = safehouseResidents
                    .Where(resident => string.Equals(resident.CaseStatus, "active", StringComparison.OrdinalIgnoreCase))
                    .ToList();
                var safehouseIncidents = incidents.Where(incident => incident.SafehouseId == item.SafehouseId).ToList();
                var occupancyPct = item.CapacityGirls.HasValue && item.CapacityGirls.Value > 0
                    ? Math.Round(((item.CurrentOccupancy ?? 0) / (double)item.CapacityGirls.Value) * 100d, 1)
                    : 0d;

                return new
                {
                    safehouseId = item.SafehouseId,
                    name = item.Name,
                    status = item.Status,
                    capacityGirls = item.CapacityGirls,
                    currentOccupancy = item.CurrentOccupancy,
                    occupancyPct,
                    activeResidents = safehouseActiveResidents.Count,
                    totalResidents = safehouseResidents.Count,
                    highRiskCount = safehouseActiveResidents.Count(resident => IsHighRisk(resident.CurrentRiskLevel)),
                    openIncidents = safehouseIncidents.Count(incident =>
                        incident.Status is null || !string.Equals(incident.Status, "resolved", StringComparison.OrdinalIgnoreCase))
                };
            }).ToList();

            return new
            {
                totalSafehouses = safehouses.Count,
                activeSafehouses = safehouses.Count(item => string.Equals(item.Status, "active", StringComparison.OrdinalIgnoreCase)),
                totalResidents = residents.Count,
                activeResidents = activeResidents.Count,
                totalActiveResidents = activeResidents.Count,
                totalSupporters,
                totalDonations,
                totalDonationCount,
                donationsYtd,
                orgRetentionEstimate,
                openIncidents,
                incidentsThisWeek,
                highRiskResidents,
                reintegrationCount = completedReintegrations,
                reintegrationSuccessRate,
                riskDistribution,
                reintegrationBreakdown,
                donationTrend,
                donationByChannel,
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

    private static string NormalizeReintegrationReportLabel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "Not Started";
        }

        var normalized = value.Trim().Replace("_", " ").ToLowerInvariant();
        return normalized switch
        {
            "on hold" => "On Hold",
            "in progress" => "In Progress",
            "completed" => "Completed",
            _ => "Not Started"
        };
    }
}
