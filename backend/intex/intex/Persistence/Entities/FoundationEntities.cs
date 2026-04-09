using System.Text.Json;

namespace Intex.Persistence.Entities;

public sealed class Safehouse
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Location { get; set; } = null!;
    public int Capacity { get; set; }
    public int CurrentOccupancy { get; set; }
    public string[] ProgramAreas { get; set; } = [];
    public string Status { get; set; } = null!;
    public string? ContactName { get; set; }
    public string? ContactEmail { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = [];
    public ICollection<StaffSafehouseAssignment> StaffSafehouseAssignments { get; set; } = [];
    public ICollection<Donation> Donations { get; set; } = [];
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = [];
    public ICollection<Resident> Residents { get; set; } = [];
    public ICollection<ProcessRecording> ProcessRecordings { get; set; } = [];
    public ICollection<CaseConference> CaseConferences { get; set; } = [];
    public ICollection<InterventionPlan> InterventionPlans { get; set; } = [];
    public ICollection<IncidentReport> IncidentReports { get; set; } = [];
    public ICollection<SafehouseMonthlyMetric> MonthlyMetrics { get; set; } = [];
    public ICollection<ReportReintegrationStat> ReportReintegrationStats { get; set; } = [];
}

public sealed class Partner
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string ProgramArea { get; set; } = null!;
    public string? ContactName { get; set; }
    public string? ContactEmail { get; set; }
    public string? Phone { get; set; }
    public string Status { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = [];
}

public sealed class PartnerAssignment
{
    public int Id { get; set; }
    public int PartnerId { get; set; }
    public int SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public string StartDate { get; set; } = null!;
    public string? EndDate { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Partner Partner { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
}

public sealed class Supporter
{
    public int Id { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Organization { get; set; }
    public string SupportType { get; set; } = null!;
    public string? AcquisitionChannel { get; set; }
    public string? Segment { get; set; }
    public decimal? ChurnRiskScore { get; set; }
    public decimal? UpgradeScore { get; set; }
    public decimal LifetimeGiving { get; set; }
    public string? LastGiftDate { get; set; }
    public decimal? LastGiftAmount { get; set; }
    public bool IsRecurring { get; set; }
    public string? CommunicationPreference { get; set; }
    public string[] Interests { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Donation> Donations { get; set; } = [];
}

public sealed class User
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Role { get; set; } = null!;
    public bool IsActive { get; set; }
    public bool MfaEnabled { get; set; }
    public DateTimeOffset? LastLogin { get; set; }
    public int? SupporterId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Supporter? Supporter { get; set; }
    public ICollection<StaffSafehouseAssignment> StaffSafehouseAssignments { get; set; } = [];
    public ICollection<Resident> AssignedResidents { get; set; } = [];
    public ICollection<ProcessRecording> ProcessRecordings { get; set; } = [];
    public ICollection<HomeVisitation> HomeVisitations { get; set; } = [];
    public ICollection<InterventionPlan> InterventionPlans { get; set; } = [];
    public ICollection<IncidentReport> IncidentReports { get; set; } = [];
    public ICollection<InKindDonationItem> ReceivedInKindDonationItems { get; set; } = [];
}

public sealed class StaffSafehouseAssignment
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int SafehouseId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
}

public sealed class Donation
{
    public int Id { get; set; }
    public int SupporterId { get; set; }
    public string DonationType { get; set; } = null!;
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = null!;
    public string? Campaign { get; set; }
    public int? SafehouseId { get; set; }
    public string DonationDate { get; set; } = null!;
    public string? ReceiptUrl { get; set; }
    public string? Notes { get; set; }
    public bool IsAnonymous { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Supporter Supporter { get; set; } = null!;
    public Safehouse? Safehouse { get; set; }
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = [];
    public ICollection<InKindDonationItem> InKindDonationItems { get; set; } = [];
}

public sealed class DonationAllocation
{
    public int Id { get; set; }
    public int DonationId { get; set; }
    public int SafehouseId { get; set; }
    public string ProgramArea { get; set; } = null!;
    public decimal Amount { get; set; }
    public decimal Percentage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Donation Donation { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
}

public sealed class InKindDonationItem
{
    public int Id { get; set; }
    public int DonationId { get; set; }
    public string ItemDescription { get; set; } = null!;
    public string Category { get; set; } = null!;
    public int Quantity { get; set; }
    public string? Unit { get; set; }
    public decimal? EstimatedValuePerUnit { get; set; }
    public decimal? TotalEstimatedValue { get; set; }
    public string Condition { get; set; } = null!;
    public int? ReceivedBy { get; set; }
    public DateTimeOffset? ReceivedAt { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Donation Donation { get; set; } = null!;
    public User? ReceivedByUser { get; set; }
}
