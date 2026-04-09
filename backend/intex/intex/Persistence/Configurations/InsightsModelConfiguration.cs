using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Intex.Persistence.Configurations;

internal static class InsightsModelConfiguration
{
    public static void ApplyInsightsConfiguration(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SocialMediaPost>(entity =>
        {
            entity.ToTable("social_media_posts");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_social_media_posts_platform", "platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Platform).HasColumnName("platform").HasColumnType("text");
            entity.Property(x => x.PostType).HasColumnName("post_type").HasColumnType("text");
            entity.Property(x => x.Content).HasColumnName("content").HasColumnType("text");
            entity.Property(x => x.PostDate).HasColumnName("post_date").HasColumnType("text");
            entity.Property(x => x.TimeWindow).HasColumnName("time_window").HasColumnType("text");
            entity.Property(x => x.Likes).HasColumnName("likes").HasDefaultValue(0);
            entity.Property(x => x.Shares).HasColumnName("shares").HasDefaultValue(0);
            entity.Property(x => x.Comments).HasColumnName("comments").HasDefaultValue(0);
            entity.Property(x => x.Reach).HasColumnName("reach").HasDefaultValue(0);
            entity.Property(x => x.EngagementRate).HasColumnName("engagement_rate").HasColumnType("numeric(6,4)").HasDefaultValue(0m);
            entity.Property(x => x.DonationReferrals).HasColumnName("donation_referrals").HasDefaultValue(0);
            entity.Property(x => x.DonationValueFromPost).HasColumnName("donation_value_from_post").HasColumnType("numeric(12,2)").HasDefaultValue(0m);
            entity.Property(x => x.PredictedConversionScore).HasColumnName("predicted_conversion_score").HasColumnType("numeric(5,4)");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<SafehouseMonthlyMetric>(entity =>
        {
            entity.ToTable("safehouse_monthly_metrics");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.SafehouseId).HasDatabaseName("idx_metrics_safehouse");
            entity.HasIndex(x => new { x.SafehouseId, x.Month }).IsUnique().HasDatabaseName("idx_metrics_safehouse_month");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.Month).HasColumnName("month").HasColumnType("text");
            entity.Property(x => x.ActiveResidents).HasColumnName("active_residents").HasDefaultValue(0);
            entity.Property(x => x.NewAdmissions).HasColumnName("new_admissions").HasDefaultValue(0);
            entity.Property(x => x.Discharges).HasColumnName("discharges").HasDefaultValue(0);
            entity.Property(x => x.IncidentCount).HasColumnName("incident_count").HasDefaultValue(0);
            entity.Property(x => x.ProcessRecordingCount).HasColumnName("process_recording_count").HasDefaultValue(0);
            entity.Property(x => x.VisitCount).HasColumnName("visit_count").HasDefaultValue(0);
            entity.Property(x => x.AvgHealthScore).HasColumnName("avg_health_score").HasColumnType("numeric(5,2)");
            entity.Property(x => x.AvgEducationProgress).HasColumnName("avg_education_progress").HasColumnType("numeric(5,2)");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.MonthlyMetrics)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ImpactSnapshot>(entity =>
        {
            entity.ToTable("impact_snapshots");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Title).HasColumnName("title").HasColumnType("text");
            entity.Property(x => x.Period).HasColumnName("period").HasColumnType("text");
            entity.Property(x => x.IsPublished).HasColumnName("is_published").HasDefaultValue(false);
            entity.Property(x => x.PublishedAt).HasColumnName("published_at").HasColumnType("timestamp with time zone");
            entity.Property(x => x.ResidentsServed).HasColumnName("residents_served").HasDefaultValue(0);
            entity.Property(x => x.TotalDonationsAmount).HasColumnName("total_donations_amount").HasColumnType("numeric(12,2)").HasDefaultValue(0m);
            entity.Property(x => x.ProgramOutcomes).HasColumnName("program_outcomes").HasColumnType("jsonb").HasDefaultValueSql("'{}'");
            entity.Property(x => x.SafehousesCovered).HasColumnName("safehouses_covered").HasDefaultValue(0);
            entity.Property(x => x.ReintegrationCount).HasColumnName("reintegration_count").HasDefaultValue(0);
            entity.Property(x => x.Summary).HasColumnName("summary").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<MlPipelineRun>(entity =>
        {
            entity.ToTable("ml_pipeline_runs");
            entity.HasKey(x => x.Id);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_ml_pipeline_runs_status", "status IN ('active', 'training', 'degraded', 'offline')");
                t.HasCheckConstraint("CK_ml_pipeline_runs_health_status", "health_status IN ('healthy', 'degraded', 'action_required')");
            });
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Name).HasColumnName("name").HasColumnType("text");
            entity.Property(x => x.Description).HasColumnName("description").HasColumnType("text").HasDefaultValue(string.Empty);
            entity.Property(x => x.Status).HasColumnName("status").HasColumnType("text").HasDefaultValue("active");
            entity.Property(x => x.ModelVersion).HasColumnName("model_version").HasColumnType("text");
            entity.Property(x => x.LastRetrained).HasColumnName("last_retrained").HasColumnType("text");
            entity.Property(x => x.PredictionCount).HasColumnName("prediction_count").HasDefaultValue(0);
            entity.Property(x => x.AvgConfidence).HasColumnName("avg_confidence").HasColumnType("numeric(5,4)").HasDefaultValue(0m);
            entity.Property(x => x.DriftFlags).HasColumnName("drift_flags").HasDefaultValue(0);
            entity.Property(x => x.OverrideRate).HasColumnName("override_rate").HasColumnType("numeric(5,4)").HasDefaultValue(0m);
            entity.Property(x => x.HealthStatus).HasColumnName("health_status").HasColumnType("text").HasDefaultValue("healthy");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<MlPredictionSnapshot>(entity =>
        {
            entity.ToTable("ml_prediction_snapshots");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => new { x.EntityType, x.EntityId }).HasDatabaseName("idx_ml_pred_entity");
            entity.HasIndex(x => x.Pipeline).HasDatabaseName("idx_ml_pred_pipeline");
            entity.Property(x => x.Pipeline).HasColumnName("pipeline").HasColumnType("text");
            entity.Property(x => x.EntityType).HasColumnName("entity_type").HasColumnType("text");
            entity.Property(x => x.EntityId).HasColumnName("entity_id");
            entity.Property(x => x.PredictionValue).HasColumnName("prediction_value").HasColumnType("numeric(8,6)");
            entity.Property(x => x.ConfidenceScore).HasColumnName("confidence_score").HasColumnType("numeric(5,4)");
            entity.Property(x => x.RiskBand).HasColumnName("risk_band").HasColumnType("text");
            entity.Property(x => x.TopFeatures).HasColumnName("top_features").HasColumnType("jsonb").HasDefaultValueSql("'[]'");
            entity.Property(x => x.RecommendedAction).HasColumnName("recommended_action").HasColumnType("text");
            entity.Property(x => x.ModelVersion).HasColumnName("model_version").HasColumnType("text");
            entity.Property(x => x.PredictedAt).HasColumnName("predicted_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<ReportDonationTrend>(entity =>
        {
            entity.ToTable("report_donation_trends");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Period).HasColumnName("period").HasColumnType("text");
            entity.Property(x => x.TotalAmount).HasColumnName("total_amount").HasColumnType("numeric(12,2)");
            entity.Property(x => x.DonorCount).HasColumnName("donor_count");
            entity.Property(x => x.NewDonors).HasColumnName("new_donors");
            entity.Property(x => x.RecurringRevenue).HasColumnName("recurring_revenue").HasColumnType("numeric(12,2)");
            entity.Property(x => x.AvgGiftSize).HasColumnName("avg_gift_size").HasColumnType("numeric(10,2)");
            entity.Property(x => x.RetentionRate).HasColumnName("retention_rate").HasColumnType("numeric(5,4)");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<ReportAccomplishment>(entity =>
        {
            entity.ToTable("report_accomplishments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Year).HasColumnName("year");
            entity.Property(x => x.ServiceArea).HasColumnName("service_area").HasColumnType("text");
            entity.Property(x => x.Category).HasColumnName("category").HasColumnType("text");
            entity.Property(x => x.BeneficiaryCount).HasColumnName("beneficiary_count");
            entity.Property(x => x.SessionsDelivered).HasColumnName("sessions_delivered");
            entity.Property(x => x.OutcomeSummary).HasColumnName("outcome_summary").HasColumnType("text");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<ReportReintegrationStat>(entity =>
        {
            entity.ToTable("report_reintegration_stats");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Period).HasColumnName("period").HasColumnType("text");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.SafehouseName).HasColumnName("safehouse_name").HasColumnType("text");
            entity.Property(x => x.TotalResidents).HasColumnName("total_residents");
            entity.Property(x => x.ReintegrationCompleted).HasColumnName("reintegration_completed");
            entity.Property(x => x.AvgDaysToReintegration).HasColumnName("avg_days_to_reintegration").HasColumnType("numeric(8,2)");
            entity.Property(x => x.SuccessRate).HasColumnName("success_rate").HasColumnType("numeric(5,4)");
            entity.Property(x => x.AvgHealthScoreAtDischarge).HasColumnName("avg_health_score_at_discharge").HasColumnType("numeric(5,2)");
            entity.Property(x => x.AvgEducationProgressAtDischarge).HasColumnName("avg_education_progress_at_discharge").HasColumnType("numeric(5,2)");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.ReportReintegrationStats)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.ActorId).HasDatabaseName("idx_audit_actor");
            entity.HasIndex(x => new { x.EntityType, x.EntityId }).HasDatabaseName("idx_audit_entity");
            entity.HasIndex(x => x.CreatedAt).HasDatabaseName("idx_audit_created").IsDescending();
            entity.Property(x => x.ActorId).HasColumnName("actor_id");
            entity.Property(x => x.ActorName).HasColumnName("actor_name").HasColumnType("text");
            entity.Property(x => x.ActorRole).HasColumnName("actor_role").HasColumnType("text");
            entity.Property(x => x.Action).HasColumnName("action").HasColumnType("text");
            entity.Property(x => x.EntityType).HasColumnName("entity_type").HasColumnType("text");
            entity.Property(x => x.EntityId).HasColumnName("entity_id");
            entity.Property(x => x.EntityDescription).HasColumnName("entity_description").HasColumnType("text");
            entity.Property(x => x.Details).HasColumnName("details").HasColumnType("jsonb").HasDefaultValueSql("'{}'");
            entity.Property(x => x.IpAddress).HasColumnName("ip_address").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });
    }
}
