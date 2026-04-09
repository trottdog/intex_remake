using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class PartnerAssignmentConfiguration : IEntityTypeConfiguration<PartnerAssignment>
{
    public void Configure(EntityTypeBuilder<PartnerAssignment> builder)
    {
        builder.ToTable("partner_assignments");
        builder.HasKey(x => x.AssignmentId);
        builder.Property(x => x.AssignmentId).HasColumnName("assignment_id").ValueGeneratedOnAdd();
        builder.Property(x => x.PartnerId).HasColumnName("partner_id");
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.ProgramArea).HasColumnName("program_area");
        builder.Property(x => x.AssignmentStart).HasColumnName("assignment_start");
        builder.Property(x => x.AssignmentEnd).HasColumnName("assignment_end");
        builder.Property(x => x.ResponsibilityNotes).HasColumnName("responsibility_notes");
        builder.Property(x => x.IsPrimary).HasColumnName("is_primary");
        builder.Property(x => x.Status).HasColumnName("status");
    }
}
