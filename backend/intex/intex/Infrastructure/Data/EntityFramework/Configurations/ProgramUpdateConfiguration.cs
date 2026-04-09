using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class ProgramUpdateConfiguration : IEntityTypeConfiguration<ProgramUpdate>
{
    public void Configure(EntityTypeBuilder<ProgramUpdate> builder)
    {
        builder.ToTable("program_updates");
        builder.HasKey(x => x.UpdateId);
        builder.Property(x => x.UpdateId).HasColumnName("update_id").ValueGeneratedOnAdd();
        builder.Property(x => x.Title).HasColumnName("title").IsRequired();
        builder.Property(x => x.Summary).HasColumnName("summary");
        builder.Property(x => x.Category).HasColumnName("category");
        builder.Property(x => x.IsPublished).HasColumnName("is_published");
        builder.Property(x => x.PublishedAt).HasColumnName("published_at").HasColumnType("timestamp");
        builder.Property(x => x.CreatedBy).HasColumnName("created_by");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp");
    }
}
