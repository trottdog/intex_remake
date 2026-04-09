using System.Net;
using backend.intex;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace intex.Tests;

public sealed class ApiPipelineTests(ApiPipelineTests.TestAppFactory factory) : IClassFixture<ApiPipelineTests.TestAppFactory>
{
    [Fact]
    public async Task Healthz_ReturnsOk_AndSecurityHeaders()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/healthz");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("X-Content-Type-Options"));
        Assert.True(response.Headers.Contains("X-Frame-Options"));
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
    }

    [Fact]
    public async Task DonorSummary_WithoutToken_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/api/dashboard/donor-summary");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    public sealed class TestAppFactory : WebApplicationFactory<Program>
    {
        public TestAppFactory()
        {
            Environment.SetEnvironmentVariable("DATABASE_URL", "Host=localhost;Port=5432;Database=intex_test;Username=test;Password=test");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                var inMemoryConfig = new Dictionary<string, string?>
                {
                    ["ConnectionStrings:PostgreSql"] = "Host=localhost;Port=5432;Database=intex_test;Username=test;Password=test"
                };

                configBuilder.AddInMemoryCollection(inMemoryConfig);
            });
        }
    }
}
