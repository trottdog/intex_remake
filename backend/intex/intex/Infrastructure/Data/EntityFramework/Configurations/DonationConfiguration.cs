using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class DonationConfiguration : IEntityTypeConfiguration<Donation>
{
    public void Configure(EntityTypeBuilder<Donation> builder)
    {
        builder.ToTable("donations");
        builder.HasKey(x => x.DonationId);
        builder.Property(x => x.DonationId).HasColumnName("donation_id").ValueGeneratedOnAdd();
        builder.Property(x => x.SupporterId).HasColumnName("supporter_id");
        builder.Property(x => x.CampaignId).HasColumnName("campaign_id");
        builder.Property(x => x.DonationType).HasColumnName("donation_type");
        builder.Property(x => x.DonationDate).HasColumnName("donation_date");
        builder.Property(x => x.IsRecurring).HasColumnName("is_recurring");
        builder.Property(x => x.CampaignName).HasColumnName("campaign_name");
        builder.Property(x => x.ChannelSource).HasColumnName("channel_source");
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code");
        builder.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric");
        builder.Property(x => x.EstimatedValue).HasColumnName("estimated_value").HasColumnType("numeric");
        builder.Property(x => x.ImpactUnit).HasColumnName("impact_unit");
        builder.Property(x => x.Notes).HasColumnName("notes");
        builder.Property(x => x.ReferralPostId).HasColumnName("referral_post_id");
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.AttributedOutcomeScore).HasColumnName("attributed_outcome_score");
        builder.Property(x => x.AttributionRunId).HasColumnName("attribution_run_id");
    }
}
