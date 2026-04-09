namespace Intex.Infrastructure.Auth.Passwords;

public interface IPasswordValidationService
{
    PasswordValidationResult ValidateFirstFailure(string password);
    PasswordValidationResult ValidateAggregatedForChangePassword(string password);
}
