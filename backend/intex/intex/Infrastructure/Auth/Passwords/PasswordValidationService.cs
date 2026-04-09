namespace Intex.Infrastructure.Auth.Passwords;

public sealed class PasswordValidationService : IPasswordValidationService
{
    public PasswordValidationResult ValidateFirstFailure(string password)
    {
        if (password.Length < 12)
        {
            return PasswordValidationResult.Failure("Password must be at least 12 characters");
        }

        if (!password.Any(char.IsUpper))
        {
            return PasswordValidationResult.Failure("Password must contain an uppercase letter");
        }

        if (!password.Any(char.IsLower))
        {
            return PasswordValidationResult.Failure("Password must contain a lowercase letter");
        }

        if (!password.Any(char.IsDigit))
        {
            return PasswordValidationResult.Failure("Password must contain a digit");
        }

        if (!password.Any(static c => !char.IsLetterOrDigit(c)))
        {
            return PasswordValidationResult.Failure("Password must contain a special character");
        }

        return PasswordValidationResult.Success();
    }

    public PasswordValidationResult ValidateAggregatedForChangePassword(string password)
    {
        List<string> failures = [];

        if (password.Length < 12)
        {
            failures.Add("at least 12 characters");
        }

        if (!password.Any(char.IsUpper))
        {
            failures.Add("an uppercase letter");
        }

        if (!password.Any(char.IsLower))
        {
            failures.Add("a lowercase letter");
        }

        if (!password.Any(char.IsDigit))
        {
            failures.Add("a digit");
        }

        if (!password.Any(static c => !char.IsLetterOrDigit(c)))
        {
            failures.Add("a special character");
        }

        return failures.Count == 0
            ? PasswordValidationResult.Success()
            : PasswordValidationResult.Failure($"Password must contain: {string.Join(", ", failures)}");
    }
}
