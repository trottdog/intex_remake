namespace Intex.Infrastructure.Auth.Passwords;

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}
