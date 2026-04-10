using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class InKindDonationItemConfiguration : IEntityTypeConfiguration<InKindDonationItem>
{
    public void Configure(EntityTypeBuilder<InKindDonationItem> builder)
    {
        builder.ToTable("in_kind_donation_items");
        builder.HasKey(x => x.ItemId);
        builder.Property(x => x.ItemId).HasColumnName("item_id").ValueGeneratedNever();
        builder.Property(x => x.DonationId).HasColumnName("donation_id");
        builder.Property(x => x.ItemName).HasColumnName("item_name");
        builder.Property(x => x.ItemCategory).HasColumnName("item_category");
        builder.Property(x => x.Quantity).HasColumnName("quantity").HasColumnType("numeric");
        builder.Property(x => x.UnitOfMeasure).HasColumnName("unit_of_measure");
        builder.Property(x => x.EstimatedUnitValue).HasColumnName("estimated_unit_value").HasColumnType("numeric");
        builder.Property(x => x.IntendedUse).HasColumnName("intended_use");
        builder.Property(x => x.ReceivedCondition).HasColumnName("received_condition");
    }
}
