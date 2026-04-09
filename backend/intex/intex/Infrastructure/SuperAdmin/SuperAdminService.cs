using System.Net.Mail;
using System.Text.Json;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth.Passwords;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Intex.Infrastructure.SuperAdmin;

public sealed class SuperAdminService(
    BeaconDbContext dbContext,
    IPasswordHasher passwordHasher,
    IPasswordValidationService passwordValidationService,
    TimeProvider timeProvider)
{
    public async Task<ExecutiveDashboardSummaryResponse> GetExecutiveDashboardSummaryAsync(CancellationToken cancellationToken)
    {
        var currentYearPrefix = $"{timeProvider.GetUtcNow().Year:D4}-";

        var totalDonors = await dbContext.Supporters.CountAsync(cancellationToken);
        var totalActiveResidents = await dbContext.Residents.CountAsync(x => x.CaseStatus == "active", cancellationToken);
        var totalSafehouses = await dbContext.Safehouses.CountAsync(x => x.Status == "active", cancellationToken);
        var donationsYtd = await dbContext.Donations
            .AsNoTracking()
            .Where(x => x.DonationDate.CompareTo(currentYearPrefix) >= 0)
            .Select(x => x.Amount ?? 0m)
            .DefaultIfEmpty(0m)
            .SumAsync(cancellationToken);

        var latestOverallReintegrationStat = await dbContext.ReportReintegrationStats
            .AsNoTracking()
            .Where(x => x.SafehouseId == null)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => (decimal?)x.SuccessRate)
            .FirstOrDefaultAsync(cancellationToken);

        var reintegrationSuccessRate = latestOverallReintegrationStat ?? 0.32m;

        var avgHealthScore = await dbContext.HealthRecords
            .AsNoTracking()
            .Select(x => x.HealthScore)
            .DefaultIfEmpty(0m)
            .AverageAsync(cancellationToken);

        var avgEducationProgress = await dbContext.EducationRecords
            .AsNoTracking()
            .Select(x => x.ProgressScore)
            .DefaultIfEmpty(0m)
            .AverageAsync(cancellationToken);

        var incidentCount = await dbContext.IncidentReports.CountAsync(cancellationToken);
        var incidentRate = totalActiveResidents == 0
            ? 0m
            : Math.Round((decimal)incidentCount / totalActiveResidents, 3, MidpointRounding.AwayFromZero);

        var socialDrivenDonations = await dbContext.SocialMediaPosts
            .AsNoTracking()
            .Select(x => x.DonationValueFromPost)
            .DefaultIfEmpty(0m)
            .SumAsync(cancellationToken);

        var safehouseComparison = await dbContext.Safehouses
            .AsNoTracking()
            .Select(x => new ExecutiveSafehouseComparisonItemResponse
            {
                SafehouseName = x.Name,
                Residents = x.Residents.Count(r => r.CaseStatus == "active"),
                Donations = x.Donations.Select(d => d.Amount ?? 0m).DefaultIfEmpty(0m).Sum(),
                HealthScore = x.Residents
                    .SelectMany(r => r.HealthRecords)
                    .Select(hr => hr.HealthScore ?? 0m)
                    .DefaultIfEmpty(0m)
                    .Average(),
                IncidentCount = x.IncidentReports.Count()
            })
            .OrderByDescending(x => x.Residents)
            .ThenBy(x => x.SafehouseName)
            .ToListAsync(cancellationToken);

        var donationTrend = await dbContext.Donations
            .AsNoTracking()
            .Where(x => x.DonationDate.Length >= 7)
            .Select(x => new
            {
                Month = x.DonationDate.Substring(0, 7),
                Amount = x.Amount ?? 0m
            })
            .ToListAsync(cancellationToken);

        var donationTrendResponse = donationTrend
            .GroupBy(x => x.Month)
            .OrderByDescending(x => x.Key)
            .Take(12)
            .OrderBy(x => x.Key)
            .Select(x => new ExecutiveDonationTrendItemResponse
            {
                Month = x.Key,
                Amount = x.Sum(y => y.Amount),
                Count = x.Count(),
                AvgAmount = x.Any() ? x.Average(y => y.Amount) : 0m
            })
            .ToList();

        return new ExecutiveDashboardSummaryResponse
        {
            TotalDonors = totalDonors,
            TotalActiveResidents = totalActiveResidents,
            TotalSafehouses = totalSafehouses,
            DonationsYtd = donationsYtd,
            OrgRetentionEstimate = 0.68m,
            ReintegrationSuccessRate = reintegrationSuccessRate,
            AvgHealthScore = Math.Round(avgHealthScore ?? 0m, 2, MidpointRounding.AwayFromZero),
            AvgEducationProgress = Math.Round(avgEducationProgress ?? 0m, 2, MidpointRounding.AwayFromZero),
            IncidentRate = incidentRate,
            SocialDrivenDonations = socialDrivenDonations,
            SafehouseComparison = safehouseComparison,
            DonationTrend = donationTrendResponse
        };
    }

    public async Task<PaginatedListEnvelope<UserResponse>> ListUsersAsync(
        PaginationRequest pagination,
        string? role,
        CancellationToken cancellationToken)
    {
        var query = dbContext.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(x => x.Role == role);
        }

        query = query.OrderBy(x => x.Id);

        var total = await query.CountAsync(cancellationToken);
        var users = await query
            .Skip(pagination.Offset)
            .Take(pagination.Limit)
            .ToListAsync(cancellationToken);

        var assignmentsLookup = await GetAssignedSafehousesLookupAsync(users.Select(x => x.Id), cancellationToken);
        var data = users.Select(x => MapUserResponse(x, assignmentsLookup)).ToList();

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<UserResponse> GetUserByIdAsync(int userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        var assignmentsLookup = await GetAssignedSafehousesLookupAsync([userId], cancellationToken);
        return MapUserResponse(user, assignmentsLookup);
    }

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest? request, CancellationToken cancellationToken)
    {
        request ??= new CreateUserRequest(null, null, null, null, null, null, null, null, null);

        var username = RequireText(request.Username, "username is required");
        var email = RequireEmail(request.Email);
        var firstName = RequireText(request.FirstName, "firstName is required");
        var lastName = RequireText(request.LastName, "lastName is required");
        var password = RequireText(request.Password, "password is required");
        var validation = passwordValidationService.ValidateFirstFailure(password);
        if (!validation.IsValid)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, validation.ErrorMessage!);
        }

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = passwordHasher.Hash(password),
            FirstName = firstName,
            LastName = lastName,
            Role = string.IsNullOrWhiteSpace(request.Role) ? "public" : request.Role,
            IsActive = true,
            MfaEnabled = request.MfaEnabled ?? false,
            SupporterId = request.SupporterId,
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Users.Add(user);
        await SaveChangesAsync(cancellationToken);

        if (request.AssignedSafehouses is { Length: > 0 })
        {
            foreach (var safehouseId in request.AssignedSafehouses.Distinct())
            {
                dbContext.StaffSafehouseAssignments.Add(new StaffSafehouseAssignment
                {
                    UserId = user.Id,
                    SafehouseId = safehouseId,
                    CreatedAt = timeProvider.GetUtcNow()
                });
            }

            await SaveChangesAsync(cancellationToken);
        }

        return await GetUserByIdAsync(user.Id, cancellationToken);
    }

    public async Task<UserResponse> UpdateUserAsync(int userId, UpdateUserRequest? request, CancellationToken cancellationToken)
    {
        request ??= new UpdateUserRequest(null, null, null, null, null, null, null, null);

        var user = await dbContext.Users
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        if (request.Email is not null)
        {
            user.Email = RequireEmail(request.Email);
        }

        if (request.FirstName is not null)
        {
            user.FirstName = RequireText(request.FirstName, "firstName is required");
        }

        if (request.LastName is not null)
        {
            user.LastName = RequireText(request.LastName, "lastName is required");
        }

        if (request.Role is not null)
        {
            user.Role = request.Role;
        }

        if (request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }

        if (request.MfaEnabled.HasValue)
        {
            user.MfaEnabled = request.MfaEnabled.Value;
        }

        if (request.SupporterId is not null)
        {
            user.SupporterId = request.SupporterId;
        }

        user.UpdatedAt = timeProvider.GetUtcNow();

        if (request.AssignedSafehouses is not null)
        {
            var existingAssignments = await dbContext.StaffSafehouseAssignments
                .Where(x => x.UserId == userId)
                .ToListAsync(cancellationToken);

            dbContext.StaffSafehouseAssignments.RemoveRange(existingAssignments);

            foreach (var safehouseId in request.AssignedSafehouses.Distinct())
            {
                dbContext.StaffSafehouseAssignments.Add(new StaffSafehouseAssignment
                {
                    UserId = userId,
                    SafehouseId = safehouseId,
                    CreatedAt = timeProvider.GetUtcNow()
                });
            }
        }

        await SaveChangesAsync(cancellationToken);
        return await GetUserByIdAsync(userId, cancellationToken);
    }

    public async Task DeleteUserAsync(int actorUserId, int targetUserId, CancellationToken cancellationToken)
    {
        if (actorUserId == targetUserId)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Cannot delete your own account");
        }

        var user = await dbContext.Users
            .SingleOrDefaultAsync(x => x.Id == targetUserId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        dbContext.Users.Remove(user);
        await SaveChangesAsync(cancellationToken);
    }

    public async Task<UserResponse> SetUserEnabledAsync(int userId, bool isActive, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        user.IsActive = isActive;
        user.UpdatedAt = timeProvider.GetUtcNow();
        await SaveChangesAsync(cancellationToken);

        return await GetUserByIdAsync(userId, cancellationToken);
    }

    public async Task<DataListResponse<MlPipelineResponse>> ListMlPipelinesAsync(CancellationToken cancellationToken)
    {
        var data = await dbContext.MlPipelineRuns
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => new MlPipelineResponse
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                Status = x.Status,
                ModelVersion = x.ModelVersion,
                LastRetrained = x.LastRetrained,
                PredictionCount = x.PredictionCount,
                AvgConfidence = x.AvgConfidence,
                DriftFlags = x.DriftFlags,
                OverrideRate = x.OverrideRate,
                HealthStatus = x.HealthStatus,
                LastRunAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return new DataListResponse<MlPipelineResponse> { Data = data };
    }

    public async Task<PaginatedListEnvelope<MlPredictionResponse>> ListMlPredictionsAsync(
        PaginationRequest pagination,
        string? pipeline,
        string? entityType,
        int? entityId,
        CancellationToken cancellationToken)
    {
        var predictions = await dbContext.MlPredictionSnapshots
            .AsNoTracking()
            .OrderByDescending(x => x.PredictedAt)
            .ToListAsync(cancellationToken);

        IEnumerable<MlPredictionSnapshot> filtered = predictions;

        if (!string.IsNullOrWhiteSpace(pipeline))
        {
            filtered = filtered.Where(x => x.Pipeline == pipeline);
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            filtered = filtered.Where(x => x.EntityType == entityType);
        }

        if (entityId.HasValue)
        {
            filtered = filtered.Where(x => x.EntityId == entityId.Value);
        }

        var filteredList = filtered.ToList();
        var total = filteredList.Count;
        var data = filteredList
            .Skip(pagination.Offset)
            .Take(pagination.Limit)
            .Select(MapMlPredictionResponse)
            .ToList();

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public Task<PaginatedListEnvelope<MlPredictionResponse>> ListMlPredictionsForEntityAsync(
        string entityType,
        int entityId,
        CancellationToken cancellationToken)
    {
        return ListMlPredictionsForEntityInternalAsync(entityType, entityId, cancellationToken);
    }

    private async Task<PaginatedListEnvelope<MlPredictionResponse>> ListMlPredictionsForEntityInternalAsync(
        string entityType,
        int entityId,
        CancellationToken cancellationToken)
    {
        var predictions = await dbContext.MlPredictionSnapshots
            .AsNoTracking()
            .Where(x => x.EntityType == entityType && x.EntityId == entityId)
            .OrderByDescending(x => x.PredictedAt)
            .ToListAsync(cancellationToken);

        var data = predictions
            .Select(MapMlPredictionResponse)
            .ToList();

        var pagination = new PaginationRequest(1, Math.Max(data.Count, 1));
        return PaginationEnvelopeFactory.Create(data, data.Count, pagination);
    }

    public async Task<PaginatedListEnvelope<AuditLogResponse>> ListAuditLogsAsync(
        PaginationRequest pagination,
        int? actorId,
        string? action,
        string? entityType,
        CancellationToken cancellationToken)
    {
        var query = dbContext.AuditLogs
            .AsNoTracking()
            .AsQueryable();

        if (actorId.HasValue)
        {
            query = query.Where(x => x.ActorId == actorId.Value);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(x => x.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(x => x.EntityType == entityType);
        }

        query = query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id);

        var total = await query.CountAsync(cancellationToken);
        var data = await query
            .Skip(pagination.Offset)
            .Take(pagination.Limit)
            .Select(x => new AuditLogResponse
            {
                Id = x.Id,
                ActorId = x.ActorId,
                ActorName = x.ActorName,
                ActorRole = x.ActorRole,
                Action = x.Action,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                EntityDescription = x.EntityDescription,
                Details = x.Details,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<PaginatedListEnvelope<ImpactSnapshotAdminResponse>> ListAdminImpactSnapshotsAsync(
        PaginationRequest pagination,
        CancellationToken cancellationToken)
    {
        var query = dbContext.ImpactSnapshots
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id);

        var total = await query.CountAsync(cancellationToken);
        var data = await query
            .Skip(pagination.Offset)
            .Take(pagination.Limit)
            .Select(x => MapImpactSnapshotResponse(x))
            .ToListAsync(cancellationToken);

        return PaginationEnvelopeFactory.Create(data, total, pagination);
    }

    public async Task<ImpactSnapshotAdminResponse> GetAdminImpactSnapshotByIdAsync(int id, CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.ImpactSnapshots
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => MapImpactSnapshotResponse(x))
            .SingleOrDefaultAsync(cancellationToken);

        return snapshot ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");
    }

    public async Task<ImpactSnapshotAdminResponse> CreateImpactSnapshotAsync(
        CreateImpactSnapshotRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new CreateImpactSnapshotRequest(null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        var derivedPeriod = BuildImpactSnapshotPeriod(request.Period, request.PeriodLabel, request.Year, request.Quarter);
        var title = RequireText(request.Title ?? request.PeriodLabel ?? derivedPeriod, "title is required");
        var period = RequireText(derivedPeriod, "period is required");

        var snapshot = new ImpactSnapshot
        {
            Title = title,
            Period = period,
            IsPublished = false,
            PublishedAt = null,
            ResidentsServed = request.ResidentsServed ?? 0,
            TotalDonationsAmount = request.TotalDonationsAmount ?? 0m,
            ProgramOutcomes = MergeImpactProgramOutcomes(request.ProgramOutcomes, request.NewSupporters),
            SafehousesCovered = request.SafehousesCovered ?? 0,
            ReintegrationCount = request.ReintegrationCount ?? 0,
            Summary = request.Summary ?? request.Highlights,
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.ImpactSnapshots.Add(snapshot);
        await SaveChangesAsync(cancellationToken);

        return await GetAdminImpactSnapshotByIdAsync(snapshot.Id, cancellationToken);
    }

    public async Task<ImpactSnapshotAdminResponse> UpdateImpactSnapshotAsync(
        int id,
        UpdateImpactSnapshotRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new UpdateImpactSnapshotRequest(null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        var snapshot = await dbContext.ImpactSnapshots
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        if (request.Title is not null || request.Period is not null || request.PeriodLabel is not null || request.Year.HasValue || request.Quarter.HasValue)
        {
            snapshot.Title = request.Title ?? snapshot.Title;
            snapshot.Period = BuildImpactSnapshotPeriod(
                request.Period ?? snapshot.Period,
                request.PeriodLabel,
                request.Year,
                request.Quarter);
        }

        if (request.ResidentsServed.HasValue)
        {
            snapshot.ResidentsServed = request.ResidentsServed.Value;
        }

        if (request.TotalDonationsAmount.HasValue)
        {
            snapshot.TotalDonationsAmount = request.TotalDonationsAmount.Value;
        }

        if (request.ProgramOutcomes is not null || request.NewSupporters.HasValue)
        {
            snapshot.ProgramOutcomes = MergeImpactProgramOutcomes(request.ProgramOutcomes ?? snapshot.ProgramOutcomes, request.NewSupporters);
        }

        if (request.SafehousesCovered.HasValue)
        {
            snapshot.SafehousesCovered = request.SafehousesCovered.Value;
        }

        if (request.ReintegrationCount.HasValue)
        {
            snapshot.ReintegrationCount = request.ReintegrationCount.Value;
        }

        if (request.Summary is not null || request.Highlights is not null)
        {
            snapshot.Summary = request.Summary ?? request.Highlights;
        }

        snapshot.UpdatedAt = timeProvider.GetUtcNow();
        await SaveChangesAsync(cancellationToken);

        return await GetAdminImpactSnapshotByIdAsync(id, cancellationToken);
    }

    public async Task DeleteImpactSnapshotAsync(int id, CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.ImpactSnapshots
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        dbContext.ImpactSnapshots.Remove(snapshot);
        await SaveChangesAsync(cancellationToken);
    }

    public async Task<ImpactSnapshotAdminResponse> SetImpactSnapshotPublishedAsync(
        int id,
        bool isPublished,
        CancellationToken cancellationToken)
    {
        var snapshot = await dbContext.ImpactSnapshots
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        snapshot.IsPublished = isPublished;
        snapshot.PublishedAt = isPublished ? timeProvider.GetUtcNow() : null;
        snapshot.UpdatedAt = timeProvider.GetUtcNow();
        await SaveChangesAsync(cancellationToken);

        return await GetAdminImpactSnapshotByIdAsync(id, cancellationToken);
    }

    private static MlPredictionResponse MapMlPredictionResponse(MlPredictionSnapshot snapshot)
    {
        return new MlPredictionResponse
        {
            Id = snapshot.Id,
            Pipeline = snapshot.Pipeline,
            EntityType = snapshot.EntityType,
            EntityId = snapshot.EntityId,
            PredictionValue = snapshot.PredictionValue,
            ConfidenceScore = snapshot.ConfidenceScore,
            RiskBand = snapshot.RiskBand,
            TopFeatures = ReadJsonObjectArray(snapshot.TopFeatures),
            RecommendedAction = snapshot.RecommendedAction,
            ModelVersion = snapshot.ModelVersion,
            PredictedAt = snapshot.PredictedAt
        };
    }

    private static IReadOnlyList<Dictionary<string, object?>> ReadJsonObjectArray(JsonDocument? document)
    {
        if (document?.RootElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        List<Dictionary<string, object?>> items = [];
        foreach (var item in document.RootElement.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var dictionary = JsonSerializer.Deserialize<Dictionary<string, object?>>(item.GetRawText()) ?? [];
            items.Add(dictionary);
        }

        return items;
    }

    private async Task<Dictionary<int, List<int>>> GetAssignedSafehousesLookupAsync(
        IEnumerable<int> userIds,
        CancellationToken cancellationToken)
    {
        return await dbContext.StaffSafehouseAssignments
            .AsNoTracking()
            .Where(x => userIds.Contains(x.UserId))
            .OrderBy(x => x.SafehouseId)
            .GroupBy(x => x.UserId)
            .ToDictionaryAsync(
                x => x.Key,
                x => x.Select(y => y.SafehouseId).ToList(),
                cancellationToken);
    }

    private static UserResponse MapUserResponse(User user, IReadOnlyDictionary<int, List<int>> assignmentsLookup)
    {
        return new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            IsActive = user.IsActive,
            MfaEnabled = user.MfaEnabled,
            LastLogin = user.LastLogin,
            SupporterId = user.SupporterId,
            CreatedAt = user.CreatedAt,
            AssignedSafehouses = assignmentsLookup.TryGetValue(user.Id, out var assignedSafehouses)
                ? assignedSafehouses
                : []
        };
    }

    private static ImpactSnapshotAdminResponse MapImpactSnapshotResponse(ImpactSnapshot snapshot)
    {
        return new ImpactSnapshotAdminResponse
        {
            Id = snapshot.Id,
            Title = snapshot.Title,
            Period = snapshot.Period,
            IsPublished = snapshot.IsPublished,
            PublishedAt = snapshot.PublishedAt,
            ResidentsServed = snapshot.ResidentsServed,
            TotalDonationsAmount = snapshot.TotalDonationsAmount,
            ProgramOutcomes = snapshot.ProgramOutcomes,
            SafehousesCovered = snapshot.SafehousesCovered,
            ReintegrationCount = snapshot.ReintegrationCount,
            Summary = snapshot.Summary,
            CreatedAt = snapshot.CreatedAt,
            UpdatedAt = snapshot.UpdatedAt
        };
    }

    private static JsonDocument? MergeImpactProgramOutcomes(JsonDocument? baseOutcomes, int? newSupporters)
    {
        if (baseOutcomes is null && !newSupporters.HasValue)
        {
            return null;
        }

        var dictionary = baseOutcomes?.RootElement.ValueKind == JsonValueKind.Object
            ? JsonSerializer.Deserialize<Dictionary<string, object?>>(baseOutcomes.RootElement.GetRawText()) ?? []
            : new Dictionary<string, object?>();

        if (newSupporters.HasValue)
        {
            dictionary["newSupporters"] = newSupporters.Value;
        }

        return JsonSerializer.SerializeToDocument(dictionary);
    }

    private static string BuildImpactSnapshotPeriod(string? period, string? periodLabel, int? year, int? quarter)
    {
        if (!string.IsNullOrWhiteSpace(period))
        {
            return period;
        }

        if (!string.IsNullOrWhiteSpace(periodLabel))
        {
            return periodLabel;
        }

        if (year.HasValue && quarter.HasValue)
        {
            return $"Q{quarter.Value} {year.Value}";
        }

        if (year.HasValue)
        {
            return year.Value.ToString();
        }

        return string.Empty;
    }

    private static string RequireText(string? value, string errorMessage)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, errorMessage);
        }

        return value.Trim();
    }

    private static string RequireEmail(string? value)
    {
        var email = RequireText(value, "email is required");

        try
        {
            _ = new MailAddress(email);
        }
        catch (FormatException)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid email address");
        }

        return email;
    }

    private async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException postgres
            && postgres.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new ApiException(StatusCodes.Status409Conflict, "A record with those unique fields already exists.");
        }
    }
}
