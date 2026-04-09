using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Intex.Persistence.Configurations;

internal static class CaseManagementModelConfiguration
{
    public static void ApplyCaseManagementConfiguration(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Resident>(entity =>
        {
            entity.ToTable("residents");
            entity.HasKey(x => x.Id);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_residents_case_status", "case_status IN ('active', 'closed', 'transferred', 'deceased')");
                t.HasCheckConstraint("CK_residents_risk_level", "risk_level IN ('low', 'medium', 'high', 'critical')");
                t.HasCheckConstraint("CK_residents_reintegration_status", "reintegration_status IN ('not_started', 'in_progress', 'ready', 'completed')");
            });
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.ResidentCode).HasColumnName("resident_code").HasColumnType("text");
            entity.HasIndex(x => x.ResidentCode).IsUnique();
            entity.HasIndex(x => x.SafehouseId).HasDatabaseName("idx_residents_safehouse");
            entity.HasIndex(x => x.AssignedWorkerId).HasDatabaseName("idx_residents_worker");
            entity.HasIndex(x => x.CaseStatus).HasDatabaseName("idx_residents_status");
            entity.HasIndex(x => x.RiskLevel).HasDatabaseName("idx_residents_risk");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.AssignedWorkerId).HasColumnName("assigned_worker_id");
            entity.Property(x => x.CaseStatus).HasColumnName("case_status").HasColumnType("text").HasDefaultValue("active");
            entity.Property(x => x.CaseCategory).HasColumnName("case_category").HasColumnType("text");
            entity.Property(x => x.RiskLevel).HasColumnName("risk_level").HasColumnType("text").HasDefaultValue("medium");
            entity.Property(x => x.ReintegrationStatus).HasColumnName("reintegration_status").HasColumnType("text").HasDefaultValue("not_started");
            entity.Property(x => x.AdmissionDate).HasColumnName("admission_date").HasColumnType("text");
            entity.Property(x => x.DischargeDate).HasColumnName("discharge_date").HasColumnType("text");
            entity.Property(x => x.AgeGroup).HasColumnName("age_group").HasColumnType("text");
            entity.Property(x => x.LastUpdated).HasColumnName("last_updated").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.Residents)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.AssignedWorker)
                .WithMany(x => x.AssignedResidents)
                .HasForeignKey(x => x.AssignedWorkerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProcessRecording>(entity =>
        {
            entity.ToTable("process_recordings");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.ResidentId).HasDatabaseName("idx_proc_rec_resident");
            entity.HasIndex(x => x.WorkerId).HasDatabaseName("idx_proc_rec_worker");
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.WorkerId).HasColumnName("worker_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.SessionDate).HasColumnName("session_date").HasColumnType("text");
            entity.Property(x => x.Duration).HasColumnName("duration");
            entity.Property(x => x.EmotionalStateStart).HasColumnName("emotional_state_start").HasColumnType("text");
            entity.Property(x => x.EmotionalStateEnd).HasColumnName("emotional_state_end").HasColumnType("text");
            entity.Property(x => x.ProgressNoted).HasColumnName("progress_noted").HasDefaultValue(false);
            entity.Property(x => x.ConcernFlag).HasColumnName("concern_flag").HasDefaultValue(false);
            entity.Property(x => x.ReferralMade).HasColumnName("referral_made").HasDefaultValue(false);
            entity.Property(x => x.FollowUpRequired).HasColumnName("follow_up_required").HasDefaultValue(false);
            entity.Property(x => x.SessionNotes).HasColumnName("session_notes").HasColumnType("text");
            entity.Property(x => x.Tags).HasColumnName("tags").HasColumnType("text[]").HasDefaultValueSql("'{}'");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.ProcessRecordings)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Worker)
                .WithMany(x => x.ProcessRecordings)
                .HasForeignKey(x => x.WorkerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.ProcessRecordings)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HomeVisitation>(entity =>
        {
            entity.ToTable("home_visitations");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_home_visitations_outcome", "outcome IN ('favorable', 'unfavorable', 'neutral', 'safety_concern')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.ResidentId).HasDatabaseName("idx_home_vis_resident");
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.WorkerId).HasColumnName("worker_id");
            entity.Property(x => x.VisitDate).HasColumnName("visit_date").HasColumnType("text");
            entity.Property(x => x.Outcome).HasColumnName("outcome").HasColumnType("text");
            entity.Property(x => x.CooperationLevel).HasColumnName("cooperation_level").HasColumnType("text");
            entity.Property(x => x.SafetyConcern).HasColumnName("safety_concern").HasDefaultValue(false);
            entity.Property(x => x.FollowUpRequired).HasColumnName("follow_up_required").HasDefaultValue(false);
            entity.Property(x => x.FollowUpDue).HasColumnName("follow_up_due").HasColumnType("text");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.HomeVisitations)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Worker)
                .WithMany(x => x.HomeVisitations)
                .HasForeignKey(x => x.WorkerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CaseConference>(entity =>
        {
            entity.ToTable("case_conferences");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_case_conferences_status", "status IN ('scheduled', 'completed', 'cancelled', 'overdue')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.ResidentId).HasDatabaseName("idx_case_conf_resident");
            entity.HasIndex(x => x.Status).HasDatabaseName("idx_case_conf_status");
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.ScheduledDate).HasColumnName("scheduled_date").HasColumnType("text");
            entity.Property(x => x.CompletedDate).HasColumnName("completed_date").HasColumnType("text");
            entity.Property(x => x.Status).HasColumnName("status").HasColumnType("text").HasDefaultValue("scheduled");
            entity.Property(x => x.Attendees).HasColumnName("attendees").HasColumnType("text[]").HasDefaultValueSql("'{}'");
            entity.Property(x => x.Decisions).HasColumnName("decisions").HasColumnType("text");
            entity.Property(x => x.NextSteps).HasColumnName("next_steps").HasColumnType("text");
            entity.Property(x => x.NextConferenceDate).HasColumnName("next_conference_date").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.CaseConferences)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.CaseConferences)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InterventionPlan>(entity =>
        {
            entity.ToTable("intervention_plans");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_intervention_plans_status", "status IN ('open', 'in_progress', 'completed', 'overdue', 'cancelled')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.ResidentId).HasDatabaseName("idx_interv_resident");
            entity.HasIndex(x => x.Status).HasDatabaseName("idx_interv_status");
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.WorkerId).HasColumnName("worker_id");
            entity.Property(x => x.Category).HasColumnName("category").HasColumnType("text");
            entity.Property(x => x.Title).HasColumnName("title").HasColumnType("text");
            entity.Property(x => x.Status).HasColumnName("status").HasColumnType("text").HasDefaultValue("open");
            entity.Property(x => x.TargetDate).HasColumnName("target_date").HasColumnType("text");
            entity.Property(x => x.CompletedDate).HasColumnName("completed_date").HasColumnType("text");
            entity.Property(x => x.Services).HasColumnName("services").HasColumnType("text[]").HasDefaultValueSql("'{}'");
            entity.Property(x => x.Milestones).HasColumnName("milestones").HasColumnType("text[]").HasDefaultValueSql("'{}'");
            entity.Property(x => x.SuccessProbability).HasColumnName("success_probability").HasColumnType("numeric(5,4)");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.InterventionPlans)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.InterventionPlans)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Worker)
                .WithMany(x => x.InterventionPlans)
                .HasForeignKey(x => x.WorkerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<IncidentReport>(entity =>
        {
            entity.ToTable("incident_reports");
            entity.HasKey(x => x.Id);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_incident_reports_severity", "severity IN ('low', 'medium', 'high', 'critical')");
                t.HasCheckConstraint("CK_incident_reports_status", "status IN ('open', 'under_review', 'resolved', 'escalated')");
            });
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.SafehouseId).HasDatabaseName("idx_incident_safehouse");
            entity.HasIndex(x => x.Severity).HasDatabaseName("idx_incident_severity");
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.ReportedBy).HasColumnName("reported_by");
            entity.Property(x => x.IncidentDate).HasColumnName("incident_date").HasColumnType("text");
            entity.Property(x => x.IncidentType).HasColumnName("incident_type").HasColumnType("text");
            entity.Property(x => x.Severity).HasColumnName("severity").HasColumnType("text");
            entity.Property(x => x.Status).HasColumnName("status").HasColumnType("text").HasDefaultValue("open");
            entity.Property(x => x.Description).HasColumnName("description").HasColumnType("text");
            entity.Property(x => x.Resolution).HasColumnName("resolution").HasColumnType("text");
            entity.Property(x => x.ResolutionDate).HasColumnName("resolution_date").HasColumnType("text");
            entity.Property(x => x.FollowUpRequired).HasColumnName("follow_up_required").HasDefaultValue(false);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.IncidentReports)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.IncidentReports)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Reporter)
                .WithMany(x => x.IncidentReports)
                .HasForeignKey(x => x.ReportedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EducationRecord>(entity =>
        {
            entity.ToTable("education_records");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.RecordDate).HasColumnName("record_date").HasColumnType("text");
            entity.Property(x => x.EducationLevel).HasColumnName("education_level").HasColumnType("text");
            entity.Property(x => x.EnrollmentStatus).HasColumnName("enrollment_status").HasColumnType("text");
            entity.Property(x => x.ProgressScore).HasColumnName("progress_score").HasColumnType("numeric(5,2)");
            entity.Property(x => x.ProgramType).HasColumnName("program_type").HasColumnType("text");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.EducationRecords)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HealthRecord>(entity =>
        {
            entity.ToTable("health_records");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.ResidentId).HasColumnName("resident_id");
            entity.Property(x => x.RecordDate).HasColumnName("record_date").HasColumnType("text");
            entity.Property(x => x.HealthScore).HasColumnName("health_score").HasColumnType("numeric(5,2)");
            entity.Property(x => x.MentalHealthStatus).HasColumnName("mental_health_status").HasColumnType("text");
            entity.Property(x => x.PhysicalHealthStatus).HasColumnName("physical_health_status").HasColumnType("text");
            entity.Property(x => x.TraumaProgress).HasColumnName("trauma_progress").HasColumnType("text");
            entity.Property(x => x.MedicationStatus).HasColumnName("medication_status").HasColumnType("text");
            entity.Property(x => x.NextAppointment).HasColumnName("next_appointment").HasColumnType("text");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Resident)
                .WithMany(x => x.HealthRecords)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
