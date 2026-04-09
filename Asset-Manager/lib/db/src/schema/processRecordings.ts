import { pgTable, text, bigserial, bigint, date, integer, boolean } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";

export const processRecordingsTable = pgTable("process_recordings", {
  recordingId:           bigserial("recording_id", { mode: "number" }).primaryKey(),
  residentId:            bigint("resident_id", { mode: "number" }).references(() => residentsTable.residentId),
  sessionDate:           date("session_date"),
  socialWorker:          text("social_worker"),
  sessionType:           text("session_type"),
  sessionDurationMinutes:integer("session_duration_minutes"),
  emotionalStateObserved:text("emotional_state_observed"),
  emotionalStateEnd:     text("emotional_state_end"),
  sessionNarrative:      text("session_narrative"),
  interventionsApplied:  text("interventions_applied"),
  followUpActions:       text("follow_up_actions"),
  progressNoted:         boolean("progress_noted"),
  concernsFlagged:       boolean("concerns_flagged"),
  referralMade:          boolean("referral_made"),
  notesRestricted:       text("notes_restricted"),
});

export type ProcessRecording = typeof processRecordingsTable.$inferSelect;
export type InsertProcessRecording = typeof processRecordingsTable.$inferInsert;
