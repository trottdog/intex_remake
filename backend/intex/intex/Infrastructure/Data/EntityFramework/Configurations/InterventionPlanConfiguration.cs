using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class InterventionPlanConfiguration : IEntityTypeConfiguration<InterventionPlan>
{
    public void Configure(EntityTypeBuilder<InterventionPlan> builder)
    {
        builder.ToTable("intervention_plans");
        builder.HasKey(x => x.PlanId);
        builder.Property(x => x.PlanId).HasColumnName("plan_id").ValueGeneratedNever();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id");
        builder.Property(x => x.PlanCategory).HasColumnName("plan_category");
        builder.Property(x => x.PlanDescription).HasColumnName("plan_description");
        builder.Property(x => x.ServicesProvided).HasColumnName("services_provided");
        builder.Property(x => x.TargetValue).HasColumnName("target_value").HasColumnType("numeric");
        builder.Property(x => x.TargetDate).HasColumnName("target_date");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.CaseConferenceDate).HasColumnName("case_conference_date");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp");
        builder.Property(x => x.EffectivenessOutcomeScore).HasColumnName("effectiveness_outcome_score");
        builder.Property(x => x.EffectivenessBand).HasColumnName("effectiveness_band");
        builder.Property(x => x.EffectivenessOutcomeDrivers).HasColumnName("effectiveness_outcome_drivers").HasColumnType("jsonb");
        builder.Property(x => x.EffectivenessScoreUpdatedAt).HasColumnName("effectiveness_score_updated_at");
    }
}
