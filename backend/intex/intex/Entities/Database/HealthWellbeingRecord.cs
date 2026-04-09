namespace backend.intex.Entities.Database;

public sealed class HealthWellbeingRecord
{
    public long HealthRecordId { get; init; }
    public long? ResidentId { get; init; }
    public DateOnly? RecordDate { get; init; }
    public decimal? GeneralHealthScore { get; init; }
    public decimal? NutritionScore { get; init; }
    public decimal? SleepQualityScore { get; init; }
    public decimal? EnergyLevelScore { get; init; }
    public decimal? HeightCm { get; init; }
    public decimal? WeightKg { get; init; }
    public decimal? Bmi { get; init; }
    public bool? MedicalCheckupDone { get; init; }
    public bool? DentalCheckupDone { get; init; }
    public bool? PsychologicalCheckupDone { get; init; }
    public string? Notes { get; init; }
}
