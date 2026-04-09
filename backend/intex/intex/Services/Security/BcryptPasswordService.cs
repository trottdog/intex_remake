using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Security;

public sealed class BcryptPasswordService : IPasswordService
{
    private const int WorkFactor = 12;

    public string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public bool Verify(string password, string passwordHash) => BCrypt.Net.BCrypt.Verify(password, passwordHash);
}
