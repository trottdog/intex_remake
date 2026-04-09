namespace Intex.Infrastructure.Auth.Passwords;

public sealed record PasswordValidationResult(bool IsValid, string? ErrorMessage)
{
    public static PasswordValidationResult Success() => new(true, null);

    public static PasswordValidationResult Failure(string errorMessage) => new(false, errorMessage);
}
