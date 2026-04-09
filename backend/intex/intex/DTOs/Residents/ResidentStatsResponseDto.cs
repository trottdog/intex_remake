namespace backend.intex.DTOs.Residents;

public sealed record ResidentStatsResponseDto(
    int TotalActive,
    int NewAdmissions,
    int CasesNeedingUpdate,
    int HighRiskResidents,
    IReadOnlyList<ResidentRiskDistributionItemDto> RiskDistribution,
    IReadOnlyList<ResidentStatusDistributionItemDto> StatusDistribution
);

public sealed record ResidentRiskDistributionItemDto(string Level, int Count);

public sealed record ResidentStatusDistributionItemDto(string Status, int Count);
