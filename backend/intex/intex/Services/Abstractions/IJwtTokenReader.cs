namespace backend.intex.Services.Abstractions;

public interface IJwtTokenReader
{
    int? TryReadUserId(string? authorizationHeader);
}
