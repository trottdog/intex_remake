namespace backend.intex.DTOs.Donations;

public sealed record DonationTrendDto(
    string Month,
    string Period,
    decimal Total,
    decimal TotalAmount,
    int Count,
    int DonationCount,
    decimal AvgAmount
);
