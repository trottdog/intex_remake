namespace backend.intex.Services.Abstractions;

public interface IPasswordService
{
    string HashPassword(string password);
    bool Verify(string password, string passwordHash);
}
