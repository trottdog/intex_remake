namespace backend.intex.Infrastructure.Configuration;

public sealed class AzureHostingOptions
{
    public const string SectionName = "AzureHosting";

    public bool UseForwardedHeaders { get; init; } = true;

    public bool UseHsts { get; init; } = true;
}
