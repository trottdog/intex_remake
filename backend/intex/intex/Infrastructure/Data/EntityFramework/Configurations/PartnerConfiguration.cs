using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class PartnerConfiguration : IEntityTypeConfiguration<Partner>
{
    public void Configure(EntityTypeBuilder<Partner> builder)
    {
        builder.ToTable("partners");
        builder.HasKey(x => x.PartnerId);
        builder.Property(x => x.PartnerId).HasColumnName("partner_id").ValueGeneratedOnAdd();
        builder.Property(x => x.PartnerName).HasColumnName("partner_name");
        builder.Property(x => x.PartnerType).HasColumnName("partner_type");
        builder.Property(x => x.RoleType).HasColumnName("role_type");
        builder.Property(x => x.ContactName).HasColumnName("contact_name");
        builder.Property(x => x.Email).HasColumnName("email");
        builder.Property(x => x.Phone).HasColumnName("phone");
        builder.Property(x => x.Region).HasColumnName("region");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.StartDate).HasColumnName("start_date");
        builder.Property(x => x.EndDate).HasColumnName("end_date");
        builder.Property(x => x.Notes).HasColumnName("notes");
    }
}
