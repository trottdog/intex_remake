using System.Net.Http.Headers;
using System.Text.Json;
using BCrypt.Net;
using Intex.Infrastructure.Auth;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace intex.Tests.TestHost;

public sealed class BeaconApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"beacon-tests-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:BeaconDb"] = "Host=test;Database=test",
                ["Jwt:Secret"] = "0123456789abcdef0123456789abcdef0123456789abcdef",
                ["Jwt:Issuer"] = "beacon-test-api",
                ["Jwt:Audience"] = "beacon-test-frontend",
                ["Cors:AllowedOrigins:0"] = "https://frontend.test"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<BeaconDbContext>>();
            services.RemoveAll<BeaconDbContext>();

            services.AddDbContext<BeaconDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<BeaconDbContext>();
            Seed(dbContext);
        });
    }

    public async Task<string> LoginAndGetTokenAsync(string username, string password)
    {
        using var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.PostAsJsonAsync("/api/auth/login", new { username, password });
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("token").GetString()!;
    }

    public async Task<HttpClient> CreateAuthenticatedClientAsync(string username, string password)
    {
        var token = await LoginAndGetTokenAsync(username, password);
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static void Seed(BeaconDbContext dbContext)
    {
        dbContext.Database.EnsureDeleted();
        dbContext.Database.EnsureCreated();

        var now = DateTimeOffset.Parse("2025-01-15T12:00:00Z");
        var passwordHash = BCrypt.Net.BCrypt.HashPassword("Password123!", workFactor: 12);

        var safehouse = new Safehouse
        {
            Id = 1,
            Name = "Beacon House",
            Location = "Salt Lake City",
            Capacity = 20,
            CurrentOccupancy = 8,
            ProgramAreas = ["recovery", "education"],
            Status = "active",
            ContactName = "Safehouse Lead",
            ContactEmail = "lead@beacon.test",
            CreatedAt = now,
            UpdatedAt = now
        };

        var donorSupporter = new Supporter
        {
            Id = 1,
            FirstName = "Donna",
            LastName = "Donor",
            Email = "donor@beacon.test",
            SupportType = "individual",
            LifetimeGiving = 1500m,
            LastGiftDate = "2025-01-01",
            LastGiftAmount = 250m,
            IsRecurring = true,
            Interests = ["education"],
            CreatedAt = now,
            UpdatedAt = now
        };

        var deleteSupporter = new Supporter
        {
            Id = 2,
            FirstName = "Delete",
            LastName = "Me",
            Email = "delete-me@beacon.test",
            SupportType = "individual",
            LifetimeGiving = 0m,
            IsRecurring = false,
            Interests = [],
            CreatedAt = now,
            UpdatedAt = now
        };

        var donorUser = new User
        {
            Id = 1,
            Username = "donor.user",
            Email = "donor.user@beacon.test",
            PasswordHash = passwordHash,
            FirstName = "Donna",
            LastName = "Donor",
            Role = AuthRoles.Donor,
            IsActive = true,
            MfaEnabled = false,
            SupporterId = donorSupporter.Id,
            CreatedAt = now,
            UpdatedAt = now
        };

        var adminUser = new User
        {
            Id = 2,
            Username = "admin.user",
            Email = "admin.user@beacon.test",
            PasswordHash = passwordHash,
            FirstName = "Ada",
            LastName = "Admin",
            Role = AuthRoles.Admin,
            IsActive = true,
            MfaEnabled = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Safehouses.Add(safehouse);
        dbContext.Supporters.AddRange(donorSupporter, deleteSupporter);
        dbContext.Users.AddRange(donorUser, adminUser);
        dbContext.StaffSafehouseAssignments.AddRange(
            new StaffSafehouseAssignment { Id = 1, UserId = donorUser.Id, SafehouseId = safehouse.Id, CreatedAt = now },
            new StaffSafehouseAssignment { Id = 2, UserId = adminUser.Id, SafehouseId = safehouse.Id, CreatedAt = now });
        dbContext.Residents.Add(new Resident
        {
            Id = 1,
            ResidentCode = "R-1001",
            SafehouseId = safehouse.Id,
            AssignedWorkerId = adminUser.Id,
            CaseStatus = "active",
            CaseCategory = "recovery",
            RiskLevel = "high",
            ReintegrationStatus = "not_started",
            AdmissionDate = "2025-01-10",
            LastUpdated = now,
            CreatedAt = now
        });
        dbContext.CaseConferences.Add(new CaseConference
        {
            Id = 1,
            ResidentId = 1,
            SafehouseId = safehouse.Id,
            ScheduledDate = "2025-01-20",
            Status = "scheduled",
            Attendees = ["Ada Admin"],
            CreatedAt = now,
            UpdatedAt = now
        });
        dbContext.IncidentReports.Add(new IncidentReport
        {
            Id = 1,
            ResidentId = 1,
            SafehouseId = safehouse.Id,
            ReportedBy = adminUser.Id,
            IncidentDate = "2025-01-12",
            IncidentType = "behavioral",
            Severity = "high",
            Status = "open",
            Description = "Escalation event",
            FollowUpRequired = true,
            CreatedAt = now,
            UpdatedAt = now
        });
        dbContext.SocialMediaPosts.Add(new SocialMediaPost
        {
            Id = 1,
            Platform = "instagram",
            PostType = "story",
            Content = "Impact update",
            PostDate = "2025-01-14",
            TimeWindow = "18:00-20:00",
            Likes = 50,
            Shares = 12,
            Comments = 8,
            Reach = 500,
            EngagementRate = 14m,
            DonationReferrals = 3,
            DonationValueFromPost = 125m,
            CreatedAt = now,
            UpdatedAt = now
        });
        dbContext.Donations.Add(new Donation
        {
            Id = 1,
            SupporterId = donorSupporter.Id,
            DonationType = "monetary",
            Amount = 250m,
            Currency = "USD",
            Campaign = "winter",
            SafehouseId = safehouse.Id,
            DonationDate = "2025-01-01",
            ReceiptUrl = "https://example.test/receipt/1",
            Notes = "First gift",
            IsAnonymous = false,
            CreatedAt = now,
            UpdatedAt = now
        });
        dbContext.DonationAllocations.Add(new DonationAllocation
        {
            Id = 1,
            DonationId = 1,
            SafehouseId = safehouse.Id,
            ProgramArea = "education",
            Amount = 150m,
            Percentage = 60m,
            CreatedAt = now
        });
        dbContext.ImpactSnapshots.Add(new ImpactSnapshot
        {
            Id = 1,
            Title = "Q1 Snapshot",
            Period = "2025-Q1",
            IsPublished = true,
            PublishedAt = now,
            ResidentsServed = 25,
            TotalDonationsAmount = 5000m,
            SafehousesCovered = 1,
            ReintegrationCount = 2,
            Summary = "Quarterly progress",
            CreatedAt = now,
            UpdatedAt = now
        });

        dbContext.SaveChanges();
    }
}
