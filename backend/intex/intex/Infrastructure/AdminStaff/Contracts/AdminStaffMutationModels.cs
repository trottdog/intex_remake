namespace Intex.Infrastructure.AdminStaff.Contracts;

public sealed record CreateResidentRequest(
    string? ResidentCode,
    int? SafehouseId,
    int? AssignedWorkerId,
    string? CaseStatus,
    string? CaseCategory,
    string? RiskLevel,
    string? ReintegrationStatus,
    string? AdmissionDate,
    string? DischargeDate,
    string? AgeGroup);

public sealed record UpdateResidentRequest(
    int? SafehouseId,
    int? AssignedWorkerId,
    string? CaseStatus,
    string? CaseCategory,
    string? RiskLevel,
    string? ReintegrationStatus,
    string? AdmissionDate,
    string? DischargeDate,
    string? AgeGroup);

public sealed record CreateDonationRequest(
    int? SupporterId,
    string? DonationType,
    decimal? Amount,
    string? Currency,
    string? Campaign,
    int? SafehouseId,
    string? DonationDate,
    string? ReceiptUrl,
    string? Notes,
    bool? IsAnonymous);

public sealed record UpdateDonationRequest(
    string? DonationType,
    decimal? Amount,
    string? Currency,
    string? Campaign,
    int? SafehouseId,
    string? DonationDate,
    string? ReceiptUrl,
    string? Notes,
    bool? IsAnonymous);

public sealed record CreateSupporterRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? Organization,
    string? SupportType,
    string? AcquisitionChannel,
    string? Segment,
    decimal? ChurnRiskScore,
    decimal? UpgradeScore,
    decimal? LifetimeGiving,
    string? LastGiftDate,
    decimal? LastGiftAmount,
    bool? IsRecurring,
    string? CommunicationPreference,
    string[]? Interests);

public sealed record UpdateSupporterRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? Phone,
    string? Organization,
    string? SupportType,
    string? AcquisitionChannel,
    string? Segment,
    decimal? ChurnRiskScore,
    decimal? UpgradeScore,
    decimal? LifetimeGiving,
    string? LastGiftDate,
    decimal? LastGiftAmount,
    bool? IsRecurring,
    string? CommunicationPreference,
    string[]? Interests);

public sealed record CreateDonationAllocationRequest(
    int? DonationId,
    int? SafehouseId,
    string? ProgramArea,
    decimal? Amount,
    decimal? Percentage);
