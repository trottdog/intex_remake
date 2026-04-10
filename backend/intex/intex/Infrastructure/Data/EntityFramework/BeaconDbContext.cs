using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace backend.intex.Infrastructure.Data.EntityFramework;

public sealed class BeaconDbContext(DbContextOptions<BeaconDbContext> options) : DbContext(options)
{
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<ProgramUpdate> ProgramUpdates => Set<ProgramUpdate>();
    public DbSet<MlPipelineRun> MlPipelineRuns => Set<MlPipelineRun>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<StaffSafehouseAssignment> StaffSafehouseAssignments => Set<StaffSafehouseAssignment>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<MlPredictionSnapshot> MlPredictionSnapshots => Set<MlPredictionSnapshot>();
    public DbSet<DonorViewedItem> DonorViewedItems => Set<DonorViewedItem>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BeaconDbContext).Assembly);
        ApplyTimestampWithoutTimeZoneConverters(modelBuilder);
        base.OnModelCreating(modelBuilder);
    }

    private static void ApplyTimestampWithoutTimeZoneConverters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (!string.Equals(property.GetColumnType(), "timestamp", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(TimestampWithoutTimeZoneDateTimeConverter.Instance);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(NullableTimestampWithoutTimeZoneDateTimeConverter.Instance);
                }
            }
        }
    }

    private sealed class TimestampWithoutTimeZoneDateTimeConverter : ValueConverter<DateTime, DateTime>
    {
        public static readonly TimestampWithoutTimeZoneDateTimeConverter Instance = new();

        private TimestampWithoutTimeZoneDateTimeConverter()
            : base(
                value => value.Kind == DateTimeKind.Unspecified
                    ? value
                    : DateTime.SpecifyKind(value, DateTimeKind.Unspecified),
                value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
        {
        }
    }

    private sealed class NullableTimestampWithoutTimeZoneDateTimeConverter : ValueConverter<DateTime?, DateTime?>
    {
        public static readonly NullableTimestampWithoutTimeZoneDateTimeConverter Instance = new();

        private NullableTimestampWithoutTimeZoneDateTimeConverter()
            : base(
                value => value.HasValue
                    ? value.Value.Kind == DateTimeKind.Unspecified
                        ? value
                        : DateTime.SpecifyKind(value.Value, DateTimeKind.Unspecified)
                    : value,
                value => value.HasValue
                    ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
                    : value)
        {
        }
    }
}
