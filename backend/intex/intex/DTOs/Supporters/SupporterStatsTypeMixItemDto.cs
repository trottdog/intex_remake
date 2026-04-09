namespace backend.intex.DTOs.Supporters;

public sealed record SupporterStatsTypeMixItemDto(
    string Type,
    int Count,
    decimal Percentage
);
