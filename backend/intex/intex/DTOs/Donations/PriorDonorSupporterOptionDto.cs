namespace backend.intex.DTOs.Donations;

public sealed record PriorDonorSupporterOptionDto(
    long SupporterId,
    string DisplayName,
    string? Email,
    int DonationCount,
    decimal LifetimeGiving
);
