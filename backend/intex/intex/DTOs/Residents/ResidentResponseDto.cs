using System.Text.Json;

namespace backend.intex.DTOs.Residents;

public sealed class ResidentResponseDto
{
    public long ResidentId { get; init; }
    public long Id { get; init; }
    public string? CaseControlNo { get; init; }
    public string? InternalCode { get; init; }
    public string? ResidentCode { get; init; }
    public long? SafehouseId { get; init; }
    public string? SafehouseName { get; init; }
    public string? CaseStatus { get; init; }
    public string? Sex { get; init; }
    public string? DateOfBirth { get; init; }
    public string? BirthStatus { get; init; }
    public string? PlaceOfBirth { get; init; }
    public string? Religion { get; init; }
    public string? CaseCategory { get; init; }
    public bool? SubCatOrphaned { get; init; }
    public bool? SubCatTrafficked { get; init; }
    public bool? SubCatChildLabor { get; init; }
    public bool? SubCatPhysicalAbuse { get; init; }
    public bool? SubCatSexualAbuse { get; init; }
    public bool? SubCatOsaec { get; init; }
    public bool? SubCatCicl { get; init; }
    public bool? SubCatAtRisk { get; init; }
    public bool? SubCatStreetChild { get; init; }
    public bool? SubCatChildWithHiv { get; init; }
    public bool? IsPwd { get; init; }
    public string? PwdType { get; init; }
    public bool? HasSpecialNeeds { get; init; }
    public string? SpecialNeedsDiagnosis { get; init; }
    public bool? FamilyIs4Ps { get; init; }
    public bool? FamilySoloParent { get; init; }
    public bool? FamilyIndigenous { get; init; }
    public bool? FamilyParentPwd { get; init; }
    public bool? FamilyInformalSettler { get; init; }
    public string? DateOfAdmission { get; init; }
    public string? AdmissionDate { get; init; }
    public string? AgeUponAdmission { get; init; }
    public string? PresentAge { get; init; }
    public string? LengthOfStay { get; init; }
    public string? ReferralSource { get; init; }
    public string? ReferringAgencyPerson { get; init; }
    public string? DateColbRegistered { get; init; }
    public string? DateColbObtained { get; init; }
    public string? AssignedSocialWorker { get; init; }
    public string? AssignedWorkerName { get; init; }
    public string? InitialCaseAssessment { get; init; }
    public string? DateCaseStudyPrepared { get; init; }
    public string? ReintegrationType { get; init; }
    public string? ReintegrationStatus { get; init; }
    public string? InitialRiskLevel { get; init; }
    public string? CurrentRiskLevel { get; init; }
    public string? RiskLevel { get; init; }
    public string? DateEnrolled { get; init; }
    public string? DateClosed { get; init; }
    public string? DischargeDate { get; init; }
    public string? CreatedAt { get; init; }
    public string? NotesRestricted { get; init; }
    public double? RegressionRiskScore { get; init; }
    public string? RegressionRiskBand { get; init; }
    public JsonDocument? RegressionRiskDrivers { get; init; }
    public string? RegressionRecommendedAction { get; init; }
    public string? RegressionScoreUpdatedAt { get; init; }
    public double? ReintegrationReadinessScore { get; init; }
    public string? ReintegrationReadinessBand { get; init; }
    public JsonDocument? ReintegrationReadinessDrivers { get; init; }
    public string? ReintegrationRecommendedAction { get; init; }
    public string? ReintegrationScoreUpdatedAt { get; init; }
    public bool? MlScoresRestricted { get; init; }
}
