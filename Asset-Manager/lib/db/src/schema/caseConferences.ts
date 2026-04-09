import { pgTable, text, bigserial, bigint, date } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";

export const caseConferencesTable = pgTable("case_conferences", {
  conferenceId:       bigserial("conference_id", { mode: "number" }).primaryKey(),
  residentId:         bigint("resident_id", { mode: "number" }).notNull().references(() => residentsTable.residentId),
  conferenceDate:     date("conference_date").notNull(),
  conferenceType:     text("conference_type"),
  summary:            text("summary"),
  decisionsMade:      text("decisions_made"),
  nextSteps:          text("next_steps"),
  nextConferenceDate: date("next_conference_date"),
  createdBy:          text("created_by"),
});

export type CaseConference = typeof caseConferencesTable.$inferSelect;
export type InsertCaseConference = typeof caseConferencesTable.$inferInsert;
