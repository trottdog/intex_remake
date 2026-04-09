namespace backend.intex.DTOs.Supporters;

public sealed record SupporterStatsResponseDto(
    int TotalSupporters,
    int ActiveSupporters,
    int RecurringDonors,
    int NewSupporters,
    decimal RaisedThisMonth,
    decimal LifetimeTotal,
    decimal AvgGiftSize,
    IReadOnlyList<SupporterStatsChannelItemDto> AcquisitionByChannel,
    IReadOnlyList<SupporterStatsTypeMixItemDto> SupportTypeMix,
    int Total,
    int Active,
    int Recurring,
    int NewThisMonth,
    decimal AvgGift,
    IReadOnlyList<SupporterStatsChannelItemDto> ChannelBreakdown,
    IReadOnlyList<SupporterStatsTypeMixItemDto> TypeMix
);
