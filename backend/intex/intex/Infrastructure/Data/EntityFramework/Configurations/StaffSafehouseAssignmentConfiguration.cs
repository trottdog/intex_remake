using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class StaffSafehouseAssignmentConfiguration : IEntityTypeConfiguration<StaffSafehouseAssignment>
{
    public void Configure(EntityTypeBuilder<StaffSafehouseAssignment> builder)
    {
        builder.ToTable("staff_safehouse_assignments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(x => x.UserId).HasColumnName("user_id").HasColumnType("varchar").IsRequired();
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id").IsRequired();
    }
}
