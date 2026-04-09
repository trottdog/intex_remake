using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class SafehouseConfiguration : IEntityTypeConfiguration<Safehouse>
{
    public void Configure(EntityTypeBuilder<Safehouse> builder)
    {
        builder.ToTable("safehouses");
        builder.HasKey(x => x.SafehouseId);
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id").ValueGeneratedOnAdd();
        builder.Property(x => x.SafehouseCode).HasColumnName("safehouse_code");
        builder.Property(x => x.Name).HasColumnName("name");
        builder.Property(x => x.Region).HasColumnName("region");
        builder.Property(x => x.City).HasColumnName("city");
        builder.Property(x => x.Province).HasColumnName("province");
        builder.Property(x => x.Country).HasColumnName("country");
        builder.Property(x => x.OpenDate).HasColumnName("open_date");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.CapacityGirls).HasColumnName("capacity_girls");
        builder.Property(x => x.CapacityStaff).HasColumnName("capacity_staff");
        builder.Property(x => x.CurrentOccupancy).HasColumnName("current_occupancy");
        builder.Property(x => x.Notes).HasColumnName("notes");
    }
}
