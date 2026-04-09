using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Intex.Persistence.Configurations;

internal static class FoundationModelConfiguration
{
    public static void ApplyFoundationConfiguration(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Safehouse>(entity =>
        {
            entity.ToTable("safehouses");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_safehouses_status", "status IN ('active', 'inactive')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Name).HasColumnName("name").HasColumnType("text");
            entity.Property(x => x.Location).HasColumnName("location").HasColumnType("text");
            entity.Property(x => x.Capacity).HasColumnName("capacity").HasDefaultValue(0);
            entity.Property(x => x.CurrentOccupancy).HasColumnName("current_occupancy").HasDefaultValue(0);
            entity.Property(x => x.ProgramAreas).HasColumnName("program_areas").HasColumnType("text[]").HasDefaultValueSql("'{}'");
            entity.Property(x => x.Status).HasColumnName("status").HasColumnType("text").HasDefaultValue("active");
            entity.Property(x => x.ContactName).HasColumnName("contact_name").HasColumnType("text");
            entity.Property(x => x.ContactEmail).HasColumnName("contact_email").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<Partner>(entity =>
        {
            entity.ToTable("partners");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_partners_status", "status IN ('active', 'inactive')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Name).HasColumnName("name").HasColumnType("text");
            entity.Property(x => x.ProgramArea).HasColumnName("program_area").HasColumnType("text");
            entity.Property(x => x.ContactName).HasColumnName("contact_name").HasColumnType("text");
            entity.Property(x => x.ContactEmail).HasColumnName("contact_email").HasColumnType("text");
            entity.Property(x => x.Phone).HasColumnName("phone").HasColumnType("text");
            entity.Property(x => x.Status).HasColumnName("status").HasColumnType("text").HasDefaultValue("active");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<PartnerAssignment>(entity =>
        {
            entity.ToTable("partner_assignments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.PartnerId).HasColumnName("partner_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.ProgramArea).HasColumnName("program_area").HasColumnType("text");
            entity.Property(x => x.StartDate).HasColumnName("start_date").HasColumnType("text");
            entity.Property(x => x.EndDate).HasColumnName("end_date").HasColumnType("text");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Partner)
                .WithMany(x => x.PartnerAssignments)
                .HasForeignKey(x => x.PartnerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.PartnerAssignments)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Supporter>(entity =>
        {
            entity.ToTable("supporters");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_supporters_support_type", "support_type IN ('individual', 'corporate', 'foundation', 'government', 'other')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.FirstName).HasColumnName("first_name").HasColumnType("text");
            entity.Property(x => x.LastName).HasColumnName("last_name").HasColumnType("text");
            entity.Property(x => x.Email).HasColumnName("email").HasColumnType("text");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.Phone).HasColumnName("phone").HasColumnType("text");
            entity.Property(x => x.Organization).HasColumnName("organization").HasColumnType("text");
            entity.Property(x => x.SupportType).HasColumnName("support_type").HasColumnType("text").HasDefaultValue("individual");
            entity.Property(x => x.AcquisitionChannel).HasColumnName("acquisition_channel").HasColumnType("text");
            entity.Property(x => x.Segment).HasColumnName("segment").HasColumnType("text");
            entity.Property(x => x.ChurnRiskScore).HasColumnName("churn_risk_score").HasColumnType("numeric(5,4)");
            entity.Property(x => x.UpgradeScore).HasColumnName("upgrade_score").HasColumnType("numeric(5,4)");
            entity.Property(x => x.LifetimeGiving).HasColumnName("lifetime_giving").HasColumnType("numeric(12,2)").HasDefaultValue(0m);
            entity.Property(x => x.LastGiftDate).HasColumnName("last_gift_date").HasColumnType("text");
            entity.Property(x => x.LastGiftAmount).HasColumnName("last_gift_amount").HasColumnType("numeric(12,2)");
            entity.Property(x => x.IsRecurring).HasColumnName("is_recurring").HasDefaultValue(false);
            entity.Property(x => x.CommunicationPreference).HasColumnName("communication_preference").HasColumnType("text");
            entity.Property(x => x.Interests).HasColumnName("interests").HasColumnType("text[]").HasDefaultValueSql("'{}'");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_users_role", "role IN ('public', 'donor', 'staff', 'admin', 'super_admin')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.Username).HasColumnName("username").HasColumnType("text");
            entity.HasIndex(x => x.Username).IsUnique();
            entity.Property(x => x.Email).HasColumnName("email").HasColumnType("text");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Role).HasDatabaseName("idx_users_role");
            entity.HasIndex(x => x.SupporterId).HasDatabaseName("idx_users_supporter");
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").HasColumnType("text");
            entity.Property(x => x.FirstName).HasColumnName("first_name").HasColumnType("text");
            entity.Property(x => x.LastName).HasColumnName("last_name").HasColumnType("text");
            entity.Property(x => x.Role).HasColumnName("role").HasColumnType("text").HasDefaultValue("public");
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.MfaEnabled).HasColumnName("mfa_enabled").HasDefaultValue(false);
            entity.Property(x => x.LastLogin).HasColumnName("last_login").HasColumnType("timestamp with time zone");
            entity.Property(x => x.SupporterId).HasColumnName("supporter_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Supporter)
                .WithMany(x => x.Users)
                .HasForeignKey(x => x.SupporterId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<StaffSafehouseAssignment>(entity =>
        {
            entity.ToTable("staff_safehouse_assignments");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => new { x.UserId, x.SafehouseId }).IsUnique();
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.User)
                .WithMany(x => x.StaffSafehouseAssignments)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.StaffSafehouseAssignments)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Donation>(entity =>
        {
            entity.ToTable("donations");
            entity.HasKey(x => x.Id);
            entity.ToTable(t => t.HasCheckConstraint("CK_donations_donation_type", "donation_type IN ('monetary', 'in_kind', 'stock', 'grant', 'recurring')"));
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.HasIndex(x => x.SupporterId).HasDatabaseName("idx_donations_supporter");
            entity.HasIndex(x => x.SafehouseId).HasDatabaseName("idx_donations_safehouse");
            entity.HasIndex(x => x.DonationDate).HasDatabaseName("idx_donations_date");
            entity.Property(x => x.SupporterId).HasColumnName("supporter_id");
            entity.Property(x => x.DonationType).HasColumnName("donation_type").HasColumnType("text");
            entity.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(12,2)");
            entity.Property(x => x.Currency).HasColumnName("currency").HasColumnType("text").HasDefaultValue("USD");
            entity.Property(x => x.Campaign).HasColumnName("campaign").HasColumnType("text");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.DonationDate).HasColumnName("donation_date").HasColumnType("text");
            entity.Property(x => x.ReceiptUrl).HasColumnName("receipt_url").HasColumnType("text");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.IsAnonymous).HasColumnName("is_anonymous").HasDefaultValue(false);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Supporter)
                .WithMany(x => x.Donations)
                .HasForeignKey(x => x.SupporterId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.Donations)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<DonationAllocation>(entity =>
        {
            entity.ToTable("donation_allocations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.DonationId).HasColumnName("donation_id");
            entity.Property(x => x.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(x => x.ProgramArea).HasColumnName("program_area").HasColumnType("text");
            entity.Property(x => x.Amount).HasColumnName("amount").HasColumnType("numeric(12,2)");
            entity.Property(x => x.Percentage).HasColumnName("percentage").HasColumnType("numeric(5,2)");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Donation)
                .WithMany(x => x.DonationAllocations)
                .HasForeignKey(x => x.DonationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Safehouse)
                .WithMany(x => x.DonationAllocations)
                .HasForeignKey(x => x.SafehouseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InKindDonationItem>(entity =>
        {
            entity.ToTable("in_kind_donation_items");
            entity.HasKey(x => x.Id);
            entity.ToTable(t =>
            {
                t.HasCheckConstraint("CK_in_kind_donation_items_category", "category IN ('food', 'clothing', 'medicine', 'equipment', 'educational', 'hygiene', 'other')");
                t.HasCheckConstraint("CK_in_kind_donation_items_condition", "\"condition\" IN ('new', 'good', 'fair', 'poor')");
            });
            entity.Property(x => x.Id).HasColumnName("id").UseSerialColumn();
            entity.Property(x => x.DonationId).HasColumnName("donation_id");
            entity.Property(x => x.ItemDescription).HasColumnName("item_description").HasColumnType("text");
            entity.Property(x => x.Category).HasColumnName("category").HasColumnType("text").HasDefaultValue("other");
            entity.Property(x => x.Quantity).HasColumnName("quantity").HasDefaultValue(1);
            entity.Property(x => x.Unit).HasColumnName("unit").HasColumnType("text").HasDefaultValue("pcs");
            entity.Property(x => x.EstimatedValuePerUnit).HasColumnName("estimated_value_per_unit").HasColumnType("numeric(10,2)");
            entity.Property(x => x.TotalEstimatedValue).HasColumnName("total_estimated_value").HasColumnType("numeric(12,2)");
            entity.Property(x => x.Condition).HasColumnName("condition").HasColumnType("text").HasDefaultValue("good");
            entity.Property(x => x.ReceivedBy).HasColumnName("received_by");
            entity.Property(x => x.ReceivedAt).HasColumnName("received_at").HasColumnType("timestamp with time zone");
            entity.Property(x => x.Notes).HasColumnName("notes").HasColumnType("text");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone").HasDefaultValueSql("NOW()");

            entity.HasOne(x => x.Donation)
                .WithMany(x => x.InKindDonationItems)
                .HasForeignKey(x => x.DonationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ReceivedByUser)
                .WithMany(x => x.ReceivedInKindDonationItems)
                .HasForeignKey(x => x.ReceivedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
