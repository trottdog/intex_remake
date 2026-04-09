using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class EducationRecordConfiguration : IEntityTypeConfiguration<EducationRecord>
{
    public void Configure(EntityTypeBuilder<EducationRecord> builder)
    {
        builder.ToTable("education_records");
        builder.HasKey(x => x.EducationRecordId);
        builder.Property(x => x.EducationRecordId).HasColumnName("education_record_id").ValueGeneratedOnAdd();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id");
        builder.Property(x => x.RecordDate).HasColumnName("record_date");
        builder.Property(x => x.EducationLevel).HasColumnName("education_level");
        builder.Property(x => x.SchoolName).HasColumnName("school_name");
        builder.Property(x => x.EnrollmentStatus).HasColumnName("enrollment_status");
        builder.Property(x => x.AttendanceRate).HasColumnName("attendance_rate").HasColumnType("numeric");
        builder.Property(x => x.ProgressPercent).HasColumnName("progress_percent").HasColumnType("numeric");
        builder.Property(x => x.CompletionStatus).HasColumnName("completion_status");
        builder.Property(x => x.Notes).HasColumnName("notes");
    }
}
