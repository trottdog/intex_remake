using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Infrastructure.Data.EntityFramework;

internal static class EntityJsonMerge
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static TEntity DeserializeEntity<TEntity>(IReadOnlyDictionary<string, JsonElement> fields)
        where TEntity : class =>
        JsonSerializer.Deserialize<TEntity>(JsonSerializer.Serialize(fields, JsonOptions), JsonOptions)
        ?? throw new InvalidOperationException("The request body is invalid.");

    public static void ApplyMergedValues<TEntity>(DbContext dbContext, TEntity entity, IReadOnlyDictionary<string, JsonElement> fields)
        where TEntity : class
    {
        var merged = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(entity, JsonOptions),
            JsonOptions) ?? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, value) in fields)
        {
            merged[key] = value;
        }

        var updated = JsonSerializer.Deserialize<TEntity>(JsonSerializer.Serialize(merged, JsonOptions), JsonOptions)
            ?? throw new InvalidOperationException("The request body is invalid.");

        dbContext.Entry(entity).CurrentValues.SetValues(updated);
    }
}
