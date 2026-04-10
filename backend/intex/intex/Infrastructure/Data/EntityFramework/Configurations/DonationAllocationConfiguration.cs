using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class DonationAllocationConfiguration : IEntityTypeConfiguration<DonationAllocation>
{
    public void Configure(EntityTypeBuilder<DonationAllocation> builder)
    {
        builder.ToTable("donation_allocations");
        builder.HasKey(x => x.AllocationId);
        builder.Property(x => x.AllocationId).HasColumnName("allocation_id").ValueGeneratedNever();
        builder.Property(x => x.DonationId).HasColumnName("donation_id");
        builder.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
        builder.Property(x => x.ProgramArea).HasColumnName("program_area");
        builder.Property(x => x.AmountAllocated).HasColumnName("amount_allocated").HasColumnType("numeric");
        builder.Property(x => x.AllocationDate).HasColumnName("allocation_date");
        builder.Property(x => x.AllocationNotes).HasColumnName("allocation_notes");
    }
}
