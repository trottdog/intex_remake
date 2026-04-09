namespace backend.intex.DTOs.Supporters;

public sealed record SupporterGivingStatsDto(
    long SupporterId,
    decimal Total,
    int Count,
    decimal AvgGift,
    string? LastDonationDate,
    IReadOnlyDictionary<string, int> DonationTypesMap,
    decimal TotalGiven,
    int DonationCount,
    decimal AvgGiftAmount,
    IReadOnlyDictionary<string, int> DonationsByType
);
