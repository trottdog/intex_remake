namespace Intex.Persistence.Entities;

public sealed class Resident
{
    public int Id { get; set; }
    public string ResidentCode { get; set; } = null!;
    public int SafehouseId { get; set; }
    public int? AssignedWorkerId { get; set; }
    public string CaseStatus { get; set; } = null!;
    public string CaseCategory { get; set; } = null!;
    public string RiskLevel { get; set; } = null!;
    public string ReintegrationStatus { get; set; } = null!;
    public string AdmissionDate { get; set; } = null!;
    public string? DischargeDate { get; set; }
    public string? AgeGroup { get; set; }
    public DateTimeOffset LastUpdated { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Safehouse Safehouse { get; set; } = null!;
    public User? AssignedWorker { get; set; }
    public ICollection<ProcessRecording> ProcessRecordings { get; set; } = [];
    public ICollection<HomeVisitation> HomeVisitations { get; set; } = [];
    public ICollection<CaseConference> CaseConferences { get; set; } = [];
    public ICollection<InterventionPlan> InterventionPlans { get; set; } = [];
    public ICollection<IncidentReport> IncidentReports { get; set; } = [];
    public ICollection<EducationRecord> EducationRecords { get; set; } = [];
    public ICollection<HealthRecord> HealthRecords { get; set; } = [];
}

public sealed class ProcessRecording
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public int WorkerId { get; set; }
    public int SafehouseId { get; set; }
    public string SessionDate { get; set; } = null!;
    public int? Duration { get; set; }
    public string? EmotionalStateStart { get; set; }
    public string? EmotionalStateEnd { get; set; }
    public bool ProgressNoted { get; set; }
    public bool ConcernFlag { get; set; }
    public bool ReferralMade { get; set; }
    public bool FollowUpRequired { get; set; }
    public string? SessionNotes { get; set; }
    public string[] Tags { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident Resident { get; set; } = null!;
    public User Worker { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
}

public sealed class HomeVisitation
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public int WorkerId { get; set; }
    public string VisitDate { get; set; } = null!;
    public string Outcome { get; set; } = null!;
    public string? CooperationLevel { get; set; }
    public bool SafetyConcern { get; set; }
    public bool FollowUpRequired { get; set; }
    public string? FollowUpDue { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident Resident { get; set; } = null!;
    public User Worker { get; set; } = null!;
}

public sealed class CaseConference
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public int SafehouseId { get; set; }
    public string ScheduledDate { get; set; } = null!;
    public string? CompletedDate { get; set; }
    public string Status { get; set; } = null!;
    public string[] Attendees { get; set; } = [];
    public string? Decisions { get; set; }
    public string? NextSteps { get; set; }
    public string? NextConferenceDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident Resident { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
}

public sealed class InterventionPlan
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public int SafehouseId { get; set; }
    public int WorkerId { get; set; }
    public string Category { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string TargetDate { get; set; } = null!;
    public string? CompletedDate { get; set; }
    public string[] Services { get; set; } = [];
    public string[] Milestones { get; set; } = [];
    public decimal? SuccessProbability { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident Resident { get; set; } = null!;
    public Safehouse Safehouse { get; set; } = null!;
    public User Worker { get; set; } = null!;
}

public sealed class IncidentReport
{
    public int Id { get; set; }
    public int? ResidentId { get; set; }
    public int SafehouseId { get; set; }
    public int ReportedBy { get; set; }
    public string IncidentDate { get; set; } = null!;
    public string IncidentType { get; set; } = null!;
    public string Severity { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? Resolution { get; set; }
    public string? ResolutionDate { get; set; }
    public bool FollowUpRequired { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident? Resident { get; set; }
    public Safehouse Safehouse { get; set; } = null!;
    public User Reporter { get; set; } = null!;
}

public sealed class EducationRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public string RecordDate { get; set; } = null!;
    public string EducationLevel { get; set; } = null!;
    public string EnrollmentStatus { get; set; } = null!;
    public decimal? ProgressScore { get; set; }
    public string? ProgramType { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident Resident { get; set; } = null!;
}

public sealed class HealthRecord
{
    public int Id { get; set; }
    public int ResidentId { get; set; }
    public string RecordDate { get; set; } = null!;
    public decimal? HealthScore { get; set; }
    public string? MentalHealthStatus { get; set; }
    public string? PhysicalHealthStatus { get; set; }
    public string? TraumaProgress { get; set; }
    public string? MedicationStatus { get; set; }
    public string? NextAppointment { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Resident Resident { get; set; } = null!;
}
