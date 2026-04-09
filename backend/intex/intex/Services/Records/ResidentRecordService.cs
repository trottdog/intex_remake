using System.Text.Json;
using backend.intex.DTOs.Common;
using backend.intex.DTOs.Records;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Records;

public sealed class ResidentRecordService(IResidentRecordRepository repository) : IResidentRecordService
{
    public async Task<StandardPagedResponse<EducationRecordResponseDto>> ListEducationRecordsAsync(ListEducationRecordsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var (data, total) = await repository.ListEducationRecordsAsync(page, pageSize, query.ResidentId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return new StandardPagedResponse<EducationRecordResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<EducationRecordResponseDto?> GetEducationRecordAsync(long educationRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetEducationRecordAsync(educationRecordId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(EducationRecordResponseDto? Record, string? ErrorMessage)> CreateEducationRecordAsync(CreateEducationRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var residentId = ReadNullableLong(request.Fields, "residentId");
        if (!residentId.HasValue)
        {
            return (null, "residentId is required");
        }

        var validationError = await ValidateResidentScopeAsync(residentId.Value, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateEducationRecordAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(EducationRecordResponseDto? Record, string? ErrorMessage)> UpdateEducationRecordAsync(long educationRecordId, UpdateEducationRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetEducationRecordAsync(educationRecordId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var effectiveResidentId = ReadNullableLong(request.Fields, "residentId") ?? existing.ResidentId;
        if (effectiveResidentId.HasValue)
        {
            var validationError = await ValidateResidentScopeAsync(effectiveResidentId.Value, role, assignedSafehouses, cancellationToken);
            if (validationError is not null)
            {
                return (null, validationError);
            }
        }

        var updated = await repository.UpdateEducationRecordAsync(educationRecordId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteEducationRecordAsync(long educationRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetEducationRecordAsync(educationRecordId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteEducationRecordAsync(educationRecordId, cancellationToken);
    }

    public async Task<StandardPagedResponse<HealthRecordResponseDto>> ListHealthRecordsAsync(ListHealthRecordsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var (data, total) = await repository.ListHealthRecordsAsync(page, pageSize, query.ResidentId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return new StandardPagedResponse<HealthRecordResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<HealthRecordResponseDto?> GetHealthRecordAsync(long healthRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetHealthRecordAsync(healthRecordId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(HealthRecordResponseDto? Record, string? ErrorMessage)> CreateHealthRecordAsync(CreateHealthRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var residentId = ReadNullableLong(request.Fields, "residentId");
        if (!residentId.HasValue)
        {
            return (null, "residentId is required");
        }

        var validationError = await ValidateResidentScopeAsync(residentId.Value, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateHealthRecordAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(HealthRecordResponseDto? Record, string? ErrorMessage)> UpdateHealthRecordAsync(long healthRecordId, UpdateHealthRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetHealthRecordAsync(healthRecordId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var effectiveResidentId = ReadNullableLong(request.Fields, "residentId") ?? existing.ResidentId;
        if (effectiveResidentId.HasValue)
        {
            var validationError = await ValidateResidentScopeAsync(effectiveResidentId.Value, role, assignedSafehouses, cancellationToken);
            if (validationError is not null)
            {
                return (null, validationError);
            }
        }

        var updated = await repository.UpdateHealthRecordAsync(healthRecordId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteHealthRecordAsync(long healthRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetHealthRecordAsync(healthRecordId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteHealthRecordAsync(healthRecordId, cancellationToken);
    }

    private async Task<string?> ValidateResidentScopeAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken)
    {
        var lookup = await repository.GetResidentScopeLookupAsync(residentId, cancellationToken);
        if (lookup is null)
        {
            return "residentId is invalid";
        }

        if (EnforceScope(role) && assignedSafehouses.Count > 0)
        {
            if (!lookup.SafehouseId.HasValue || !assignedSafehouses.Contains(lookup.SafehouseId.Value))
            {
                return "residentId is outside your allowed scope";
            }
        }

        return null;
    }

    private static long? ReadNullableLong(IReadOnlyDictionary<string, JsonElement> fields, string key)
    {
        if (!fields.TryGetValue(key, out var value) || value.ValueKind == JsonValueKind.Null || value.ValueKind == JsonValueKind.Undefined)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt64(out var longValue) => longValue,
            JsonValueKind.String when long.TryParse(value.GetString(), out var stringValue) => stringValue,
            _ => null
        };
    }

    private static bool EnforceScope(string? role) => role is BeaconRoles.Staff or BeaconRoles.Admin;

    private static int ResolvePage(int page) => page <= 0 ? 1 : page;

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 2000);
    }

    private static StandardPaginationMeta BuildPagination(int page, int pageSize, int total)
    {
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1);
    }
}
