using System.Text.Json;
using System.Text.Json.Serialization;
using backend.intex.DTOs.Common;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.SuperAdminOnly)]
[Route("superadmin")]
public sealed class SuperAdminMlController(BeaconDbContext dbContext) : ApiControllerBase
{
    [HttpGet("overview/action-queue")]
    public async Task<IActionResult> GetActionQueue(CancellationToken cancellationToken)
    {
        var atRiskCount = await dbContext.Supporters.AsNoTracking()
            .CountAsync(item => item.ChurnBand != null && (EF.Functions.ILike(item.ChurnBand, "high") || EF.Functions.ILike(item.ChurnBand, "critical")), cancellationToken);

        var atRiskDonors = await dbContext.Supporters.AsNoTracking()
            .Where(item => item.ChurnBand != null && (EF.Functions.ILike(item.ChurnBand, "high") || EF.Functions.ILike(item.ChurnBand, "critical")))
            .OrderByDescending(item => item.ChurnRiskScore ?? 0d)
            .Take(3)
            .Select(item => new
            {
                supporterId = item.SupporterId,
                displayName = item.DisplayName ?? item.OrganizationName ?? $"{item.FirstName} {item.LastName}".Trim(),
                churnBand = item.ChurnBand
            })
            .ToListAsync(cancellationToken);

        var regressionCount = await dbContext.Residents.AsNoTracking()
            .CountAsync(item => item.RegressionRiskBand != null && (EF.Functions.ILike(item.RegressionRiskBand, "critical") || EF.Functions.ILike(item.RegressionRiskBand, "high")), cancellationToken);

        var safehouseRisk = await (from metric in dbContext.SafehouseMonthlyMetrics.AsNoTracking()
                                   join safehouse in dbContext.Safehouses.AsNoTracking() on metric.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                                   from safehouse in safehouseGroup.DefaultIfEmpty()
                                   where metric.HealthBand != null && (EF.Functions.ILike(metric.HealthBand, "at-risk") || EF.Functions.ILike(metric.HealthBand, "critical"))
                                   select safehouse.Name ?? $"Safehouse-{metric.SafehouseId}")
            .Distinct()
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = new
            {
                churnAlert = new { atRiskCount, topThree = atRiskDonors },
                regressionAlert = new { criticalOrHighCount = regressionCount },
                safehouseAlert = new { atRiskOrCriticalCount = safehouseRisk.Count, safehouseNames = safehouseRisk }
            }
        });
    }

    [HttpGet("overview/funding-gap")]
    public async Task<IActionResult> GetFundingGap(CancellationToken cancellationToken)
    {
        var latest = await dbContext.PublicImpactSnapshots.AsNoTracking()
            .OrderByDescending(item => item.SnapshotDate)
            .ThenByDescending(item => item.SnapshotId)
            .FirstOrDefaultAsync(cancellationToken);

        var sparkline = await dbContext.Donations.AsNoTracking()
            .Where(item => item.DonationDate.HasValue)
            .GroupBy(item => new { Year = item.DonationDate!.Value.Year, Month = item.DonationDate!.Value.Month })
            .OrderBy(group => group.Key.Year).ThenBy(group => group.Key.Month)
            .Select(group => new
            {
                month = $"{group.Key.Year:D4}-{group.Key.Month:D2}",
                totalDonationsPhp = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2).ToString("0.00")
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = new
            {
                latestSnapshot = latest is null ? null : new
                {
                    projectedGapPhp30d = (latest.ProjectedGapPhp30d ?? 0m).ToString("0.00"),
                    fundingGapBand = latest.FundingGapBand ?? "unknown",
                    fundingGapUpdatedAt = latest.FundingGapUpdatedAt?.ToString("O"),
                    snapshotDate = latest.SnapshotDate?.ToString("yyyy-MM-dd")
                },
                sparkline
            }
        });
    }

    [HttpGet("overview/safehouse-health-mini")]
    public async Task<IActionResult> GetSafehouseHealthMini(CancellationToken cancellationToken)
    {
        var rows = await (from metric in dbContext.SafehouseMonthlyMetrics.AsNoTracking()
                          join safehouse in dbContext.Safehouses.AsNoTracking() on metric.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                          from safehouse in safehouseGroup.DefaultIfEmpty()
                          orderby metric.MonthStart descending, metric.MetricId descending
                          select new
                          {
                              safehouseId = metric.SafehouseId ?? 0,
                              safehouseName = safehouse.Name ?? $"Safehouse-{metric.SafehouseId}",
                              compositeHealthScore = metric.CompositeHealthScore,
                              peerRank = metric.PeerRank,
                              healthBand = metric.HealthBand,
                              trendDirection = metric.TrendDirection,
                              metricMonth = metric.MonthStart.HasValue ? metric.MonthStart.Value.ToString("yyyy-MM-dd") : null
                          })
            .Take(20)
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpGet("donors/churn")]
    public async Task<IActionResult> GetDonorChurn([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize, 1, 2000);

        var query = dbContext.Supporters.AsNoTracking().Where(item => item.ChurnRiskScore.HasValue);
        var total = await query.CountAsync(cancellationToken);
        var totalAtRisk = await query.CountAsync(item => item.ChurnBand != null && (EF.Functions.ILike(item.ChurnBand, "high") || EF.Functions.ILike(item.ChurnBand, "critical")), cancellationToken);

        var rows = await query
            .OrderByDescending(item => item.ChurnRiskScore)
            .ThenBy(item => item.SupporterId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                supporterId = item.SupporterId,
                displayName = item.DisplayName ?? item.OrganizationName ?? $"{item.FirstName} {item.LastName}".Trim(),
                email = item.Email ?? string.Empty,
                totalDonationsPhp = dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Sum(d => (decimal?)d.Amount).GetValueOrDefault().ToString("0.00"),
                lastDonationDate = dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Max(d => (DateOnly?)d.DonationDate).HasValue
                    ? dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Max(d => (DateOnly?)d.DonationDate)!.Value.ToString("yyyy-MM-dd")
                    : null,
                daysSinceLastDonation = dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Max(d => (DateOnly?)d.DonationDate).HasValue
                    ? (int?)(DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Max(d => (DateOnly?)d.DonationDate)!.Value.DayNumber)
                    : null,
                churnRiskScore = item.ChurnRiskScore,
                churnBand = item.ChurnBand,
                churnTopDrivers = item.ChurnTopDrivers != null ? item.ChurnTopDrivers.RootElement : (object?)null,
                churnRecommendedAction = item.ChurnRecommendedAction,
                churnScoreUpdatedAt = item.ChurnScoreUpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = rows,
            meta = new
            {
                page = resolvedPage,
                pageSize = resolvedPageSize,
                total,
                totalAtRisk,
                totalRestricted = 0
            }
        });
    }

    [HttpGet("donors/{supporterId:long}/donations-recent")]
    public async Task<IActionResult> GetRecentDonations(long supporterId, CancellationToken cancellationToken)
    {
        var rows = await (from donation in dbContext.Donations.AsNoTracking()
                          join campaign in dbContext.Campaigns.AsNoTracking() on donation.CampaignName equals campaign.Title into campaignGroup
                          from campaign in campaignGroup.DefaultIfEmpty()
                          where donation.SupporterId == supporterId
                          orderby donation.DonationDate descending, donation.DonationId descending
                          select new
                          {
                              donationId = donation.DonationId,
                              amount = decimal.Round(donation.Amount ?? 0m, 2).ToString("0.00"),
                              donationDate = donation.DonationDate.HasValue ? donation.DonationDate.Value.ToString("yyyy-MM-dd") : null,
                              channel = donation.ChannelSource,
                              campaignTitle = campaign.Title,
                              attributedOutcomeScore = (double?)null
                          })
            .Take(20)
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpPatch("donors/{id:long}")]
    public async Task<IActionResult> PatchDonor(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Supporters.FirstOrDefaultAsync(item => item.SupporterId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        EntityJsonMerge.ApplyMergedValues(dbContext, entity, request.Fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { supporterId = id });
    }

    [HttpGet("donors/upgrade")]
    public async Task<IActionResult> GetDonorUpgrade([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize, 1, 2000);
        var query = dbContext.Supporters.AsNoTracking().Where(item => item.UpgradeLikelihoodScore.HasValue);
        var total = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(item => item.UpgradeLikelihoodScore)
            .ThenBy(item => item.SupporterId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                supporterId = item.SupporterId,
                displayName = item.DisplayName ?? item.OrganizationName ?? $"{item.FirstName} {item.LastName}".Trim(),
                email = item.Email ?? string.Empty,
                totalDonationsPhp = dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Sum(d => (decimal?)d.Amount).GetValueOrDefault().ToString("0.00"),
                avgDonationPhp = dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Average(d => (decimal?)d.Amount).GetValueOrDefault().ToString("0.00"),
                lastDonationDate = dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Max(d => (DateOnly?)d.DonationDate).HasValue
                    ? dbContext.Donations.Where(d => d.SupporterId == item.SupporterId).Max(d => (DateOnly?)d.DonationDate)!.Value.ToString("yyyy-MM-dd")
                    : null,
                upgradeLikelihoodScore = item.UpgradeLikelihoodScore,
                upgradeBand = item.UpgradeBand,
                upgradeTopDrivers = item.UpgradeTopDrivers != null ? item.UpgradeTopDrivers.RootElement : (object?)null,
                upgradeRecommendedAskBand = item.UpgradeRecommendedAskBand,
                upgradeScoreUpdatedAt = item.UpgradeScoreUpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = rows,
            meta = new { page = resolvedPage, pageSize = resolvedPageSize, total }
        });
    }

    [HttpGet("attribution/sankey")]
    public async Task<IActionResult> GetAttributionSankey(CancellationToken cancellationToken)
    {
        var nodes = new List<object>
        {
            new { id = "channel:unknown", label = "Unknown", type = "channel" }
        };
        var links = await dbContext.Donations.AsNoTracking()
            .GroupBy(item => new { Channel = item.ChannelSource ?? "Unknown", Campaign = item.CampaignName ?? "Unassigned" })
            .Select(group => new
            {
                source = $"channel:{group.Key.Channel}",
                target = $"campaign:{group.Key.Campaign}",
                value = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2),
                avgOutcomeScore = (double?)null
            })
            .ToListAsync(cancellationToken);

        nodes.AddRange(links.Select(item => new { id = item.source, label = item.source.Replace("channel:", string.Empty), type = "channel" }).Distinct());
        nodes.AddRange(links.Select(item => new { id = item.target, label = item.target.Replace("campaign:", string.Empty), type = "campaign" }).Distinct());

        return Ok(new { data = new { nodes, links } });
    }

    [HttpGet("attribution/programs")]
    public async Task<IActionResult> GetAttributionPrograms(CancellationToken cancellationToken)
    {
        var rows = await dbContext.DonationAllocations.AsNoTracking()
            .GroupBy(item => item.ProgramArea ?? "Unspecified")
            .Select(group => new
            {
                programArea = group.Key,
                totalAllocatedPhp = decimal.Round(group.Sum(item => item.AmountAllocated ?? 0m), 2).ToString("0.00"),
                avgAttributedOutcomeScore = (double?)null,
                safehouseCount = group.Select(item => item.SafehouseId).Distinct().Count(),
                healthScoreDelta = (double?)null,
                educationProgressDelta = (double?)null
            })
            .OrderByDescending(item => item.safehouseCount)
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpGet("attribution/export")]
    public async Task<IActionResult> ExportAttribution([FromQuery] string? dateRange = null, CancellationToken cancellationToken = default)
    {
        var rows = await dbContext.Donations.AsNoTracking()
            .GroupBy(item => new { Channel = item.ChannelSource ?? "Unknown", Campaign = item.CampaignName ?? "Unassigned" })
            .Select(group => new
            {
                channel = group.Key.Channel,
                campaign = group.Key.Campaign,
                total = decimal.Round(group.Sum(item => item.Amount ?? 0m), 2)
            })
            .OrderByDescending(item => item.total)
            .ToListAsync(cancellationToken);

        var csvLines = new List<string> { "channel,campaign,total,dateRange" };
        csvLines.AddRange(rows.Select(item =>
            $"{EscapeCsv(item.channel)},{EscapeCsv(item.campaign)},{item.total:0.00},{EscapeCsv(dateRange ?? string.Empty)}"));

        var content = string.Join('\n', csvLines);
        return File(System.Text.Encoding.UTF8.GetBytes(content), "text/csv", "attribution-export.csv");
    }

    [HttpGet("campaigns/effectiveness")]
    public async Task<IActionResult> GetCampaignEffectiveness(CancellationToken cancellationToken)
    {
        var rows = await dbContext.Campaigns.AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Select(campaign => new
            {
                campaignId = campaign.CampaignId,
                title = campaign.Title,
                category = campaign.Category ?? string.Empty,
                status = campaign.Status ?? string.Empty,
                goal = (campaign.Goal ?? 0m).ToString("0.00"),
                totalRaisedPhp = dbContext.Donations.Where(d => d.CampaignName == campaign.Title).Sum(d => (decimal?)d.Amount).GetValueOrDefault().ToString("0.00"),
                uniqueDonors = dbContext.Donations.Where(d => d.CampaignName == campaign.Title).Select(d => d.SupporterId).Distinct().Count(),
                avgEngagementRate = dbContext.SocialMediaPosts.Where(p => p.CampaignName == campaign.Title).Average(p => (double?)p.EngagementRate),
                totalImpressions = dbContext.SocialMediaPosts.Where(p => p.CampaignName == campaign.Title).Sum(p => (int?)p.Impressions),
                conversionRatio = (double?)null,
                classificationBand = (string?)null,
                recommendedReplicate = (bool?)null,
                deadline = campaign.Deadline.HasValue ? campaign.Deadline.Value.ToString("yyyy-MM-dd") : null
            })
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpPatch("campaigns/{id:long}/ml-flags")]
    public IActionResult PatchCampaignMlFlags(long id) => Ok(new { campaignId = id });

    [HttpGet("social/heatmap")]
    public async Task<IActionResult> GetSocialHeatmap(CancellationToken cancellationToken)
    {
        var cells = await dbContext.SocialMediaPosts.AsNoTracking()
            .GroupBy(item => new { Day = item.DayOfWeek ?? "Unknown", Hour = item.PostHour ?? 0 })
            .Select(group => new
            {
                dayOfWeek = group.Key.Day,
                postHour = group.Key.Hour,
                avgDonationReferrals = group.Average(item => (double?)(item.DonationReferrals ?? 0)) ?? 0d,
                postCount = group.Count()
            })
            .ToListAsync(cancellationToken);

        return Ok(new { data = new { cells, minimumPostsForCell = 1 } });
    }

    [HttpGet("social/recommendation")]
    public async Task<IActionResult> GetSocialRecommendation(CancellationToken cancellationToken)
    {
        var item = await dbContext.SocialMediaPosts.AsNoTracking()
            .OrderByDescending(post => post.ConversionPredictionScore ?? 0d)
            .ThenByDescending(post => post.PostId)
            .Select(post => new
            {
                postId = post.PostId,
                caption = post.Caption,
                platform = post.Platform,
                mediaType = post.MediaType,
                contentTopic = post.ContentTopic,
                conversionPredictionScore = post.ConversionPredictionScore,
                conversionBand = post.ConversionBand,
                predictedReferralCount = post.PredictedReferralCount,
                predictedDonationValuePhp = post.PredictedDonationValuePhp.HasValue ? decimal.Round(post.PredictedDonationValuePhp.Value, 2).ToString("0.00") : null,
                postedAt = post.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(new { data = item });
    }

    [HttpGet("social/posts")]
    public async Task<IActionResult> GetSocialPosts([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize, 1, 2000);
        var query = dbContext.SocialMediaPosts.AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.PostId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                postId = item.PostId,
                caption = item.Caption,
                platform = item.Platform,
                mediaType = item.MediaType,
                postType = item.PostType,
                contentTopic = item.ContentTopic,
                isBoosted = item.IsBoosted,
                postedAt = item.CreatedAt,
                impressions = item.Impressions,
                engagementRate = item.EngagementRate,
                donationReferrals = item.DonationReferrals,
                conversionPredictionScore = item.ConversionPredictionScore,
                conversionBand = item.ConversionBand,
                predictedReferralCount = item.PredictedReferralCount,
                predictedDonationValuePhp = item.PredictedDonationValuePhp.HasValue ? decimal.Round(item.PredictedDonationValuePhp.Value, 2).ToString("0.00") : null,
                predictedVsActualDelta = (double?)null,
                conversionTopDrivers = item.ConversionTopDrivers != null ? item.ConversionTopDrivers.RootElement : (object?)null,
                conversionComparablePostIds = item.ConversionComparablePostIds != null ? item.ConversionComparablePostIds.RootElement : (object?)null,
                conversionScoreUpdatedAt = item.ConversionScoreUpdatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            data = rows,
            meta = new { page = resolvedPage, pageSize = resolvedPageSize, total }
        });
    }

    [HttpGet("residents/regression/distribution")]
    public async Task<IActionResult> GetRegressionDistribution(CancellationToken cancellationToken)
    {
        var rows = await (from resident in dbContext.Residents.AsNoTracking()
                          join safehouse in dbContext.Safehouses.AsNoTracking() on resident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                          from safehouse in safehouseGroup.DefaultIfEmpty()
                          group resident by new { resident.SafehouseId, SafehouseName = safehouse.Name } into grouped
                          select new
                          {
                              safehouseId = grouped.Key.SafehouseId ?? 0,
                              safehouseName = grouped.Key.SafehouseName ?? $"Safehouse-{grouped.Key.SafehouseId}",
                              bands = new
                              {
                                  critical = grouped.Count(item => item.RegressionRiskBand != null && EF.Functions.ILike(item.RegressionRiskBand, "critical")),
                                  high = grouped.Count(item => item.RegressionRiskBand != null && EF.Functions.ILike(item.RegressionRiskBand, "high")),
                                  moderate = grouped.Count(item => item.RegressionRiskBand != null && EF.Functions.ILike(item.RegressionRiskBand, "moderate")),
                                  low = grouped.Count(item => item.RegressionRiskBand != null && EF.Functions.ILike(item.RegressionRiskBand, "low")),
                                  stable = grouped.Count(item => item.RegressionRiskBand != null && EF.Functions.ILike(item.RegressionRiskBand, "stable"))
                              },
                              totalScored = grouped.Count(item => item.RegressionRiskScore.HasValue),
                              totalRestricted = grouped.Count(item => item.MlScoresRestricted == true)
                          })
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows, meta = new { totalRestricted = rows.Sum(item => item.totalRestricted) } });
    }

    [HttpGet("residents/regression/watchlist")]
    public async Task<IActionResult> GetRegressionWatchlist([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize, 1, 2000);
        var query = from resident in dbContext.Residents.AsNoTracking()
                    join safehouse in dbContext.Safehouses.AsNoTracking() on resident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                    from safehouse in safehouseGroup.DefaultIfEmpty()
                    where resident.RegressionRiskScore.HasValue
                    select new
                    {
                        resident.ResidentId,
                        CaseCode = resident.CaseControlNo ?? resident.InternalCode ?? $"CASE-{resident.ResidentId}",
                        resident.CaseCategory,
                        SafehouseName = safehouse.Name,
                        resident.RegressionRiskScore,
                        resident.RegressionRiskBand,
                        RegressionRiskDrivers = resident.RegressionRiskDrivers != null ? resident.RegressionRiskDrivers.RootElement : (object?)null,
                        resident.RegressionRecommendedAction,
                        resident.RegressionScoreUpdatedAt
                    };
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(item => item.RegressionRiskScore).ThenBy(item => item.ResidentId)
            .Skip((resolvedPage - 1) * resolvedPageSize).Take(resolvedPageSize)
            .Select(item => new
            {
                residentId = item.ResidentId,
                caseCode = item.CaseCode,
                caseCategory = item.CaseCategory,
                safehouseName = item.SafehouseName,
                regressionRiskScore = item.RegressionRiskScore,
                regressionRiskBand = item.RegressionRiskBand,
                regressionRiskDrivers = item.RegressionRiskDrivers,
                regressionRecommendedAction = item.RegressionRecommendedAction,
                regressionScoreUpdatedAt = item.RegressionScoreUpdatedAt,
                topDriverLabel = (string?)null
            })
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows, meta = new { page = resolvedPage, pageSize = resolvedPageSize, total, totalRestricted = 0 } });
    }

    [HttpPatch("residents/{id:long}")]
    public async Task<IActionResult> PatchResident(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Residents.FirstOrDefaultAsync(item => item.ResidentId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        EntityJsonMerge.ApplyMergedValues(dbContext, entity, request.Fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { residentId = id });
    }

    [HttpGet("residents/reintegration/funnel")]
    public async Task<IActionResult> GetReintegrationFunnel(CancellationToken cancellationToken)
    {
        var residents = dbContext.Residents.AsNoTracking();
        var stages = new[]
        {
            new { stage = "not_started", count = await residents.CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "not started"), cancellationToken), label = "Not Started" },
            new { stage = "in_progress", count = await residents.CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "in progress"), cancellationToken), label = "In Progress" },
            new { stage = "ready", count = await residents.CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "ready"), cancellationToken), label = "Ready" },
            new { stage = "completed", count = await residents.CountAsync(item => item.ReintegrationStatus != null && EF.Functions.ILike(item.ReintegrationStatus, "completed"), cancellationToken), label = "Completed" }
        };
        return Ok(new { data = new { stages, totalRestricted = 0 } });
    }

    [HttpGet("residents/reintegration/table")]
    public async Task<IActionResult> GetReintegrationTable([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize, 1, 2000);
        var query = from resident in dbContext.Residents.AsNoTracking()
                    join safehouse in dbContext.Safehouses.AsNoTracking() on resident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                    from safehouse in safehouseGroup.DefaultIfEmpty()
                    select new
                    {
                        resident.ResidentId,
                        CaseCode = resident.CaseControlNo ?? resident.InternalCode ?? $"CASE-{resident.ResidentId}",
                        resident.CaseCategory,
                        SafehouseName = safehouse.Name,
                        resident.ReintegrationStatus,
                        resident.ReintegrationReadinessScore,
                        resident.ReintegrationReadinessBand,
                        ReintegrationReadinessDrivers = resident.ReintegrationReadinessDrivers != null ? resident.ReintegrationReadinessDrivers.RootElement : (object?)null,
                        resident.ReintegrationRecommendedAction,
                        resident.ReintegrationScoreUpdatedAt,
                        resident.RegressionRiskBand,
                        resident.LengthOfStay
                    };
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(item => item.ReintegrationReadinessScore).ThenBy(item => item.ResidentId)
            .Skip((resolvedPage - 1) * resolvedPageSize).Take(resolvedPageSize)
            .ToListAsync(cancellationToken);

        var data = rows.Select(item =>
        {
            var topPositiveIndicator = ExtractDriverLabel(item.ReintegrationReadinessDrivers as JsonElement?, "positive");
            var topBarrier = ExtractDriverLabel(item.ReintegrationReadinessDrivers as JsonElement?, "barriers");
            var readinessScore = item.ReintegrationReadinessScore ?? DeriveReadinessScore(item.ReintegrationStatus);
            var readinessBand = item.ReintegrationReadinessBand ?? DeriveReadinessBand(item.ReintegrationStatus);

            return new
            {
                residentId = item.ResidentId,
                caseCode = item.CaseCode,
                caseCategory = item.CaseCategory,
                safehouseName = item.SafehouseName,
                reintegrationStatus = item.ReintegrationStatus,
                reintegrationReadinessScore = readinessScore,
                reintegrationReadinessBand = readinessBand,
                reintegrationReadinessDrivers = item.ReintegrationReadinessDrivers,
                reintegrationRecommendedAction = item.ReintegrationRecommendedAction,
                reintegrationScoreUpdatedAt = item.ReintegrationScoreUpdatedAt,
                topPositiveIndicator,
                topBarrier,
                regressionRiskBand = item.RegressionRiskBand,
                lengthOfStayDays = ParseLengthOfStayDays(item.LengthOfStay)
            };
        }).ToList();

        return Ok(new { data, meta = new { page = resolvedPage, pageSize = resolvedPageSize, total, totalRestricted = 0 } });
    }

    [HttpGet("interventions/effectiveness")]
    public async Task<IActionResult> GetInterventionEffectiveness(CancellationToken cancellationToken)
    {
        var plans = await dbContext.InterventionPlans.AsNoTracking()
            .Where(item => item.Status != null && EF.Functions.ILike(item.Status, "completed"))
            .Where(item => item.EffectivenessOutcomeScore != null)
            .Select(item => new
            {
                planCategory = item.PlanCategory ?? "Uncategorized",
                effectivenessOutcomeScore = item.EffectivenessOutcomeScore,
                effectivenessBand = item.EffectivenessBand,
                effectivenessOutcomeDrivers = item.EffectivenessOutcomeDrivers != null
                    ? item.EffectivenessOutcomeDrivers.RootElement
                    : (JsonElement?)null
            })
            .ToListAsync(cancellationToken);

        var data = plans
            .GroupBy(item => item.planCategory)
            .Select(group =>
            {
                var healthDeltas = new List<double>();
                var educationDeltas = new List<double>();
                var sessionDeltas = new List<double>();

                foreach (var plan in group)
                {
                    CollectInterventionDriverDeltas(plan.effectivenessOutcomeDrivers, healthDeltas, educationDeltas, sessionDeltas);
                }

                return new
                {
                    planCategory = group.Key,
                    planCount = group.Count(),
                    avgEffectivenessScore = group.Average(item => item.effectivenessOutcomeScore),
                    avgHealthScoreDelta = healthDeltas.Count > 0 ? Math.Round(healthDeltas.Average(), 2) : (double?)null,
                    avgEducationProgressDelta = educationDeltas.Count > 0 ? Math.Round(educationDeltas.Average(), 2) : (double?)null,
                    avgSessionProgressRate = sessionDeltas.Count > 0 ? Math.Round(sessionDeltas.Average(), 4) : (double?)null,
                    effectivenessBandDistribution = new Dictionary<string, int>
                    {
                        ["high-impact"] = group.Count(item => item.effectivenessBand != null && item.effectivenessBand.Equals("high-impact", StringComparison.OrdinalIgnoreCase)),
                        ["moderate"] = group.Count(item => item.effectivenessBand != null && item.effectivenessBand.Equals("moderate", StringComparison.OrdinalIgnoreCase)),
                        ["low-impact"] = group.Count(item => item.effectivenessBand != null && item.effectivenessBand.Equals("low-impact", StringComparison.OrdinalIgnoreCase)),
                        ["insufficient-data"] = group.Count(item => string.IsNullOrWhiteSpace(item.effectivenessBand) || item.effectivenessBand.Equals("insufficient-data", StringComparison.OrdinalIgnoreCase))
                    }
                };
            })
            .OrderByDescending(item => item.avgEffectivenessScore ?? -1)
            .ThenBy(item => item.planCategory)
            .ToList();

        return Ok(new { data });
    }

    [HttpGet("interventions/effectiveness/{category}/plans")]
    public async Task<IActionResult> GetInterventionPlansByCategory(string category, CancellationToken cancellationToken)
    {
        var rows = await (from plan in dbContext.InterventionPlans.AsNoTracking()
                          join resident in dbContext.Residents.AsNoTracking() on plan.ResidentId equals (long?)resident.ResidentId into residentGroup
                          from resident in residentGroup.DefaultIfEmpty()
                          join safehouse in dbContext.Safehouses.AsNoTracking() on resident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                          from safehouse in safehouseGroup.DefaultIfEmpty()
                          where plan.PlanCategory != null && EF.Functions.ILike(plan.PlanCategory, category)
                          select new
                          {
                              planId = plan.PlanId,
                              planCategory = plan.PlanCategory,
                              safehouseName = safehouse.Name,
                              status = plan.Status ?? string.Empty,
                              startDate = plan.CreatedAt,
                              endDate = plan.TargetDate.HasValue ? plan.TargetDate.Value.ToString("yyyy-MM-dd") : null,
                              effectivenessOutcomeScore = plan.EffectivenessOutcomeScore,
                              effectivenessBand = plan.EffectivenessBand,
                              effectivenessOutcomeDrivers = plan.EffectivenessOutcomeDrivers != null ? plan.EffectivenessOutcomeDrivers.RootElement : (object?)null,
                              effectivenessScoreUpdatedAt = plan.EffectivenessScoreUpdatedAt
                          })
            .ToListAsync(cancellationToken);
        return Ok(new { data = rows });
    }

    [HttpGet("safehouses/health")]
    public async Task<IActionResult> GetSafehouseHealth([FromQuery] string? monthStart = null, CancellationToken cancellationToken = default)
    {
        var query = from metric in dbContext.SafehouseMonthlyMetrics.AsNoTracking()
                    join safehouse in dbContext.Safehouses.AsNoTracking() on metric.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                    from safehouse in safehouseGroup.DefaultIfEmpty()
                    select new { metric, safehouse };

        var hasMonthFilter = DateOnly.TryParse(monthStart, out var parsedMonth);

        if (hasMonthFilter)
        {
            query = query.Where(item => item.metric.MonthStart == parsedMonth);
        }

        var rows = await query
            .Select(item => new
            {
                metricId = item.metric.MetricId,
                monthStart = item.metric.MonthStart,
                safehouseId = item.metric.SafehouseId ?? 0,
                safehouseName = item.safehouse.Name ?? $"Safehouse-{item.metric.SafehouseId}",
                region = item.safehouse.Region,
                compositeHealthScore = item.metric.CompositeHealthScore,
                peerRank = item.metric.PeerRank,
                healthBand = item.metric.HealthBand,
                trendDirection = item.metric.TrendDirection,
                healthScoreDrivers = item.metric.HealthScoreDrivers != null ? item.metric.HealthScoreDrivers.RootElement : (object?)null,
                incidentSeverityDistribution = item.metric.IncidentSeverityDistribution != null ? item.metric.IncidentSeverityDistribution.RootElement : (object?)null,
                healthScoreComputedAt = item.metric.HealthScoreComputedAt,
                metricMonth = item.metric.MonthStart.HasValue ? item.metric.MonthStart.Value.ToString("yyyy-MM-dd") : null
            })
            .ToListAsync(cancellationToken);

        if (!hasMonthFilter)
        {
            rows = rows
                .GroupBy(item => item.safehouseId)
                .Select(group => group
                    .OrderByDescending(item => item.monthStart)
                    .ThenByDescending(item => item.metricId)
                    .First())
                .ToList();
        }

        var orderedRows = rows
            .OrderByDescending(item => item.monthStart)
            .ThenBy(item => item.safehouseName)
            .Select(item => new
            {
                item.safehouseId,
                item.safehouseName,
                item.region,
                item.compositeHealthScore,
                item.peerRank,
                item.healthBand,
                item.trendDirection,
                item.healthScoreDrivers,
                item.incidentSeverityDistribution,
                item.healthScoreComputedAt,
                item.metricMonth
            })
            .ToList();

        return Ok(new { data = orderedRows });
    }

    [HttpGet("safehouses/{safehouseId:long}/health-history")]
    public async Task<IActionResult> GetSafehouseHealthHistory(long safehouseId, CancellationToken cancellationToken)
    {
        var rows = await dbContext.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(item => item.SafehouseId == safehouseId)
            .OrderByDescending(item => item.MonthStart)
            .Select(item => new
            {
                metricMonth = item.MonthStart.HasValue ? item.MonthStart.Value.ToString("yyyy-MM-dd") : string.Empty,
                compositeHealthScore = item.CompositeHealthScore,
                healthBand = item.HealthBand,
                trendDirection = item.TrendDirection,
                peerRank = item.PeerRank
            })
            .ToListAsync(cancellationToken);
        return Ok(new { data = rows });
    }

    [HttpGet("safehouses/health/compare")]
    public async Task<IActionResult> GetSafehouseHealthCompare([FromQuery] string? safehouseIds = null, CancellationToken cancellationToken = default)
    {
        var ids = ParseIds(safehouseIds);
        if (ids.Count == 0)
        {
            return Ok(new { data = Array.Empty<object>() });
        }

        var rows = await (from metric in dbContext.SafehouseMonthlyMetrics.AsNoTracking()
                          join safehouse in dbContext.Safehouses.AsNoTracking() on metric.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                          from safehouse in safehouseGroup.DefaultIfEmpty()
                          where metric.SafehouseId.HasValue && ids.Contains(metric.SafehouseId.Value)
                          orderby metric.MonthStart descending
                          select new
                          {
                              safehouseId = metric.SafehouseId ?? 0,
                              safehouseName = safehouse.Name ?? $"Safehouse-{metric.SafehouseId}",
                              region = safehouse.Region,
                              compositeHealthScore = metric.CompositeHealthScore,
                              peerRank = metric.PeerRank,
                              healthBand = metric.HealthBand,
                              trendDirection = metric.TrendDirection,
                              healthScoreDrivers = metric.HealthScoreDrivers != null ? metric.HealthScoreDrivers.RootElement : (object?)null,
                              incidentSeverityDistribution = metric.IncidentSeverityDistribution != null ? metric.IncidentSeverityDistribution.RootElement : (object?)null,
                              healthScoreComputedAt = metric.HealthScoreComputedAt,
                              metricMonth = metric.MonthStart.HasValue ? metric.MonthStart.Value.ToString("yyyy-MM-dd") : null
                          })
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpGet("ml/pipelines")]
    public async Task<IActionResult> GetMlPipelines(CancellationToken cancellationToken)
    {
        var rows = await dbContext.MlPipelineRuns.AsNoTracking()
            .OrderByDescending(item => item.TrainedAt)
            .GroupBy(item => item.PipelineName)
            .Select(group => group.First())
            .Select(item => new
            {
                pipelineName = item.PipelineName,
                displayName = item.DisplayName ?? item.PipelineName,
                lastRunId = item.RunId,
                lastRunAt = item.TrainedAt,
                lastRunStatus = item.Status,
                scoredEntityCount = item.ScoredEntityCount,
                avgScore = dbContext.MlPredictionSnapshots.Where(p => p.RunId == item.RunId).Average(p => (double?)p.PredictionScore),
                minScore = dbContext.MlPredictionSnapshots.Where(p => p.RunId == item.RunId).Min(p => (double?)p.PredictionScore),
                maxScore = dbContext.MlPredictionSnapshots.Where(p => p.RunId == item.RunId).Max(p => (double?)p.PredictionScore),
                totalSnapshots = dbContext.MlPredictionSnapshots.Count(p => p.PipelineName == item.PipelineName),
                freshness = item.TrainedAt >= DateTimeOffset.UtcNow.AddDays(-7) ? "ok" : "stale",
                daysSinceLastRun = (int?)(DateTimeOffset.UtcNow - item.TrainedAt).TotalDays,
                featureImportanceJson = item.FeatureImportanceJson != null ? item.FeatureImportanceJson.RootElement : (object?)null,
                latestRunId = item.RunId
            })
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpGet("ml/score-distribution")]
    public async Task<IActionResult> GetScoreDistribution([FromQuery] string pipelineName, CancellationToken cancellationToken)
    {
        var runId = await dbContext.MlPredictionSnapshots.AsNoTracking()
            .Where(item => item.PipelineName == pipelineName)
            .OrderByDescending(item => item.RunId)
            .Select(item => (long?)item.RunId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!runId.HasValue)
        {
            return Ok(new { data = (object?)null });
        }

        var buckets = await dbContext.MlPredictionSnapshots.AsNoTracking()
            .Where(item => item.RunId == runId.Value)
            .GroupBy(item => (int)Math.Floor(item.PredictionScore * 10))
            .Select(group => new { bucket = group.Key, count = group.Count() })
            .OrderBy(item => item.bucket)
            .ToListAsync(cancellationToken);

        return Ok(new { data = new { pipelineName, runId = runId.Value, buckets } });
    }

    [HttpGet("ml/band-distribution")]
    public async Task<IActionResult> GetBandDistribution([FromQuery] string pipelineName, CancellationToken cancellationToken)
    {
        var runId = await dbContext.MlPredictionSnapshots.AsNoTracking()
            .Where(item => item.PipelineName == pipelineName)
            .OrderByDescending(item => item.RunId)
            .Select(item => (long?)item.RunId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!runId.HasValue)
        {
            return Ok(new { data = (object?)null });
        }

        var bands = await dbContext.MlPredictionSnapshots.AsNoTracking()
            .Where(item => item.RunId == runId.Value)
            .GroupBy(item => item.BandLabel ?? "unknown")
            .Select(group => new { bandLabel = group.Key, count = group.Count() })
            .OrderByDescending(item => item.count)
            .ToListAsync(cancellationToken);

        return Ok(new { data = new { pipelineName, runId = runId.Value, bands } });
    }

    [HttpGet("ml/feature-importance/{runId:long}")]
    public async Task<IActionResult> GetFeatureImportance(long runId, CancellationToken cancellationToken)
    {
        var run = await dbContext.MlPipelineRuns.AsNoTracking().FirstOrDefaultAsync(item => item.RunId == runId, cancellationToken);
        if (run is null)
        {
            return Ok(new { data = (object?)null });
        }

        return Ok(new
        {
            data = new
            {
                runId = run.RunId,
                pipelineName = run.PipelineName,
                displayName = run.DisplayName ?? run.PipelineName,
                featureImportanceJson = run.FeatureImportanceJson != null ? run.FeatureImportanceJson.RootElement : JsonSerializer.SerializeToElement(Array.Empty<object>())
            }
        });
    }

    private static int? ParseLengthOfStayDays(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var digits = new string(value.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var result) ? result : null;
    }

    private static void CollectInterventionDriverDeltas(JsonElement? driversElement, List<double> healthDeltas, List<double> educationDeltas, List<double> sessionDeltas)
    {
        if (!driversElement.HasValue || driversElement.Value.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        foreach (var entry in driversElement.Value.EnumerateArray())
        {
            if (entry.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            if (!entry.TryGetProperty("dimension", out var dimensionElement) || dimensionElement.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            if (!entry.TryGetProperty("delta", out var deltaElement) || !deltaElement.TryGetDouble(out var delta))
            {
                continue;
            }

            var dimension = dimensionElement.GetString()?.Trim().ToLowerInvariant();
            switch (dimension)
            {
                case "health_score":
                    healthDeltas.Add(delta);
                    break;
                case "education_progress":
                    educationDeltas.Add(delta);
                    break;
                case "session_progress":
                    sessionDeltas.Add(delta);
                    break;
            }
        }
    }

    private static string? ExtractDriverLabel(JsonElement? drivers, string key)
    {
        if (!drivers.HasValue || drivers.Value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (!drivers.Value.TryGetProperty(key, out var values) || values.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var entry in values.EnumerateArray())
        {
            if (entry.ValueKind == JsonValueKind.Object && entry.TryGetProperty("label", out var label) && label.ValueKind == JsonValueKind.String)
            {
                var parsed = label.GetString();
                if (!string.IsNullOrWhiteSpace(parsed))
                {
                    return parsed;
                }
            }

            if (entry.ValueKind == JsonValueKind.String)
            {
                var parsed = entry.GetString();
                if (!string.IsNullOrWhiteSpace(parsed))
                {
                    return parsed;
                }
            }
        }

        return null;
    }

    private static double? DeriveReadinessScore(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        var normalized = status.Trim().ToLowerInvariant();
        return normalized switch
        {
            "completed" => 0.9,
            "ready" => 0.75,
            "in progress" => 0.55,
            "in-progress" => 0.55,
            "not started" => 0.25,
            "not-started" => 0.25,
            _ => null
        };
    }

    private static string? DeriveReadinessBand(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        var normalized = status.Trim().ToLowerInvariant();
        return normalized switch
        {
            "completed" => "ready",
            "ready" => "ready",
            "in progress" => "in-progress",
            "in-progress" => "in-progress",
            "not started" => "not-started",
            "not-started" => "not-started",
            _ => null
        };
    }

    private static IReadOnlyList<long> ParseIds(string? csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? []
            : csv.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                .Select(value => long.TryParse(value, out var parsed) ? (long?)parsed : null)
                .Where(value => value.HasValue)
                .Select(value => value!.Value)
                .Distinct()
                .ToList();

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
