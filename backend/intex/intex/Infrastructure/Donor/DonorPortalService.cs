using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Donor.Contracts;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Intex.Infrastructure.Donor;

public sealed class DonorPortalService(BeaconDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<DonationLedgerItemResponse> GetDonationByIdAsync(
        AuthenticatedUser authenticatedUser,
        string role,
        int donationId,
        CancellationToken cancellationToken)
    {
        var donation = await dbContext.Donations
            .AsNoTracking()
            .Where(x => x.Id == donationId)
            .Select(x => new DonationLedgerItemResponse
            {
                Id = x.Id,
                SupporterId = x.SupporterId,
                DonationType = x.DonationType,
                Amount = x.Amount,
                Currency = x.Currency,
                Campaign = x.Campaign,
                SafehouseId = x.SafehouseId,
                DonationDate = x.DonationDate,
                ReceiptUrl = x.ReceiptUrl,
                Status = null,
                Notes = x.Notes,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                SafehouseName = x.Safehouse != null ? x.Safehouse.Name : null,
                Category = null
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (donation is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Not found");
        }

        if (role == Intex.Infrastructure.Auth.AuthRoles.Donor && donation.SupporterId != authenticatedUser.SupporterId)
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "Insufficient permissions");
        }

        if (role is not Intex.Infrastructure.Auth.AuthRoles.Donor
            and not Intex.Infrastructure.Auth.AuthRoles.Staff
            and not Intex.Infrastructure.Auth.AuthRoles.Admin
            and not Intex.Infrastructure.Auth.AuthRoles.SuperAdmin)
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "Insufficient permissions");
        }

        return donation;
    }

    public async Task<DonorDashboardSummaryResponse> GetDonorDashboardSummaryAsync(
        AuthenticatedUser authenticatedUser,
        CancellationToken cancellationToken)
    {
        if (authenticatedUser.SupporterId is null)
        {
            return CreateZeroedDonorDashboardSummary();
        }

        var supporter = await dbContext.Supporters
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == authenticatedUser.SupporterId.Value, cancellationToken);

        if (supporter is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Supporter not found");
        }

        var donationsQuery = dbContext.Donations
            .AsNoTracking()
            .Where(x => x.SupporterId == supporter.Id);

        var numberOfGifts = await donationsQuery.CountAsync(cancellationToken);
        var campaignsSupported = await donationsQuery
            .Where(x => x.Campaign != null && x.Campaign != string.Empty)
            .Select(x => x.Campaign!)
            .Distinct()
            .CountAsync(cancellationToken);

        var givingTrendRows = await donationsQuery
            .Where(x => x.Amount != null)
            .GroupBy(x => x.DonationDate.Length >= 7 ? x.DonationDate.Substring(0, 7) : x.DonationDate)
            .Select(group => new
            {
                Period = group.Key,
                TotalAmount = group.Sum(x => x.Amount ?? 0m),
                DonationCount = group.Count()
            })
            .OrderByDescending(x => x.Period)
            .Take(12)
            .ToListAsync(cancellationToken);

        var allocationRows = await dbContext.DonationAllocations
            .AsNoTracking()
            .Where(x => x.Donation.SupporterId == supporter.Id)
            .GroupBy(x => x.ProgramArea)
            .Select(group => new
            {
                ProgramArea = group.Key,
                Amount = group.Sum(x => x.Amount)
            })
            .OrderByDescending(x => x.Amount)
            .ToListAsync(cancellationToken);

        var lifetimeGiving = supporter.LifetimeGiving;
        var givingThisYear = Math.Round(lifetimeGiving * 0.35m, 2, MidpointRounding.AwayFromZero);
        var totalAllocationAmount = allocationRows.Sum(x => x.Amount);
        var programCount = allocationRows.Count;

        var givingTrend = givingTrendRows
            .Select(x =>
            {
                var avgAmount = x.DonationCount <= 0
                    ? 0m
                    : Math.Round(x.TotalAmount / x.DonationCount, 2, MidpointRounding.AwayFromZero);

                return new DonorDashboardTrendPointResponse
                {
                    Month = x.Period,
                    Period = x.Period,
                    Amount = x.TotalAmount,
                    Total = x.TotalAmount,
                    TotalAmount = x.TotalAmount,
                    Count = x.DonationCount,
                    DonationCount = x.DonationCount,
                    AvgAmount = avgAmount
                };
            })
            .ToList();

        var allocationBreakdown = allocationRows
            .Select(x => new DonorDashboardAllocationBreakdownItemResponse
            {
                Category = x.ProgramArea,
                ProgramArea = x.ProgramArea,
                Amount = x.Amount,
                Percentage = totalAllocationAmount <= 0m
                    ? 0m
                    : Math.Round((x.Amount / totalAllocationAmount) * 100m, 2, MidpointRounding.AwayFromZero)
            })
            .ToList();

        return new DonorDashboardSummaryResponse
        {
            SupporterId = supporter.Id,
            LifetimeGiving = lifetimeGiving,
            GivingThisYear = givingThisYear,
            LastGiftDate = supporter.LastGiftDate,
            IsRecurring = supporter.IsRecurring,
            NumberOfGifts = numberOfGifts,
            CampaignsSupported = campaignsSupported,
            GivingTrend = givingTrend,
            AllocationBreakdown = allocationBreakdown,
            ImpactCards =
            [
                new DonorDashboardImpactCardResponse
                {
                    Label = "Residents Supported",
                    Title = "Residents Supported",
                    Value = Math.Max(numberOfGifts, 1).ToString(),
                    Description = "Each gift helps provide direct care, shelter, and recovery support to Beacon residents."
                },
                new DonorDashboardImpactCardResponse
                {
                    Label = "Community Impact",
                    Title = "Community Impact",
                    Value = campaignsSupported.ToString(),
                    Description = "Your generosity has reached multiple programs and campaigns across the Beacon network."
                },
                new DonorDashboardImpactCardResponse
                {
                    Label = "Programs Funded",
                    Title = "Programs Funded",
                    Value = programCount.ToString(),
                    Description = "Distinct program areas supported through your allocation footprint and overall giving."
                }
            ],
            MlRecommendations = [],
            TotalGiven = lifetimeGiving
        };
    }

    public async Task<PaginatedListEnvelope<DonationLedgerItemResponse>> GetMyDonationLedgerAsync(
        AuthenticatedUser authenticatedUser,
        PaginationRequest pagination,
        CancellationToken cancellationToken)
    {
        if (authenticatedUser.SupporterId is null)
        {
            return PaginationEnvelopeFactory.Create(Array.Empty<DonationLedgerItemResponse>(), 0, pagination);
        }

        var query = dbContext.Donations
            .AsNoTracking()
            .Where(x => x.SupporterId == authenticatedUser.SupporterId.Value)
            .OrderByDescending(x => x.DonationDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new DonationLedgerItemResponse
            {
                Id = x.Id,
                SupporterId = x.SupporterId,
                DonationType = x.DonationType,
                Amount = x.Amount,
                Currency = x.Currency,
                Campaign = x.Campaign,
                SafehouseId = x.SafehouseId,
                DonationDate = x.DonationDate,
                ReceiptUrl = x.ReceiptUrl,
                Status = null,
                Notes = x.Notes,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt,
                SafehouseName = x.Safehouse != null ? x.Safehouse.Name : null,
                Category = null
            });

        var total = await query.CountAsync(cancellationToken);
        var data = await query
            .Skip((pagination.Page - 1) * pagination.Limit)
            .Take(pagination.Limit)
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<SupporterMeResponse> GetMySupporterProfileAsync(
        AuthenticatedUser authenticatedUser,
        CancellationToken cancellationToken)
    {
        var supporter = await GetLinkedSupporterAsync(authenticatedUser, cancellationToken);
        return MapSupporterMeResponse(supporter);
    }

    public async Task<SupporterGivingStatsResponse> GetSupporterGivingStatsAsync(
        AuthenticatedUser authenticatedUser,
        string role,
        int supporterId,
        CancellationToken cancellationToken)
    {
        if (role == Intex.Infrastructure.Auth.AuthRoles.Donor && authenticatedUser.SupporterId != supporterId)
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "Insufficient permissions");
        }

        if (role is not Intex.Infrastructure.Auth.AuthRoles.Donor
            and not Intex.Infrastructure.Auth.AuthRoles.Staff
            and not Intex.Infrastructure.Auth.AuthRoles.Admin
            and not Intex.Infrastructure.Auth.AuthRoles.SuperAdmin)
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "Insufficient permissions");
        }

        var supporter = await dbContext.Supporters
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == supporterId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        var donations = await dbContext.Donations
            .AsNoTracking()
            .Where(x => x.SupporterId == supporterId)
            .ToListAsync(cancellationToken);

        var numberOfGifts = donations.Count;
        var largestGift = donations.Select(x => x.Amount ?? 0m).DefaultIfEmpty(0m).Max();
        var averageGiftSize = numberOfGifts == 0
            ? 0m
            : Math.Round(donations.Sum(x => x.Amount ?? 0m) / numberOfGifts, 2, MidpointRounding.AwayFromZero);
        var campaignsSupported = donations
            .Where(x => !string.IsNullOrWhiteSpace(x.Campaign))
            .Select(x => x.Campaign!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Count();

        return new SupporterGivingStatsResponse
        {
            SupporterId = supporter.Id,
            LifetimeGiving = supporter.LifetimeGiving,
            GivingThisYear = Math.Round(supporter.LifetimeGiving * 0.35m, 2, MidpointRounding.AwayFromZero),
            LastGiftDate = supporter.LastGiftDate,
            LastGiftAmount = supporter.LastGiftAmount,
            NumberOfGifts = numberOfGifts,
            AverageGiftSize = averageGiftSize,
            LargestGift = largestGift,
            CampaignsSupported = campaignsSupported,
            IsRecurring = supporter.IsRecurring,
            MonthlyTrend = []
        };
    }

    public async Task<SupporterMeResponse> UpdateMySupporterProfileAsync(
        AuthenticatedUser authenticatedUser,
        UpdateMySupporterProfileRequest request,
        CancellationToken cancellationToken)
    {
        var supporter = await GetLinkedSupporterAsync(authenticatedUser, cancellationToken);

        var hasAllowedField =
            request.FirstName is not null
            || request.LastName is not null
            || request.Phone is not null
            || request.Organization is not null
            || request.CommunicationPreference is not null;

        if (!hasAllowedField)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "No fields to update");
        }

        if (request.FirstName is not null)
        {
            supporter.FirstName = request.FirstName;
        }

        if (request.LastName is not null)
        {
            supporter.LastName = request.LastName;
        }

        if (request.Phone is not null)
        {
            supporter.Phone = request.Phone;
        }

        if (request.Organization is not null)
        {
            supporter.Organization = request.Organization;
        }

        if (request.CommunicationPreference is not null)
        {
            supporter.CommunicationPreference = request.CommunicationPreference;
        }

        supporter.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapSupporterMeResponse(supporter);
    }

    public async Task<DonationAllocationListResponse> GetDonationAllocationsAsync(
        AuthenticatedUser authenticatedUser,
        string role,
        int? donationId,
        int? safehouseId,
        CancellationToken cancellationToken)
    {
        if (role == Intex.Infrastructure.Auth.AuthRoles.Donor && authenticatedUser.SupporterId is null)
        {
            return new DonationAllocationListResponse([], 0);
        }

        var query = dbContext.DonationAllocations
            .AsNoTracking()
            .Select(x => new
            {
                x.Id,
                x.DonationId,
                x.SafehouseId,
                x.ProgramArea,
                x.Amount,
                x.Percentage,
                SafehouseName = x.Safehouse.Name,
                x.CreatedAt,
                SupporterId = x.Donation.SupporterId
            });

        if (donationId.HasValue)
        {
            query = query.Where(x => x.DonationId == donationId.Value);
        }

        if (safehouseId.HasValue)
        {
            query = query.Where(x => x.SafehouseId == safehouseId.Value);
        }

        if (role == Intex.Infrastructure.Auth.AuthRoles.Donor)
        {
            query = query.Where(x => x.SupporterId == authenticatedUser.SupporterId!.Value);
        }

        var data = await query
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Select(x => new DonationAllocationResponse
            {
                Id = x.Id,
                DonationId = x.DonationId,
                SafehouseId = x.SafehouseId,
                ProgramArea = x.ProgramArea,
                Amount = x.Amount,
                Percentage = x.Percentage,
                SafehouseName = x.SafehouseName,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new DonationAllocationListResponse(data, data.Count);
    }

    public async Task<PaginatedListEnvelope<SocialMediaPostResponse>> ListSocialMediaPostsAsync(
        PaginationRequest pagination,
        string? platform,
        string? postType,
        CancellationToken cancellationToken)
    {
        var query = dbContext.SocialMediaPosts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(platform))
        {
            query = query.Where(x => x.Platform == platform);
        }

        if (!string.IsNullOrWhiteSpace(postType))
        {
            query = query.Where(x => x.PostType == postType);
        }

        query = query
            .OrderByDescending(x => x.PostDate)
            .ThenByDescending(x => x.Id);

        var total = await query.CountAsync(cancellationToken);
        var data = await query
            .Skip((pagination.Page - 1) * pagination.Limit)
            .Take(pagination.Limit)
            .Select(x => new SocialMediaPostResponse
            {
                Id = x.Id,
                Platform = x.Platform,
                PostType = x.PostType,
                Content = x.Content,
                PostDate = x.PostDate,
                TimeWindow = x.TimeWindow,
                Likes = x.Likes,
                Shares = x.Shares,
                Comments = x.Comments,
                Reach = x.Reach,
                EngagementRate = x.EngagementRate,
                DonationReferrals = x.DonationReferrals,
                DonationValueFromPost = x.DonationValueFromPost,
                PredictedConversionScore = x.PredictedConversionScore,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    private async Task<Supporter> GetLinkedSupporterAsync(
        AuthenticatedUser authenticatedUser,
        CancellationToken cancellationToken)
    {
        if (authenticatedUser.SupporterId is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "Supporter not found");
        }

        var supporter = await dbContext.Supporters
            .SingleOrDefaultAsync(x => x.Id == authenticatedUser.SupporterId.Value, cancellationToken);

        return supporter ?? throw new ApiException(StatusCodes.Status404NotFound, "Supporter not found");
    }

    private static SupporterMeResponse MapSupporterMeResponse(Supporter supporter)
    {
        return new SupporterMeResponse
        {
            Id = supporter.Id,
            FirstName = supporter.FirstName,
            LastName = supporter.LastName,
            Email = supporter.Email,
            Phone = supporter.Phone,
            Organization = supporter.Organization,
            SupportType = supporter.SupportType,
            AcquisitionChannel = supporter.AcquisitionChannel,
            Segment = supporter.Segment,
            ChurnRiskScore = supporter.ChurnRiskScore,
            UpgradeScore = supporter.UpgradeScore,
            LifetimeGiving = supporter.LifetimeGiving,
            LastGiftDate = supporter.LastGiftDate,
            LastGiftAmount = supporter.LastGiftAmount,
            IsRecurring = supporter.IsRecurring,
            CommunicationPreference = supporter.CommunicationPreference,
            Interests = supporter.Interests,
            CreatedAt = supporter.CreatedAt,
            UpdatedAt = supporter.UpdatedAt
        };
    }

    private static DonorDashboardSummaryResponse CreateZeroedDonorDashboardSummary()
    {
        return new DonorDashboardSummaryResponse
        {
            SupporterId = 0,
            LifetimeGiving = 0m,
            GivingThisYear = 0m,
            LastGiftDate = null,
            IsRecurring = false,
            NumberOfGifts = 0,
            CampaignsSupported = 0,
            GivingTrend = [],
            AllocationBreakdown = [],
            ImpactCards = [],
            MlRecommendations = [],
            TotalGiven = 0m
        };
    }
}
