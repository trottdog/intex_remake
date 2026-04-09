using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class HealthWellbeingRecordConfiguration : IEntityTypeConfiguration<HealthWellbeingRecord>
{
    public void Configure(EntityTypeBuilder<HealthWellbeingRecord> builder)
    {
        builder.ToTable("health_wellbeing_records");
        builder.HasKey(x => x.HealthRecordId);
        builder.Property(x => x.HealthRecordId).HasColumnName("health_record_id").ValueGeneratedOnAdd();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id");
        builder.Property(x => x.RecordDate).HasColumnName("record_date");
        builder.Property(x => x.GeneralHealthScore).HasColumnName("general_health_score").HasColumnType("numeric");
        builder.Property(x => x.NutritionScore).HasColumnName("nutrition_score").HasColumnType("numeric");
        builder.Property(x => x.SleepQualityScore).HasColumnName("sleep_quality_score").HasColumnType("numeric");
        builder.Property(x => x.EnergyLevelScore).HasColumnName("energy_level_score").HasColumnType("numeric");
        builder.Property(x => x.HeightCm).HasColumnName("height_cm").HasColumnType("numeric");
        builder.Property(x => x.WeightKg).HasColumnName("weight_kg").HasColumnType("numeric");
        builder.Property(x => x.Bmi).HasColumnName("bmi").HasColumnType("numeric");
        builder.Property(x => x.MedicalCheckupDone).HasColumnName("medical_checkup_done");
        builder.Property(x => x.DentalCheckupDone).HasColumnName("dental_checkup_done");
        builder.Property(x => x.PsychologicalCheckupDone).HasColumnName("psychological_checkup_done");
        builder.Property(x => x.Notes).HasColumnName("notes");
    }
}
