using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class SupporterConfiguration : IEntityTypeConfiguration<Supporter>
{
    public void Configure(EntityTypeBuilder<Supporter> builder)
    {
        builder.ToTable("supporters");
        builder.HasKey(x => x.SupporterId);
        builder.Property(x => x.SupporterId).HasColumnName("supporter_id").ValueGeneratedOnAdd();
        builder.Property(x => x.SupporterType).HasColumnName("supporter_type");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.OrganizationName).HasColumnName("organization_name");
        builder.Property(x => x.FirstName).HasColumnName("first_name");
        builder.Property(x => x.LastName).HasColumnName("last_name");
        builder.Property(x => x.RelationshipType).HasColumnName("relationship_type");
        builder.Property(x => x.Region).HasColumnName("region");
        builder.Property(x => x.Country).HasColumnName("country");
        builder.Property(x => x.Email).HasColumnName("email");
        builder.Property(x => x.Phone).HasColumnName("phone");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.FirstDonationDate).HasColumnName("first_donation_date");
        builder.Property(x => x.AcquisitionChannel).HasColumnName("acquisition_channel");
        builder.Property(x => x.IdentityUserId).HasColumnName("identity_user_id");
        builder.Property(x => x.CanLogin).HasColumnName("can_login").IsRequired();
        builder.Property(x => x.RecurringEnabled).HasColumnName("recurring_enabled").IsRequired();
        builder.Property(x => x.ChurnRiskScore).HasColumnName("churn_risk_score");
        builder.Property(x => x.ChurnBand).HasColumnName("churn_band");
        builder.Property(x => x.ChurnTopDrivers).HasColumnName("churn_top_drivers").HasColumnType("jsonb");
        builder.Property(x => x.ChurnRecommendedAction).HasColumnName("churn_recommended_action");
        builder.Property(x => x.ChurnScoreUpdatedAt).HasColumnName("churn_score_updated_at");
        builder.Property(x => x.UpgradeLikelihoodScore).HasColumnName("upgrade_likelihood_score");
        builder.Property(x => x.UpgradeBand).HasColumnName("upgrade_band");
        builder.Property(x => x.UpgradeTopDrivers).HasColumnName("upgrade_top_drivers").HasColumnType("jsonb");
        builder.Property(x => x.UpgradeRecommendedAskBand).HasColumnName("upgrade_recommended_ask_band");
        builder.Property(x => x.UpgradeScoreUpdatedAt).HasColumnName("upgrade_score_updated_at");
    }
}
