using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class SafehouseMonthlyMetricConfiguration : IEntityTypeConfiguration<SafehouseMonthlyMetric>
{
    public void Configure(EntityTypeBuilder<SafehouseMonthlyMetric> builder)
    {
        builder.ToTable("safehouse_monthly_metrics");
        builder.HasKey(x => x.MetricId);
        builder.Property(x => x.MetricId).HasColumnName("metric_id").ValueGeneratedOnAdd();
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.MonthStart).HasColumnName("month_start");
        builder.Property(x => x.MonthEnd).HasColumnName("month_end");
        builder.Property(x => x.ActiveResidents).HasColumnName("active_residents");
        builder.Property(x => x.AvgEducationProgress).HasColumnName("avg_education_progress").HasColumnType("numeric");
        builder.Property(x => x.AvgHealthScore).HasColumnName("avg_health_score").HasColumnType("numeric");
        builder.Property(x => x.ProcessRecordingCount).HasColumnName("process_recording_count");
        builder.Property(x => x.HomeVisitationCount).HasColumnName("home_visitation_count");
        builder.Property(x => x.IncidentCount).HasColumnName("incident_count");
        builder.Property(x => x.Notes).HasColumnName("notes");
        builder.Property(x => x.CompositeHealthScore).HasColumnName("composite_health_score");
        builder.Property(x => x.PeerRank).HasColumnName("peer_rank");
        builder.Property(x => x.HealthBand).HasColumnName("health_band");
        builder.Property(x => x.TrendDirection).HasColumnName("trend_direction");
        builder.Property(x => x.HealthScoreDrivers).HasColumnName("health_score_drivers").HasColumnType("jsonb");
        builder.Property(x => x.IncidentSeverityDistribution).HasColumnName("incident_severity_distribution").HasColumnType("jsonb");
        builder.Property(x => x.HealthScoreComputedAt).HasColumnName("health_score_computed_at");
        builder.Property(x => x.HealthScoreRunId).HasColumnName("health_score_run_id");
    }
}
