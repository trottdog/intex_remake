using System.Text.Json;
using backend.intex.DTOs.Records;

namespace backend.intex.Repositories.Abstractions;

public interface IResidentRecordRepository
{
    Task<(IReadOnlyList<EducationRecordResponseDto> Data, int Total)> ListEducationRecordsAsync(
        int page,
        int pageSize,
        long? residentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<EducationRecordResponseDto?> GetEducationRecordAsync(
        long educationRecordId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<EducationRecordResponseDto?> CreateEducationRecordAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<EducationRecordResponseDto?> UpdateEducationRecordAsync(
        long educationRecordId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteEducationRecordAsync(long educationRecordId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<HealthRecordResponseDto> Data, int Total)> ListHealthRecordsAsync(
        int page,
        int pageSize,
        long? residentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<HealthRecordResponseDto?> GetHealthRecordAsync(
        long healthRecordId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<HealthRecordResponseDto?> CreateHealthRecordAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<HealthRecordResponseDto?> UpdateHealthRecordAsync(
        long healthRecordId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteHealthRecordAsync(long healthRecordId, CancellationToken cancellationToken = default);

    Task<ResidentScopeLookup?> GetResidentScopeLookupAsync(long residentId, CancellationToken cancellationToken = default);
}
