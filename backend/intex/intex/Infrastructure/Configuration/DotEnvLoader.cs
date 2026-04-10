namespace backend.intex.Infrastructure.Configuration;

internal static class DotEnvLoader
{
    public static void LoadFromCurrentDirectory()
    {
        var currentDirectory = Directory.GetCurrentDirectory();
        foreach (var candidate in GetCandidatePaths(currentDirectory))
        {
            if (!File.Exists(candidate))
            {
                continue;
            }

            Load(candidate);
            return;
        }
    }

    public static void Load(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        foreach (var rawLine in File.ReadAllLines(path))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
            {
                continue;
            }

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = line[..separatorIndex].Trim();
            if (string.IsNullOrWhiteSpace(key) || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
            {
                continue;
            }

            var value = line[(separatorIndex + 1)..].Trim();
            if (value.Length >= 2 &&
                ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\''))))
            {
                value = value[1..^1];
            }

            Environment.SetEnvironmentVariable(key, value);
        }
    }

    private static IEnumerable<string> GetCandidatePaths(string startDirectory)
    {
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var current = new DirectoryInfo(startDirectory);

        while (current is not null)
        {
            var directCandidate = Path.Combine(current.FullName, ".env");
            if (visited.Add(directCandidate))
            {
                yield return directCandidate;
            }

            var backendProjectCandidate = Path.Combine(current.FullName, "backend", "intex", "intex", ".env");
            if (visited.Add(backendProjectCandidate))
            {
                yield return backendProjectCandidate;
            }

            current = current.Parent;
        }

        var appBaseCandidate = Path.Combine(AppContext.BaseDirectory, ".env");
        if (visited.Add(appBaseCandidate))
        {
            yield return appBaseCandidate;
        }
    }
}
