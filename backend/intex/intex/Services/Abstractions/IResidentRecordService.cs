using backend.intex.DTOs.Common;
using backend.intex.DTOs.Records;

namespace backend.intex.Services.Abstractions;

public interface IResidentRecordService
{
    Task<StandardPagedResponse<EducationRecordResponseDto>> ListEducationRecordsAsync(ListEducationRecordsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<EducationRecordResponseDto?> GetEducationRecordAsync(long educationRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(EducationRecordResponseDto? Record, string? ErrorMessage)> CreateEducationRecordAsync(CreateEducationRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(EducationRecordResponseDto? Record, string? ErrorMessage)> UpdateEducationRecordAsync(long educationRecordId, UpdateEducationRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteEducationRecordAsync(long educationRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);

    Task<StandardPagedResponse<HealthRecordResponseDto>> ListHealthRecordsAsync(ListHealthRecordsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<HealthRecordResponseDto?> GetHealthRecordAsync(long healthRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(HealthRecordResponseDto? Record, string? ErrorMessage)> CreateHealthRecordAsync(CreateHealthRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(HealthRecordResponseDto? Record, string? ErrorMessage)> UpdateHealthRecordAsync(long healthRecordId, UpdateHealthRecordRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteHealthRecordAsync(long healthRecordId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
}
