using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(x => x.Username).HasColumnName("username").IsRequired();
        builder.Property(x => x.Email).HasColumnName("email").IsRequired();
        builder.Property(x => x.PasswordHash).HasColumnName("password_hash").IsRequired();
        builder.Property(x => x.FirstName).HasColumnName("first_name").IsRequired();
        builder.Property(x => x.LastName).HasColumnName("last_name").IsRequired();
        builder.Property(x => x.Role).HasColumnName("role").IsRequired();
        builder.Property(x => x.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(x => x.MfaEnabled).HasColumnName("mfa_enabled").IsRequired();
        builder.Property(x => x.LastLogin).HasColumnName("last_login");
        builder.Property(x => x.SupporterId).HasColumnName("supporter_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
    }
}
