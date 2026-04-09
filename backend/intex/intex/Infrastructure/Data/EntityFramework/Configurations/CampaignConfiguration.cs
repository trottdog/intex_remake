using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> builder)
    {
        builder.ToTable("campaigns");
        builder.HasKey(x => x.CampaignId);
        builder.Property(x => x.CampaignId).HasColumnName("campaign_id").ValueGeneratedOnAdd();
        builder.Property(x => x.Title).HasColumnName("title").IsRequired();
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.Category).HasColumnName("category");
        builder.Property(x => x.Goal).HasColumnName("goal").HasColumnType("numeric");
        builder.Property(x => x.Deadline).HasColumnName("deadline");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp");
    }
}
