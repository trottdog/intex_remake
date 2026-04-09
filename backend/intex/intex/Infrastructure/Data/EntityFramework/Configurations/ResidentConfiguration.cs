using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class ResidentConfiguration : IEntityTypeConfiguration<Resident>
{
    public void Configure(EntityTypeBuilder<Resident> builder)
    {
        builder.ToTable("residents");
        builder.HasKey(x => x.ResidentId);
        builder.Property(x => x.ResidentId).HasColumnName("resident_id").ValueGeneratedOnAdd();
        builder.Property(x => x.CaseControlNo).HasColumnName("case_control_no");
        builder.Property(x => x.InternalCode).HasColumnName("internal_code");
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.CaseStatus).HasColumnName("case_status");
        builder.Property(x => x.Sex).HasColumnName("sex");
        builder.Property(x => x.DateOfBirth).HasColumnName("date_of_birth");
        builder.Property(x => x.BirthStatus).HasColumnName("birth_status");
        builder.Property(x => x.PlaceOfBirth).HasColumnName("place_of_birth");
        builder.Property(x => x.Religion).HasColumnName("religion");
        builder.Property(x => x.CaseCategory).HasColumnName("case_category");
        builder.Property(x => x.SubCatOrphaned).HasColumnName("sub_cat_orphaned");
        builder.Property(x => x.SubCatTrafficked).HasColumnName("sub_cat_trafficked");
        builder.Property(x => x.SubCatChildLabor).HasColumnName("sub_cat_child_labor");
        builder.Property(x => x.SubCatPhysicalAbuse).HasColumnName("sub_cat_physical_abuse");
        builder.Property(x => x.SubCatSexualAbuse).HasColumnName("sub_cat_sexual_abuse");
        builder.Property(x => x.SubCatOsaec).HasColumnName("sub_cat_osaec");
        builder.Property(x => x.SubCatCicl).HasColumnName("sub_cat_cicl");
        builder.Property(x => x.SubCatAtRisk).HasColumnName("sub_cat_at_risk");
        builder.Property(x => x.SubCatStreetChild).HasColumnName("sub_cat_street_child");
        builder.Property(x => x.SubCatChildWithHiv).HasColumnName("sub_cat_child_with_hiv");
        builder.Property(x => x.IsPwd).HasColumnName("is_pwd");
        builder.Property(x => x.PwdType).HasColumnName("pwd_type");
        builder.Property(x => x.HasSpecialNeeds).HasColumnName("has_special_needs");
        builder.Property(x => x.SpecialNeedsDiagnosis).HasColumnName("special_needs_diagnosis");
        builder.Property(x => x.FamilyIs4Ps).HasColumnName("family_is_4ps");
        builder.Property(x => x.FamilySoloParent).HasColumnName("family_solo_parent");
        builder.Property(x => x.FamilyIndigenous).HasColumnName("family_indigenous");
        builder.Property(x => x.FamilyParentPwd).HasColumnName("family_parent_pwd");
        builder.Property(x => x.FamilyInformalSettler).HasColumnName("family_informal_settler");
        builder.Property(x => x.DateOfAdmission).HasColumnName("date_of_admission");
        builder.Property(x => x.AgeUponAdmission).HasColumnName("age_upon_admission");
        builder.Property(x => x.PresentAge).HasColumnName("present_age");
        builder.Property(x => x.LengthOfStay).HasColumnName("length_of_stay");
        builder.Property(x => x.ReferralSource).HasColumnName("referral_source");
        builder.Property(x => x.ReferringAgencyPerson).HasColumnName("referring_agency_person");
        builder.Property(x => x.DateColbRegistered).HasColumnName("date_colb_registered");
        builder.Property(x => x.DateColbObtained).HasColumnName("date_colb_obtained");
        builder.Property(x => x.AssignedSocialWorker).HasColumnName("assigned_social_worker");
        builder.Property(x => x.InitialCaseAssessment).HasColumnName("initial_case_assessment");
        builder.Property(x => x.DateCaseStudyPrepared).HasColumnName("date_case_study_prepared");
        builder.Property(x => x.ReintegrationType).HasColumnName("reintegration_type");
        builder.Property(x => x.ReintegrationStatus).HasColumnName("reintegration_status");
        builder.Property(x => x.InitialRiskLevel).HasColumnName("initial_risk_level");
        builder.Property(x => x.CurrentRiskLevel).HasColumnName("current_risk_level");
        builder.Property(x => x.DateEnrolled).HasColumnName("date_enrolled");
        builder.Property(x => x.DateClosed).HasColumnName("date_closed");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp");
        builder.Property(x => x.NotesRestricted).HasColumnName("notes_restricted");
        builder.Property(x => x.RegressionRiskScore).HasColumnName("regression_risk_score");
        builder.Property(x => x.RegressionRiskBand).HasColumnName("regression_risk_band");
        builder.Property(x => x.RegressionRiskDrivers).HasColumnName("regression_risk_drivers").HasColumnType("jsonb");
        builder.Property(x => x.RegressionRecommendedAction).HasColumnName("regression_recommended_action");
        builder.Property(x => x.RegressionScoreUpdatedAt).HasColumnName("regression_score_updated_at");
        builder.Property(x => x.ReintegrationReadinessScore).HasColumnName("reintegration_readiness_score");
        builder.Property(x => x.ReintegrationReadinessBand).HasColumnName("reintegration_readiness_band");
        builder.Property(x => x.ReintegrationReadinessDrivers).HasColumnName("reintegration_readiness_drivers").HasColumnType("jsonb");
        builder.Property(x => x.ReintegrationRecommendedAction).HasColumnName("reintegration_recommended_action");
        builder.Property(x => x.ReintegrationScoreUpdatedAt).HasColumnName("reintegration_score_updated_at");
        builder.Property(x => x.MlScoresRestricted).HasColumnName("ml_scores_restricted");
    }
}
