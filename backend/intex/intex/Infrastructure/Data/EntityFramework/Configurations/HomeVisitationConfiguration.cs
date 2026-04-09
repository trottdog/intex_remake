using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class HomeVisitationConfiguration : IEntityTypeConfiguration<HomeVisitation>
{
    public void Configure(EntityTypeBuilder<HomeVisitation> builder)
    {
        builder.ToTable("home_visitations");
        builder.HasKey(x => x.VisitationId);
        builder.Property(x => x.VisitationId).HasColumnName("visitation_id").ValueGeneratedOnAdd();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id");
        builder.Property(x => x.VisitDate).HasColumnName("visit_date");
        builder.Property(x => x.SocialWorker).HasColumnName("social_worker");
        builder.Property(x => x.VisitType).HasColumnName("visit_type");
        builder.Property(x => x.LocationVisited).HasColumnName("location_visited");
        builder.Property(x => x.FamilyMembersPresent).HasColumnName("family_members_present");
        builder.Property(x => x.Purpose).HasColumnName("purpose");
        builder.Property(x => x.Observations).HasColumnName("observations");
        builder.Property(x => x.FamilyCooperationLevel).HasColumnName("family_cooperation_level");
        builder.Property(x => x.SafetyConcernsNoted).HasColumnName("safety_concerns_noted");
        builder.Property(x => x.FollowUpNeeded).HasColumnName("follow_up_needed");
        builder.Property(x => x.FollowUpNotes).HasColumnName("follow_up_notes");
        builder.Property(x => x.VisitOutcome).HasColumnName("visit_outcome");
    }
}
