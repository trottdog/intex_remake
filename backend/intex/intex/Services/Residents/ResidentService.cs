using System.Text.Json;
using backend.intex.DTOs.Common;
using backend.intex.DTOs.Residents;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Residents;

public sealed class ResidentService(IResidentRepository residentRepository) : IResidentService
{
    public async Task<ResidentStatsResponseDto> GetStatsAsync(long? safehouseId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var rows = await residentRepository.ListResidentsForStatsAsync(safehouseId, assignedSafehouses, enforceScope, cancellationToken);
        var active = rows.Where(resident => string.Equals(resident.CaseStatus, "active", StringComparison.OrdinalIgnoreCase)).ToList();
        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        return new ResidentStatsResponseDto(
            active.Count,
            active.Count(resident => resident.DateOfAdmission.HasValue && resident.DateOfAdmission.Value >= thirtyDaysAgo),
            (int)Math.Floor(active.Count * 0.15m),
            active.Count(resident => IsHighRisk(resident.CurrentRiskLevel)),
            new[] { "Low", "Medium", "High", "Critical" }
                .Select(level => new ResidentRiskDistributionItemDto(
                    level,
                    rows.Count(resident => string.Equals(resident.CurrentRiskLevel, level, StringComparison.OrdinalIgnoreCase))))
                .ToList(),
            new[] { "Active", "Closed", "Transferred" }
                .Select(status => new ResidentStatusDistributionItemDto(
                    status,
                    rows.Count(resident => string.Equals(resident.CaseStatus, status, StringComparison.OrdinalIgnoreCase))))
                .ToList());
    }

    public async Task<IReadOnlyList<ResidentTimelineEventDto>?> GetTimelineAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var resident = await GetResidentAsync(residentId, role, assignedSafehouses, cancellationToken);
        if (resident is null)
        {
            return null;
        }

        var timeline = await residentRepository.GetResidentTimelineAsync(residentId, cancellationToken);
        return timeline.Select(item => new ResidentTimelineEventDto(
            item.Id,
            item.EventType,
            item.EventDate?.ToString("yyyy-MM-dd"),
            item.Title,
            item.Description,
            item.Severity)).ToList();
    }

    public async Task<StandardPagedResponse<ResidentResponseDto>> ListResidentsAsync(ListResidentsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;

        var (residents, total) = await residentRepository.ListResidentsAsync(page, pageSize, query.SafehouseId, query.CaseStatus, assignedSafehouses, enforceScope, cancellationToken);
        var data = await MapResidentsAsync(residents, cancellationToken);
        return new StandardPagedResponse<ResidentResponseDto>(
            data,
            total,
            BuildPagination(page, pageSize, total));
    }

    public async Task<(ResidentResponseDto? Resident, string? ErrorMessage)> CreateResidentAsync(CreateResidentRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        if (!HasSafehouseAccess(request.Fields, role, assignedSafehouses))
        {
            return (null, "safehouseId is outside your allowed scope");
        }

        var created = await residentRepository.CreateResidentAsync(request.Fields, cancellationToken);
        var mapped = await GetResidentAsync(created.ResidentId, role, assignedSafehouses, cancellationToken);
        return (mapped, null);
    }

    public async Task<ResidentResponseDto?> GetResidentAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var resident = await residentRepository.GetResidentAsync(residentId, assignedSafehouses, enforceScope, cancellationToken);
        if (resident is null)
        {
            return null;
        }

        var safehouseNameMap = await residentRepository.GetSafehouseNamesAsync(
            resident.SafehouseId.HasValue ? [resident.SafehouseId.Value] : [],
            cancellationToken);
        return MapResident(
            resident,
            resident.SafehouseId.HasValue && safehouseNameMap.TryGetValue(resident.SafehouseId.Value, out var safehouseName) ? safehouseName : null);
    }

    public async Task<(ResidentResponseDto? Resident, string? ErrorMessage)> UpdateResidentAsync(long residentId, UpdateResidentRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await GetResidentAsync(residentId, role, assignedSafehouses, cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        if (!HasSafehouseAccess(request.Fields, role, assignedSafehouses))
        {
            return (null, "safehouseId is outside your allowed scope");
        }

        var updated = await residentRepository.UpdateResidentAsync(residentId, request.Fields, cancellationToken);
        if (updated is null)
        {
            return (null, "Not found");
        }

        return (await GetResidentAsync(residentId, role, assignedSafehouses, cancellationToken), null);
    }

    public async Task<bool> DeleteResidentAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var resident = await GetResidentAsync(residentId, role, assignedSafehouses, cancellationToken);
        if (resident is null)
        {
            return false;
        }

        return await residentRepository.DeleteResidentAsync(residentId, cancellationToken);
    }

    private async Task<IReadOnlyList<ResidentResponseDto>> MapResidentsAsync(IReadOnlyList<Resident> residents, CancellationToken cancellationToken)
    {
        if (residents.Count == 0)
        {
            return [];
        }

        var safehouseIds = residents.Where(resident => resident.SafehouseId.HasValue)
            .Select(resident => resident.SafehouseId!.Value)
            .Distinct()
            .ToList();
        var safehouseNameMap = await residentRepository.GetSafehouseNamesAsync(safehouseIds, cancellationToken);

        return residents.Select(resident => MapResident(
            resident,
            resident.SafehouseId.HasValue && safehouseNameMap.TryGetValue(resident.SafehouseId.Value, out var safehouseName) ? safehouseName : null))
            .ToList();
    }

    private static ResidentResponseDto MapResident(Resident resident, string? safehouseName)
    {
        var currentRiskLevel = NormalizeEnum(resident.CurrentRiskLevel ?? resident.InitialRiskLevel);
        return new ResidentResponseDto
        {
            ResidentId = resident.ResidentId,
            Id = resident.ResidentId,
            CaseControlNo = resident.CaseControlNo,
            InternalCode = resident.InternalCode,
            ResidentCode = resident.CaseControlNo ?? resident.InternalCode ?? $"CASE-{resident.ResidentId}",
            SafehouseId = resident.SafehouseId,
            SafehouseName = safehouseName,
            CaseStatus = NormalizeEnum(resident.CaseStatus),
            Sex = resident.Sex,
            DateOfBirth = resident.DateOfBirth?.ToString("yyyy-MM-dd"),
            BirthStatus = resident.BirthStatus,
            PlaceOfBirth = resident.PlaceOfBirth,
            Religion = resident.Religion,
            CaseCategory = resident.CaseCategory,
            SubCatOrphaned = resident.SubCatOrphaned,
            SubCatTrafficked = resident.SubCatTrafficked,
            SubCatChildLabor = resident.SubCatChildLabor,
            SubCatPhysicalAbuse = resident.SubCatPhysicalAbuse,
            SubCatSexualAbuse = resident.SubCatSexualAbuse,
            SubCatOsaec = resident.SubCatOsaec,
            SubCatCicl = resident.SubCatCicl,
            SubCatAtRisk = resident.SubCatAtRisk,
            SubCatStreetChild = resident.SubCatStreetChild,
            SubCatChildWithHiv = resident.SubCatChildWithHiv,
            IsPwd = resident.IsPwd,
            PwdType = resident.PwdType,
            HasSpecialNeeds = resident.HasSpecialNeeds,
            SpecialNeedsDiagnosis = resident.SpecialNeedsDiagnosis,
            FamilyIs4Ps = resident.FamilyIs4Ps,
            FamilySoloParent = resident.FamilySoloParent,
            FamilyIndigenous = resident.FamilyIndigenous,
            FamilyParentPwd = resident.FamilyParentPwd,
            FamilyInformalSettler = resident.FamilyInformalSettler,
            DateOfAdmission = resident.DateOfAdmission?.ToString("yyyy-MM-dd"),
            AdmissionDate = resident.DateOfAdmission?.ToString("yyyy-MM-dd"),
            AgeUponAdmission = resident.AgeUponAdmission,
            PresentAge = resident.PresentAge ?? resident.AgeUponAdmission ?? CalculateAge(resident.DateOfBirth),
            LengthOfStay = resident.LengthOfStay,
            ReferralSource = resident.ReferralSource,
            ReferringAgencyPerson = resident.ReferringAgencyPerson,
            DateColbRegistered = resident.DateColbRegistered?.ToString("yyyy-MM-dd"),
            DateColbObtained = resident.DateColbObtained?.ToString("yyyy-MM-dd"),
            AssignedSocialWorker = resident.AssignedSocialWorker,
            AssignedWorkerName = resident.AssignedSocialWorker,
            InitialCaseAssessment = resident.InitialCaseAssessment,
            DateCaseStudyPrepared = resident.DateCaseStudyPrepared?.ToString("yyyy-MM-dd"),
            ReintegrationType = resident.ReintegrationType,
            ReintegrationStatus = NormalizeEnum(resident.ReintegrationStatus),
            InitialRiskLevel = resident.InitialRiskLevel,
            CurrentRiskLevel = currentRiskLevel,
            RiskLevel = currentRiskLevel,
            DateEnrolled = resident.DateEnrolled?.ToString("yyyy-MM-dd"),
            DateClosed = resident.DateClosed?.ToString("yyyy-MM-dd"),
            DischargeDate = resident.DateClosed?.ToString("yyyy-MM-dd"),
            CreatedAt = resident.CreatedAt?.ToUniversalTime().ToString("O"),
            NotesRestricted = resident.NotesRestricted,
            RegressionRiskScore = resident.RegressionRiskScore,
            RegressionRiskBand = resident.RegressionRiskBand,
            RegressionRiskDrivers = resident.RegressionRiskDrivers,
            RegressionRecommendedAction = resident.RegressionRecommendedAction,
            RegressionScoreUpdatedAt = resident.RegressionScoreUpdatedAt?.ToUniversalTime().ToString("O"),
            ReintegrationReadinessScore = resident.ReintegrationReadinessScore,
            ReintegrationReadinessBand = resident.ReintegrationReadinessBand,
            ReintegrationReadinessDrivers = resident.ReintegrationReadinessDrivers,
            ReintegrationRecommendedAction = resident.ReintegrationRecommendedAction,
            ReintegrationScoreUpdatedAt = resident.ReintegrationScoreUpdatedAt?.ToUniversalTime().ToString("O"),
            MlScoresRestricted = resident.MlScoresRestricted
        };
    }

    private static StandardPaginationMeta BuildPagination(int page, int pageSize, int total)
    {
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1);
    }

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 2000);
    }

    private static string? NormalizeEnum(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return string.Join(" ", value
            .Split(['_', ' '], StringSplitOptions.RemoveEmptyEntries)
            .Select(part => char.ToUpperInvariant(part[0]) + part[1..].ToLowerInvariant()));
    }

    private static string? CalculateAge(DateOnly? dateOfBirth)
    {
        if (!dateOfBirth.HasValue)
        {
            return null;
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var years = today.Year - dateOfBirth.Value.Year;
        if (today < dateOfBirth.Value.AddYears(years))
        {
            years--;
        }

        return years.ToString();
    }

    private static bool IsHighRisk(string? value) =>
        string.Equals(value, "high", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "critical", StringComparison.OrdinalIgnoreCase);

    private static bool HasSafehouseAccess(IReadOnlyDictionary<string, JsonElement> fields, string? role, IReadOnlyList<long> assignedSafehouses)
    {
        if (role is not (BeaconRoles.Staff or BeaconRoles.Admin) || assignedSafehouses.Count == 0)
        {
            return true;
        }

        if (!fields.TryGetValue("safehouseId", out var safehouseElement) || safehouseElement.ValueKind == JsonValueKind.Null)
        {
            return true;
        }

        return safehouseElement.ValueKind == JsonValueKind.Number
            && safehouseElement.TryGetInt64(out var safehouseId)
            && assignedSafehouses.Contains(safehouseId);
    }
}
