namespace backend.intex.Infrastructure.Configuration;

public sealed class SupabaseOptions
{
    public const string SectionName = "Supabase";

    public string ProjectRef { get; init; } = string.Empty;

    public string PoolerHost { get; init; } = string.Empty;

    public int PoolerPort { get; init; } = 6543;

    public string Database { get; init; } = "postgres";

    public bool UsePgbouncer { get; init; } = true;

    public bool RequireSsl { get; init; } = true;
}
