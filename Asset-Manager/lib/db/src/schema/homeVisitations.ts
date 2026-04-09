import { pgTable, text, bigserial, bigint, date, boolean } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";

export const homeVisitationsTable = pgTable("home_visitations", {
  visitationId:          bigserial("visitation_id", { mode: "number" }).primaryKey(),
  residentId:            bigint("resident_id", { mode: "number" }).references(() => residentsTable.residentId),
  visitDate:             date("visit_date"),
  socialWorker:          text("social_worker"),
  visitType:             text("visit_type"),
  locationVisited:       text("location_visited"),
  familyMembersPresent:  text("family_members_present"),
  purpose:               text("purpose"),
  observations:          text("observations"),
  familyCooperationLevel:text("family_cooperation_level"),
  safetyConcernsNoted:   boolean("safety_concerns_noted"),
  followUpNeeded:        boolean("follow_up_needed"),
  followUpNotes:         text("follow_up_notes"),
  visitOutcome:          text("visit_outcome"),
});

export type HomeVisitation = typeof homeVisitationsTable.$inferSelect;
export type InsertHomeVisitation = typeof homeVisitationsTable.$inferInsert;
