namespace backend.intex.Infrastructure.Auth;

public static class PasswordRules
{
    public static string? Validate(string? password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
        {
            return "Password must be at least 12 characters";
        }

        if (!password.Any(char.IsUpper))
        {
            return "Password must contain at least one uppercase letter";
        }

        if (!password.Any(char.IsLower))
        {
            return "Password must contain at least one lowercase letter";
        }

        if (!password.Any(char.IsDigit))
        {
            return "Password must contain at least one digit";
        }

        if (password.All(char.IsLetterOrDigit))
        {
            return "Password must contain at least one special character";
        }

        return null;
    }
}
