using Intex.Persistence.Configurations;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Intex.Persistence;

public sealed class BeaconDbContext(DbContextOptions<BeaconDbContext> options) : DbContext(options)
{
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<User> Users => Set<User>();
    public DbSet<StaffSafehouseAssignment> StaffSafehouseAssignments => Set<StaffSafehouseAssignment>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<CaseConference> CaseConferences => Set<CaseConference>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthRecord> HealthRecords => Set<HealthRecord>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<ImpactSnapshot> ImpactSnapshots => Set<ImpactSnapshot>();
    public DbSet<MlPipelineRun> MlPipelineRuns => Set<MlPipelineRun>();
    public DbSet<MlPredictionSnapshot> MlPredictionSnapshots => Set<MlPredictionSnapshot>();
    public DbSet<ReportDonationTrend> ReportDonationTrends => Set<ReportDonationTrend>();
    public DbSet<ReportAccomplishment> ReportAccomplishments => Set<ReportAccomplishment>();
    public DbSet<ReportReintegrationStat> ReportReintegrationStats => Set<ReportReintegrationStat>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("public");

        modelBuilder.ApplyFoundationConfiguration();
        modelBuilder.ApplyCaseManagementConfiguration();
        modelBuilder.ApplyInsightsConfiguration();
    }
}
