using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class MlPipelineRunConfiguration : IEntityTypeConfiguration<MlPipelineRun>
{
    public void Configure(EntityTypeBuilder<MlPipelineRun> builder)
    {
        builder.ToTable("ml_pipeline_runs");
        builder.HasKey(x => x.RunId);
        builder.Property(x => x.RunId).HasColumnName("run_id").ValueGeneratedOnAdd();
        builder.Property(x => x.PipelineName).HasColumnName("pipeline_name").IsRequired();
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.ModelName).HasColumnName("model_name");
        builder.Property(x => x.Status).HasColumnName("status").IsRequired();
        builder.Property(x => x.TrainedAt).HasColumnName("trained_at").IsRequired();
        builder.Property(x => x.DataSource).HasColumnName("data_source");
        builder.Property(x => x.SourceCommit).HasColumnName("source_commit");
        builder.Property(x => x.MetricsJson).HasColumnName("metrics_json").HasColumnType("jsonb");
        builder.Property(x => x.ManifestJson).HasColumnName("manifest_json").HasColumnType("jsonb");
        builder.Property(x => x.ScoredEntityCount).HasColumnName("scored_entity_count");
        builder.Property(x => x.FeatureImportanceJson).HasColumnName("feature_importance_json").HasColumnType("jsonb");
    }
}
