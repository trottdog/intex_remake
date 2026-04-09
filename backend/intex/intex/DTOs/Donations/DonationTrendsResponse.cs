namespace backend.intex.DTOs.Donations;

public sealed record DonationTrendsResponse(
    IReadOnlyList<DonationTrendDto> Data
);
