namespace backend.intex.DTOs.Donations;

public sealed record PublicDonationResponse(
    long DonationId,
    string Message
);
