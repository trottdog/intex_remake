using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class CaseConferenceConfiguration : IEntityTypeConfiguration<CaseConference>
{
    public void Configure(EntityTypeBuilder<CaseConference> builder)
    {
        builder.ToTable("case_conferences");
        builder.HasKey(x => x.ConferenceId);
        builder.Property(x => x.ConferenceId).HasColumnName("conference_id").ValueGeneratedOnAdd();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id").IsRequired();
        builder.Property(x => x.ConferenceDate).HasColumnName("conference_date").IsRequired();
        builder.Property(x => x.ConferenceType).HasColumnName("conference_type");
        builder.Property(x => x.Summary).HasColumnName("summary");
        builder.Property(x => x.DecisionsMade).HasColumnName("decisions_made");
        builder.Property(x => x.NextSteps).HasColumnName("next_steps");
        builder.Property(x => x.NextConferenceDate).HasColumnName("next_conference_date");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
    }
}
