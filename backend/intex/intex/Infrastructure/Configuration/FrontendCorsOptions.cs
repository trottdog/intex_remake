namespace backend.intex.Infrastructure.Configuration;

public sealed class FrontendCorsOptions
{
    public const string SectionName = "Cors";
    public const string PolicyName = "FrontendCors";

    public string[] AllowedOrigins { get; set; } = [];
}
