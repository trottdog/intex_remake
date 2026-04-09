using System.Globalization;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Donor.Contracts;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Intex.Infrastructure.ExtendedAdmin;

public sealed class ExtendedAdminService(BeaconDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<PaginatedListEnvelope<SafehouseResponse>> ListSafehousesAsync(
        PaginationRequest pagination,
        string? search,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Safehouses.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern));
        }

        query = query.OrderBy(x => x.Name).ThenBy(x => x.Id);

        var total = await query.CountAsync(cancellationToken);
        var data = await query
            .Skip((pagination.Page - 1) * pagination.Limit)
            .Take(pagination.Limit)
            .Select(MapSafehouse())
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<SafehouseResponse> GetSafehouseAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.Safehouses.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapSafehouse())
            .SingleOrDefaultAsync(cancellationToken)
        ?? throw NotFound();

    public async Task<SafehouseResponse> CreateSafehouseAsync(CreateSafehouseRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null);

        var entity = new Safehouse
        {
            Name = RequiredText(request.Name, "name is required"),
            Location = RequiredText(request.Location, "location is required"),
            Capacity = request.Capacity ?? throw new ApiException(StatusCodes.Status400BadRequest, "capacity is required"),
            CurrentOccupancy = 0,
            ProgramAreas = request.ProgramAreas ?? [],
            Status = string.IsNullOrWhiteSpace(request.Status) ? "active" : request.Status.Trim(),
            ContactName = NullIfWhiteSpace(request.ContactName),
            ContactEmail = NullIfWhiteSpace(request.ContactEmail),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Safehouses.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetSafehouseAsync(entity.Id, cancellationToken);
    }

    public async Task<SafehouseResponse> UpdateSafehouseAsync(int id, UpdateSafehouseRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null);
        var entity = await dbContext.Safehouses.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();

        if (request.Name is not null) entity.Name = RequiredText(request.Name, "name is required");
        if (request.Location is not null) entity.Location = RequiredText(request.Location, "location is required");
        if (request.Capacity.HasValue) entity.Capacity = request.Capacity.Value;
        if (request.ProgramAreas is not null) entity.ProgramAreas = request.ProgramAreas;
        if (request.Status is not null) entity.Status = RequiredText(request.Status, "status is required");
        if (request.ContactName is not null) entity.ContactName = NullIfWhiteSpace(request.ContactName);
        if (request.ContactEmail is not null) entity.ContactEmail = NullIfWhiteSpace(request.ContactEmail);

        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetSafehouseAsync(id, cancellationToken);
    }

    public async Task DeleteSafehouseAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Safehouses.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.Safehouses.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SafehouseMonthlyMetricResponse>> GetSafehouseMetricsAsync(
        int id,
        int months,
        CancellationToken cancellationToken)
    {
        var safehouseExists = await dbContext.Safehouses.AsNoTracking().AnyAsync(x => x.Id == id, cancellationToken);
        if (!safehouseExists)
        {
            throw NotFound();
        }

        var normalizedMonths = months <= 0 ? 12 : months;
        var latest = await dbContext.SafehouseMonthlyMetrics.AsNoTracking()
            .Where(x => x.SafehouseId == id)
            .OrderByDescending(x => x.Month)
            .Take(normalizedMonths)
            .Select(x => new SafehouseMonthlyMetricResponse
            {
                Id = x.Id,
                SafehouseId = x.SafehouseId,
                Month = x.Month,
                ActiveResidents = x.ActiveResidents,
                NewAdmissions = x.NewAdmissions,
                Discharges = x.Discharges,
                IncidentCount = x.IncidentCount,
                ProcessRecordingCount = x.ProcessRecordingCount,
                VisitCount = x.VisitCount,
                AvgHealthScore = x.AvgHealthScore,
                AvgEducationProgress = x.AvgEducationProgress
            })
            .ToListAsync(cancellationToken);

        return latest.OrderBy(x => x.Month).ToList();
    }

    public async Task<PaginatedListEnvelope<PartnerResponse>> ListPartnersAsync(
        PaginationRequest pagination,
        string? search,
        string? programArea,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Partners.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern));
        }

        if (!string.IsNullOrWhiteSpace(programArea))
        {
            query = query.Where(x => x.ProgramArea == programArea);
        }

        query = query.OrderBy(x => x.Name).ThenBy(x => x.Id);

        var total = await query.CountAsync(cancellationToken);
        var data = await query
            .Skip((pagination.Page - 1) * pagination.Limit)
            .Take(pagination.Limit)
            .Select(x => new PartnerResponse
            {
                Id = x.Id,
                Name = x.Name,
                ProgramArea = x.ProgramArea,
                ContactName = x.ContactName,
                ContactEmail = x.ContactEmail,
                Phone = x.Phone,
                Status = x.Status,
                AssignmentCount = x.PartnerAssignments.Count,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<PartnerResponse> GetPartnerAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.Partners.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new PartnerResponse
            {
                Id = x.Id,
                Name = x.Name,
                ProgramArea = x.ProgramArea,
                ContactName = x.ContactName,
                ContactEmail = x.ContactEmail,
                Phone = x.Phone,
                Status = x.Status,
                AssignmentCount = x.PartnerAssignments.Count,
                CreatedAt = x.CreatedAt
            })
            .SingleOrDefaultAsync(cancellationToken)
        ?? throw NotFound();

    public async Task<PartnerResponse> CreatePartnerAsync(CreatePartnerRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null);
        var entity = new Partner
        {
            Name = RequiredText(request.Name, "name is required"),
            ProgramArea = RequiredText(request.ProgramArea, "programArea is required"),
            ContactName = NullIfWhiteSpace(request.ContactName),
            ContactEmail = NullIfWhiteSpace(request.ContactEmail),
            Phone = NullIfWhiteSpace(request.Phone),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "active" : request.Status.Trim(),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Partners.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetPartnerAsync(entity.Id, cancellationToken);
    }

    public async Task<PartnerResponse> UpdatePartnerAsync(int id, UpdatePartnerRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null);
        var entity = await dbContext.Partners.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();

        if (request.Name is not null) entity.Name = RequiredText(request.Name, "name is required");
        if (request.ProgramArea is not null) entity.ProgramArea = RequiredText(request.ProgramArea, "programArea is required");
        if (request.ContactName is not null) entity.ContactName = NullIfWhiteSpace(request.ContactName);
        if (request.ContactEmail is not null) entity.ContactEmail = NullIfWhiteSpace(request.ContactEmail);
        if (request.Phone is not null) entity.Phone = NullIfWhiteSpace(request.Phone);
        if (request.Status is not null) entity.Status = RequiredText(request.Status, "status is required");

        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetPartnerAsync(id, cancellationToken);
    }

    public async Task DeletePartnerAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Partners.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.Partners.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PartnerAssignmentResponse>> ListPartnerAssignmentsAsync(
        int? partnerId,
        int? safehouseId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.PartnerAssignments.AsNoTracking();
        if (partnerId.HasValue) query = query.Where(x => x.PartnerId == partnerId.Value);
        if (safehouseId.HasValue) query = query.Where(x => x.SafehouseId == safehouseId.Value);

        return await query
            .OrderByDescending(x => x.StartDate)
            .ThenByDescending(x => x.Id)
            .Select(x => new PartnerAssignmentResponse
            {
                Id = x.Id,
                PartnerId = x.PartnerId,
                SafehouseId = x.SafehouseId,
                PartnerName = x.Partner.Name,
                SafehouseName = x.Safehouse.Name,
                ProgramArea = x.ProgramArea,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                Notes = x.Notes
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<PartnerAssignmentResponse> CreatePartnerAssignmentAsync(CreatePartnerAssignmentRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null);
        var entity = new PartnerAssignment
        {
            PartnerId = Required(request.PartnerId, "partnerId is required"),
            SafehouseId = Required(request.SafehouseId, "safehouseId is required"),
            ProgramArea = NullIfWhiteSpace(request.ProgramArea),
            StartDate = ValidDate(request.StartDate),
            EndDate = OptionalDate(request.EndDate),
            Notes = NullIfWhiteSpace(request.Notes),
            CreatedAt = timeProvider.GetUtcNow()
        };

        dbContext.PartnerAssignments.Add(entity);
        await SaveAsync(cancellationToken);
        return await dbContext.PartnerAssignments.AsNoTracking()
            .Where(x => x.Id == entity.Id)
            .Select(x => new PartnerAssignmentResponse
            {
                Id = x.Id,
                PartnerId = x.PartnerId,
                SafehouseId = x.SafehouseId,
                PartnerName = x.Partner.Name,
                SafehouseName = x.Safehouse.Name,
                ProgramArea = x.ProgramArea,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                Notes = x.Notes
            })
            .SingleAsync(cancellationToken);
    }

    public async Task DeletePartnerAssignmentAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PartnerAssignments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.PartnerAssignments.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<DataListResponse<ReportDonationTrendResponse>> GetDonationTrendReportAsync(CancellationToken cancellationToken)
    {
        var data = await dbContext.ReportDonationTrends.AsNoTracking()
            .OrderBy(x => x.Period)
            .Select(x => new ReportDonationTrendResponse
            {
                Id = x.Id,
                Period = x.Period,
                TotalAmount = x.TotalAmount,
                DonorCount = x.DonorCount,
                NewDonors = x.NewDonors,
                RecurringRevenue = x.RecurringRevenue,
                AvgGiftSize = x.AvgGiftSize,
                RetentionRate = x.RetentionRate
            })
            .ToListAsync(cancellationToken);

        return new DataListResponse<ReportDonationTrendResponse> { Data = data };
    }

    public async Task<DataListResponse<ReportAccomplishmentResponse>> GetAccomplishmentsReportAsync(CancellationToken cancellationToken)
    {
        var data = await dbContext.ReportAccomplishments.AsNoTracking()
            .OrderByDescending(x => x.Year)
            .ThenBy(x => x.ServiceArea)
            .Select(x => new ReportAccomplishmentResponse
            {
                Id = x.Id,
                Year = x.Year,
                ServiceArea = x.ServiceArea,
                Category = x.Category,
                BeneficiaryCount = x.BeneficiaryCount,
                SessionsDelivered = x.SessionsDelivered,
                OutcomeSummary = x.OutcomeSummary,
                Notes = x.Notes
            })
            .ToListAsync(cancellationToken);

        return new DataListResponse<ReportAccomplishmentResponse> { Data = data };
    }

    public async Task<DataListResponse<ReportReintegrationStatResponse>> GetReintegrationStatsReportAsync(CancellationToken cancellationToken)
    {
        var data = await dbContext.ReportReintegrationStats.AsNoTracking()
            .OrderByDescending(x => x.Period)
            .ThenBy(x => x.SafehouseId)
            .Select(x => new ReportReintegrationStatResponse
            {
                Id = x.Id,
                Period = x.Period,
                SafehouseId = x.SafehouseId,
                SafehouseName = x.SafehouseName,
                TotalResidents = x.TotalResidents,
                ReintegrationCompleted = x.ReintegrationCompleted,
                AvgDaysToReintegration = x.AvgDaysToReintegration,
                SuccessRate = x.SuccessRate,
                AvgHealthScoreAtDischarge = x.AvgHealthScoreAtDischarge,
                AvgEducationProgressAtDischarge = x.AvgEducationProgressAtDischarge
            })
            .ToListAsync(cancellationToken);

        return new DataListResponse<ReportReintegrationStatResponse> { Data = data };
    }

    public async Task<SocialMediaAnalyticsResponse> GetSocialMediaAnalyticsAsync(CancellationToken cancellationToken)
    {
        var posts = await dbContext.SocialMediaPosts.AsNoTracking().ToListAsync(cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var monthPrefix = $"{now.Year:D4}-{now.Month:D2}";
        var postsThisMonth = posts.Count(x => x.PostDate.StartsWith(monthPrefix, StringComparison.Ordinal));
        var avgEngagementRate = posts.Count == 0 ? 0m : Math.Round(posts.Average(x => x.EngagementRate), 4, MidpointRounding.AwayFromZero);
        var donationReferrals = posts.Sum(x => x.DonationReferrals);
        var donationValueFromSocial = posts.Sum(x => x.DonationValueFromPost);
        var platformBreakdown = posts
            .GroupBy(x => x.Platform)
            .OrderBy(x => x.Key)
            .Select(group => new SocialMediaAnalyticsPlatformBreakdownItemResponse
            {
                Platform = group.Key,
                Posts = group.Count(),
                AvgEngagement = Math.Round(group.Average(x => x.EngagementRate), 4, MidpointRounding.AwayFromZero),
                DonationReferrals = group.Sum(x => x.DonationReferrals)
            })
            .ToList();

        return new SocialMediaAnalyticsResponse
        {
            PostsThisMonth = postsThisMonth,
            AvgEngagementRate = avgEngagementRate,
            DonationReferrals = donationReferrals,
            DonationValueFromSocial = donationValueFromSocial,
            PlatformBreakdown = platformBreakdown,
            EngagementHeatmap = []
        };
    }

    public async Task<SocialMediaPostResponse> GetSocialMediaPostAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.SocialMediaPosts.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapSocialMediaPost())
            .SingleOrDefaultAsync(cancellationToken)
        ?? throw NotFound();

    public async Task<SocialMediaPostResponse> CreateSocialMediaPostAsync(CreateSocialMediaPostRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null, null);
        var likes = request.Likes ?? 0;
        var shares = request.Shares ?? 0;
        var comments = request.Comments ?? 0;
        var reach = request.Reach ?? 0;

        var entity = new SocialMediaPost
        {
            Platform = RequiredText(request.Platform, "platform is required"),
            PostType = RequiredText(request.PostType, "postType is required"),
            Content = RequiredText(request.Content, "content is required"),
            PostDate = ValidDate(request.PostDate),
            TimeWindow = NullIfWhiteSpace(request.TimeWindow),
            Likes = likes,
            Shares = shares,
            Comments = comments,
            Reach = reach,
            EngagementRate = ComputeEngagementRate(likes, shares, comments, reach),
            DonationReferrals = request.DonationReferrals ?? 0,
            DonationValueFromPost = request.DonationValueFromPost ?? 0m,
            PredictedConversionScore = null,
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.SocialMediaPosts.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetSocialMediaPostAsync(entity.Id, cancellationToken);
    }

    public async Task<SocialMediaPostResponse> UpdateSocialMediaPostAsync(int id, UpdateSocialMediaPostRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null, null);
        var entity = await dbContext.SocialMediaPosts.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();

        if (request.Platform is not null) entity.Platform = RequiredText(request.Platform, "platform is required");
        if (request.PostType is not null) entity.PostType = RequiredText(request.PostType, "postType is required");
        if (request.Content is not null) entity.Content = RequiredText(request.Content, "content is required");
        if (request.PostDate is not null) entity.PostDate = ValidDate(request.PostDate);
        if (request.TimeWindow is not null) entity.TimeWindow = NullIfWhiteSpace(request.TimeWindow);
        if (request.Likes.HasValue) entity.Likes = request.Likes.Value;
        if (request.Shares.HasValue) entity.Shares = request.Shares.Value;
        if (request.Comments.HasValue) entity.Comments = request.Comments.Value;
        if (request.Reach.HasValue) entity.Reach = request.Reach.Value;
        if (request.DonationReferrals.HasValue) entity.DonationReferrals = request.DonationReferrals.Value;
        if (request.DonationValueFromPost.HasValue) entity.DonationValueFromPost = request.DonationValueFromPost.Value;

        entity.EngagementRate = ComputeEngagementRate(entity.Likes, entity.Shares, entity.Comments, entity.Reach);
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetSocialMediaPostAsync(id, cancellationToken);
    }

    public async Task DeleteSocialMediaPostAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.SocialMediaPosts.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.SocialMediaPosts.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<InKindDonationItemResponse>> ListInKindDonationItemsAsync(
        int page,
        int pageSize,
        int? donationId,
        string? category,
        CancellationToken cancellationToken)
    {
        var query = dbContext.InKindDonationItems.AsNoTracking();
        if (donationId.HasValue) query = query.Where(x => x.DonationId == donationId.Value);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(x => x.Category == category);

        query = query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id);
        var total = await query.CountAsync(cancellationToken);
        var pagination = new PaginationRequest(page <= 0 ? 1 : page, pageSize <= 0 ? 20 : pageSize);
        var data = await query
            .Skip((pagination.Page - 1) * pagination.Limit)
            .Take(pagination.Limit)
            .Select(MapInKindDonationItem())
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<InKindDonationItemResponse> GetInKindDonationItemAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.InKindDonationItems.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapInKindDonationItem())
            .SingleOrDefaultAsync(cancellationToken)
        ?? throw NotFound();

    public async Task<InKindDonationItemResponse> CreateInKindDonationItemAsync(CreateInKindDonationItemRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null, null);

        var missingRequired =
            !request.DonationId.HasValue
            || string.IsNullOrWhiteSpace(request.ItemDescription)
            || string.IsNullOrWhiteSpace(request.Category)
            || !request.Quantity.HasValue
            || request.Quantity.Value <= 0
            || string.IsNullOrWhiteSpace(request.Condition);

        if (missingRequired)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Missing required fields: donationId, itemDescription, category, quantity, condition");
        }

        var donationId = request.DonationId ?? 0;
        var quantity = request.Quantity!.Value;
        var computedTotal = request.TotalEstimatedValue
            ?? (request.EstimatedValuePerUnit.HasValue && quantity != 0
                ? request.EstimatedValuePerUnit.Value * quantity
                : null);

        var entity = new InKindDonationItem
        {
            DonationId = donationId,
            ItemDescription = request.ItemDescription!.Trim(),
            Category = request.Category!.Trim(),
            Quantity = quantity,
            Unit = string.IsNullOrWhiteSpace(request.Unit) ? "pcs" : request.Unit.Trim(),
            EstimatedValuePerUnit = request.EstimatedValuePerUnit,
            TotalEstimatedValue = computedTotal,
            Condition = request.Condition!.Trim(),
            ReceivedBy = request.ReceivedBy,
            ReceivedAt = ParseOptionalDateTime(request.ReceivedAt, "receivedAt"),
            Notes = NullIfWhiteSpace(request.Notes),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.InKindDonationItems.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetInKindDonationItemAsync(entity.Id, cancellationToken);
    }

    public async Task DeleteInKindDonationItemAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.InKindDonationItems.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.InKindDonationItems.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    private static decimal ComputeEngagementRate(int likes, int shares, int comments, int reach)
    {
        if (reach <= 0)
        {
            return 0m;
        }

        var interactions = likes + shares + comments;
        return Math.Round((decimal)interactions / reach, 4, MidpointRounding.AwayFromZero);
    }

    private static System.Linq.Expressions.Expression<Func<Safehouse, SafehouseResponse>> MapSafehouse() => x => new SafehouseResponse
    {
        Id = x.Id,
        Name = x.Name,
        Location = x.Location,
        Capacity = x.Capacity,
        CurrentOccupancy = x.CurrentOccupancy,
        ProgramAreas = x.ProgramAreas,
        Status = x.Status,
        ContactName = x.ContactName,
        ContactEmail = x.ContactEmail,
        CreatedAt = x.CreatedAt,
        UpdatedAt = x.UpdatedAt
    };

    private static System.Linq.Expressions.Expression<Func<SocialMediaPost, SocialMediaPostResponse>> MapSocialMediaPost() => x => new SocialMediaPostResponse
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
    };

    private static System.Linq.Expressions.Expression<Func<InKindDonationItem, InKindDonationItemResponse>> MapInKindDonationItem() => x => new InKindDonationItemResponse
    {
        Id = x.Id,
        DonationId = x.DonationId,
        ItemDescription = x.ItemDescription,
        Category = x.Category,
        Quantity = x.Quantity,
        Unit = x.Unit,
        EstimatedValuePerUnit = x.EstimatedValuePerUnit,
        TotalEstimatedValue = x.TotalEstimatedValue,
        Condition = x.Condition,
        ReceivedBy = x.ReceivedBy,
        ReceivedAt = x.ReceivedAt,
        Notes = x.Notes,
        CreatedAt = x.CreatedAt,
        UpdatedAt = x.UpdatedAt
    };

    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException postgresException)
        {
            throw postgresException.SqlState switch
            {
                PostgresErrorCodes.UniqueViolation => new ApiException(StatusCodes.Status409Conflict, "A record with that value already exists"),
                PostgresErrorCodes.ForeignKeyViolation => new ApiException(StatusCodes.Status400BadRequest, "Invalid reference provided"),
                _ => exception
            };
        }
    }

    private static ApiException NotFound() => new(StatusCodes.Status404NotFound, "Not found");
    private static int Required(int? value, string message) => value ?? throw new ApiException(StatusCodes.Status400BadRequest, message);
    private static string RequiredText(string? value, string message) => string.IsNullOrWhiteSpace(value) ? throw new ApiException(StatusCodes.Status400BadRequest, message) : value.Trim();
    private static string ValidDate(string? value)
    {
        var input = RequiredText(value, "Invalid date format — use YYYY-MM-DD");
        if (!DateOnly.TryParseExact(input, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid date format — use YYYY-MM-DD");
        }

        return input;
    }

    private static string? OptionalDate(string? value) => value is null ? null : string.IsNullOrWhiteSpace(value) ? null : ValidDate(value);
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTimeOffset? ParseOptionalDateTime(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
        {
            return parsed;
        }

        throw new ApiException(StatusCodes.Status400BadRequest, $"Invalid {fieldName} format");
    }
}
