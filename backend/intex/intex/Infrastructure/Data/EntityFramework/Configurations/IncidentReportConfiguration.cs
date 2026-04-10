using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class IncidentReportConfiguration : IEntityTypeConfiguration<IncidentReport>
{
    public void Configure(EntityTypeBuilder<IncidentReport> builder)
    {
        builder.ToTable("incident_reports");
        builder.HasKey(x => x.IncidentId);
        builder.Property(x => x.IncidentId).HasColumnName("incident_id").ValueGeneratedNever();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id");
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.IncidentDate).HasColumnName("incident_date");
        builder.Property(x => x.IncidentType).HasColumnName("incident_type");
        builder.Property(x => x.Severity).HasColumnName("severity");
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.ResponseTaken).HasColumnName("response_taken");
        builder.Property(x => x.Resolved).HasColumnName("resolved");
        builder.Property(x => x.ResolutionDate).HasColumnName("resolution_date");
        builder.Property(x => x.ReportedBy).HasColumnName("reported_by");
        builder.Property(x => x.FollowUpRequired).HasColumnName("follow_up_required");
        builder.Property(x => x.Status).HasColumnName("status");
    }
}
