using backend.intex.Entities.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace backend.intex.Infrastructure.Data.EntityFramework.Configurations;

public sealed class ProcessRecordingConfiguration : IEntityTypeConfiguration<ProcessRecording>
{
    public void Configure(EntityTypeBuilder<ProcessRecording> builder)
    {
        builder.ToTable("process_recordings");
        builder.HasKey(x => x.RecordingId);
        builder.Property(x => x.RecordingId).HasColumnName("recording_id").ValueGeneratedOnAdd();
        builder.Property(x => x.ResidentId).HasColumnName("resident_id");
        builder.Property(x => x.SessionDate).HasColumnName("session_date");
        builder.Property(x => x.SocialWorker).HasColumnName("social_worker");
        builder.Property(x => x.SessionType).HasColumnName("session_type");
        builder.Property(x => x.SessionDurationMinutes).HasColumnName("session_duration_minutes");
        builder.Property(x => x.EmotionalStateObserved).HasColumnName("emotional_state_observed");
        builder.Property(x => x.EmotionalStateEnd).HasColumnName("emotional_state_end");
        builder.Property(x => x.SessionNarrative).HasColumnName("session_narrative");
        builder.Property(x => x.InterventionsApplied).HasColumnName("interventions_applied");
        builder.Property(x => x.FollowUpActions).HasColumnName("follow_up_actions");
        builder.Property(x => x.ProgressNoted).HasColumnName("progress_noted");
        builder.Property(x => x.ConcernsFlagged).HasColumnName("concerns_flagged");
        builder.Property(x => x.ReferralMade).HasColumnName("referral_made");
        builder.Property(x => x.NotesRestricted).HasColumnName("notes_restricted");
    }
}
