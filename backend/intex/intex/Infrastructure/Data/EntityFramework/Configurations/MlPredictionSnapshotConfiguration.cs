using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class MlPredictionSnapshotConfiguration : IEntityTypeConfiguration<MlPredictionSnapshot>
{
    public void Configure(EntityTypeBuilder<MlPredictionSnapshot> builder)
    {
        builder.ToTable("ml_prediction_snapshots");
        builder.HasKey(x => x.PredictionId);
        builder.Property(x => x.PredictionId).HasColumnName("prediction_id").ValueGeneratedOnAdd();
        builder.Property(x => x.RunId).HasColumnName("run_id").IsRequired();
        builder.Property(x => x.PipelineName).HasColumnName("pipeline_name").IsRequired();
        builder.Property(x => x.EntityType).HasColumnName("entity_type").IsRequired();
        builder.Property(x => x.EntityId).HasColumnName("entity_id");
        builder.Property(x => x.EntityKey).HasColumnName("entity_key").IsRequired();
        builder.Property(x => x.EntityLabel).HasColumnName("entity_label");
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.RecordTimestamp).HasColumnName("record_timestamp");
        builder.Property(x => x.PredictionValue).HasColumnName("prediction_value");
        builder.Property(x => x.PredictionScore).HasColumnName("prediction_score").IsRequired();
        builder.Property(x => x.RankOrder).HasColumnName("rank_order").IsRequired();
        builder.Property(x => x.ContextJson).HasColumnName("context_json").HasColumnType("jsonb");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(x => x.BandLabel).HasColumnName("band_label");
        builder.Property(x => x.ActionCode).HasColumnName("action_code");
    }
}
