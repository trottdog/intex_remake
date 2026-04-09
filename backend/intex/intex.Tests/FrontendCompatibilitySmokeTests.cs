using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using intex.Tests.TestHost;

namespace intex.Tests;

public sealed class FrontendCompatibilitySmokeTests(BeaconApiFactory factory) : IClassFixture<BeaconApiFactory>
{
    [Fact]
    public async Task Login_Returns_Token_And_User()
    {
        using var client = factory.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            username = "donor.user",
            password = "Password123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(document.RootElement.TryGetProperty("token", out var token));
        Assert.False(string.IsNullOrWhiteSpace(token.GetString()));
        Assert.True(document.RootElement.TryGetProperty("user", out var user));
        Assert.Equal("donor", user.GetProperty("role").GetString());
        Assert.Equal(JsonValueKind.Array, user.GetProperty("safehouses").ValueKind);
    }

    [Fact]
    public async Task AuthMe_Returns_Null_When_Unauthenticated_And_User_When_Authenticated()
    {
        using var anonymousClient = factory.CreateClient();
        using var anonymousResponse = await anonymousClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, anonymousResponse.StatusCode);

        using (var anonymousDocument = JsonDocument.Parse(await anonymousResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal(JsonValueKind.Null, anonymousDocument.RootElement.GetProperty("user").ValueKind);
        }

        using var authedClient = await factory.CreateAuthenticatedClientAsync("donor.user", "Password123!");
        using var authedResponse = await authedClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, authedResponse.StatusCode);

        using var authedDocument = JsonDocument.Parse(await authedResponse.Content.ReadAsStringAsync());
        Assert.Equal("donor.user", authedDocument.RootElement.GetProperty("user").GetProperty("username").GetString());
    }

    [Fact]
    public async Task PublicImpact_Is_Accessible_Without_Authentication()
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/dashboard/public-impact");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Number, document.RootElement.GetProperty("totalDonationsRaised").ValueKind);
        Assert.Equal(JsonValueKind.Array, document.RootElement.GetProperty("recentSnapshots").ValueKind);
    }

    [Fact]
    public async Task Donor_Dashboard_And_Ledger_Return_Expected_Shapes()
    {
        using var client = await factory.CreateAuthenticatedClientAsync("donor.user", "Password123!");

        using var summaryResponse = await client.GetAsync("/api/dashboard/donor-summary");
        Assert.Equal(HttpStatusCode.OK, summaryResponse.StatusCode);
        using (var summaryDocument = JsonDocument.Parse(await summaryResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal(JsonValueKind.Number, summaryDocument.RootElement.GetProperty("lifetimeGiving").ValueKind);
            Assert.Equal(JsonValueKind.Array, summaryDocument.RootElement.GetProperty("givingTrend").ValueKind);
        }

        using var ledgerResponse = await client.GetAsync("/api/donations/my-ledger?page=1&limit=10");
        Assert.Equal(HttpStatusCode.OK, ledgerResponse.StatusCode);
        using var ledgerDocument = JsonDocument.Parse(await ledgerResponse.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, ledgerDocument.RootElement.GetProperty("data").ValueKind);
        Assert.Equal(1, ledgerDocument.RootElement.GetProperty("pagination").GetProperty("page").GetInt32());
    }

    [Fact]
    public async Task Admin_Dashboard_And_Residents_List_Return_Expected_Shapes()
    {
        using var client = await factory.CreateAuthenticatedClientAsync("admin.user", "Password123!");

        using var summaryResponse = await client.GetAsync("/api/dashboard/admin-summary");
        Assert.Equal(HttpStatusCode.OK, summaryResponse.StatusCode);
        using (var summaryDocument = JsonDocument.Parse(await summaryResponse.Content.ReadAsStringAsync()))
        {
            Assert.Equal(JsonValueKind.Number, summaryDocument.RootElement.GetProperty("totalResidents").ValueKind);
            Assert.Equal(JsonValueKind.Array, summaryDocument.RootElement.GetProperty("priorityAlerts").ValueKind);
        }

        using var residentsResponse = await client.GetAsync("/api/residents?page=1&pageSize=10");
        Assert.Equal(HttpStatusCode.OK, residentsResponse.StatusCode);
        using var residentsDocument = JsonDocument.Parse(await residentsResponse.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, residentsDocument.RootElement.GetProperty("data").ValueKind);
        Assert.Equal(JsonValueKind.Object, residentsDocument.RootElement.GetProperty("pagination").ValueKind);
        Assert.Equal(string.Empty, residentsDocument.RootElement.GetProperty("data")[0].GetProperty("safehouseName").GetString());
    }

    [Fact]
    public async Task Unauthorized_Request_Returns_401_Error_Shape()
    {
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/dashboard/donor-summary");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(document.RootElement.TryGetProperty("error", out _));
    }

    [Fact]
    public async Task Forbidden_Request_Returns_403_Error_Shape()
    {
        using var client = await factory.CreateAuthenticatedClientAsync("donor.user", "Password123!");
        using var response = await client.GetAsync("/api/dashboard/admin-summary");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Insufficient permissions", document.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Delete_Returns_204_With_No_Response_Body()
    {
        using var client = await factory.CreateAuthenticatedClientAsync("admin.user", "Password123!");
        using var response = await client.DeleteAsync("/api/supporters/2");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(string.IsNullOrEmpty(body));
    }

    [Fact]
    public async Task Cors_Preflight_Allows_Configured_Frontend_Origin()
    {
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/dashboard/public-impact");
        request.Headers.Add("Origin", "https://frontend.test");
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var origins));
        Assert.Equal("https://frontend.test", origins.Single());
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Headers", out var headers));
        Assert.Contains(headers.Single(), value => value.Contains("Authorization", StringComparison.OrdinalIgnoreCase));
    }
}
