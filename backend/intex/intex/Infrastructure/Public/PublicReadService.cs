using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Public.Contracts;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Intex.Infrastructure.Public;

public sealed class PublicReadService(BeaconDbContext dbContext, IMemoryCache memoryCache)
{
    private static readonly string[] DonationTypesIncludedInPublicImpact = ["monetary", "recurring", "grant"];
    private const string PublicImpactCacheKey = "public-impact-summary";

    public async Task<PublicImpactSummaryResponse> GetPublicImpactAsync(CancellationToken cancellationToken)
    {
        if (memoryCache.TryGetValue<PublicImpactSummaryResponse>(PublicImpactCacheKey, out var cachedResponse)
            && cachedResponse is not null)
        {
            return cachedResponse;
        }

        var residentStats = await dbContext.Residents
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(group => new
            {
                ResidentsServedTotal = group.Count(),
                ActiveResidents = group.Count(x => x.CaseStatus == "active"),
                ReintegrationCount = group.Count(x => x.ReintegrationStatus == "completed")
            })
            .SingleOrDefaultAsync(cancellationToken);

        var residentsServedTotal = residentStats?.ResidentsServedTotal ?? 0;
        var activeResidents = residentStats?.ActiveResidents ?? 0;
        var donorsCount = await dbContext.Supporters.CountAsync(cancellationToken);
        var totalDonationsRaised = (await dbContext.Donations
            .Where(x => DonationTypesIncludedInPublicImpact.Contains(x.DonationType))
            .SumAsync(x => x.Amount, cancellationToken)) ?? 0m;
        var reintegrationCount = residentStats?.ReintegrationCount ?? 0;
        var safehouseCount = await dbContext.Safehouses
            .CountAsync(x => x.Status == "active", cancellationToken);

        var programAreas = await dbContext.Safehouses
            .AsNoTracking()
            .Select(x => x.ProgramAreas)
            .ToListAsync(cancellationToken);

        var programAreasActive = programAreas
            .SelectMany(x => x)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();

        var recentSnapshots = await dbContext.ImpactSnapshots
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.PublishedAt)
            .ThenByDescending(x => x.CreatedAt)
            .Take(3)
            .Select(x => MapImpactSnapshotResponse(x))
            .ToListAsync(cancellationToken);

        var response = new PublicImpactSummaryResponse
        {
            ResidentsServedTotal = residentsServedTotal,
            TotalDonationsRaised = totalDonationsRaised,
            ReintegrationCount = reintegrationCount,
            SafehouseCount = safehouseCount,
            ProgramAreasActive = programAreasActive,
            RecentSnapshots = recentSnapshots,
            Milestones =
            [
                new PublicImpactMilestoneResponse(
                    "Residents Served",
                    $"{residentsServedTotal}+",
                    "Girls and young women who have found safety, care, and support through Beacon."),
                new PublicImpactMilestoneResponse(
                    "Reintegrations",
                    reintegrationCount.ToString(),
                    "Residents successfully reintegrated into safer family or community environments."),
                new PublicImpactMilestoneResponse(
                    "Partner Organizations",
                    "12+",
                    "Trusted partners helping Beacon expand care, recovery, and long-term opportunity.")
            ],
            TotalResidentsServed = residentsServedTotal,
            TotalFundsRaised = totalDonationsRaised,
            ActiveResidents = activeResidents,
            DonorsCount = donorsCount
        };

        memoryCache.Set(
            PublicImpactCacheKey,
            response,
            new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });

        return response;
    }

    public async Task<PaginatedListEnvelope<ImpactSnapshotResponse>> ListPublishedImpactSnapshotsAsync(
        PaginationRequest pagination,
        CancellationToken cancellationToken)
    {
        var query = dbContext.ImpactSnapshots
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.PublishedAt)
            .ThenByDescending(x => x.CreatedAt);

        var total = await query.CountAsync(cancellationToken);

        var data = await query
            .Skip((pagination.Page - 1) * pagination.Limit)
            .Take(pagination.Limit)
            .Select(x => MapImpactSnapshotResponse(x))
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<ImpactSnapshotResponse> GetPublishedImpactSnapshotByIdAsync(int id, CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.ImpactSnapshots
            .AsNoTracking()
            .Where(x => x.Id == id && x.IsPublished)
            .Select(x => MapImpactSnapshotResponse(x))
            .SingleOrDefaultAsync(cancellationToken);

        return snapshot ?? throw new ApiException(StatusCodes.Status404NotFound, "Impact snapshot not found");
    }

    private static ImpactSnapshotResponse MapImpactSnapshotResponse(ImpactSnapshot snapshot)
    {
        return new ImpactSnapshotResponse
        {
            Id = snapshot.Id,
            Title = snapshot.Title,
            Period = snapshot.Period,
            Summary = snapshot.Summary,
            Content = null,
            ResidentsServed = snapshot.ResidentsServed,
            TotalDonationsAmount = snapshot.TotalDonationsAmount,
            ProgramOutcomes = snapshot.ProgramOutcomes,
            SafehousesCovered = snapshot.SafehousesCovered,
            ReintegrationCount = snapshot.ReintegrationCount,
            IsPublished = snapshot.IsPublished,
            PublishedAt = snapshot.PublishedAt,
            CreatedAt = snapshot.CreatedAt
        };
    }
}
