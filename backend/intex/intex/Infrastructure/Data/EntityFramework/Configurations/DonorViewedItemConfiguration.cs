using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class DonorViewedItemConfiguration : IEntityTypeConfiguration<DonorViewedItem>
{
    public void Configure(EntityTypeBuilder<DonorViewedItem> builder)
    {
        builder.ToTable("donor_viewed_items");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(x => x.SupporterId).HasColumnName("supporter_id");
        builder.Property(x => x.ItemType).HasColumnName("item_type");
        builder.Property(x => x.ItemId).HasColumnName("item_id");
        builder.Property(x => x.ViewedAt).HasColumnName("viewed_at").HasColumnType("timestamp");
    }
}
