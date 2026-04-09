using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.Records;

public sealed class ListEducationRecordsQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
}

public sealed class ListHealthRecordsQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
}

public sealed class CreateEducationRecordRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateEducationRecordRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class CreateHealthRecordRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateHealthRecordRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class EducationRecordResponseDto
{
    public long EducationRecordId { get; init; }
    public long? ResidentId { get; init; }
    public string? RecordDate { get; init; }
    public string? EducationLevel { get; init; }
    public string? SchoolName { get; init; }
    public string? EnrollmentStatus { get; init; }
    public decimal? AttendanceRate { get; init; }
    public decimal? ProgressPercent { get; init; }
    public string? CompletionStatus { get; init; }
    public string? Notes { get; init; }
}

public sealed class HealthRecordResponseDto
{
    public long HealthRecordId { get; init; }
    public long? ResidentId { get; init; }
    public string? RecordDate { get; init; }
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
