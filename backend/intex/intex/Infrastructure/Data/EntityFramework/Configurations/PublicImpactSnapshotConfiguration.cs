using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class PublicImpactSnapshotConfiguration : IEntityTypeConfiguration<PublicImpactSnapshot>
{
    public void Configure(EntityTypeBuilder<PublicImpactSnapshot> builder)
    {
        builder.ToTable("public_impact_snapshots");
        builder.HasKey(x => x.SnapshotId);
        builder.Property(x => x.SnapshotId).HasColumnName("snapshot_id").ValueGeneratedOnAdd();
        builder.Property(x => x.SnapshotDate).HasColumnName("snapshot_date");
        builder.Property(x => x.Headline).HasColumnName("headline");
        builder.Property(x => x.SummaryText).HasColumnName("summary_text");
        builder.Property(x => x.MetricPayloadJson).HasColumnName("metric_payload_json").HasColumnType("jsonb");
        builder.Property(x => x.IsPublished).HasColumnName("is_published");
        builder.Property(x => x.PublishedAt).HasColumnName("published_at").HasColumnType("timestamp");
        builder.Property(x => x.ProjectedGapPhp30d).HasColumnName("projected_gap_php_30d").HasColumnType("numeric");
        builder.Property(x => x.FundingGapBand).HasColumnName("funding_gap_band");
        builder.Property(x => x.FundingGapUpdatedAt).HasColumnName("funding_gap_updated_at");
    }
}
