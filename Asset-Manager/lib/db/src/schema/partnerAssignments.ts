import { pgTable, text, bigserial, bigint, date, boolean } from "drizzle-orm/pg-core";
import { partnersTable } from "./partners";
import { safehousesTable } from "./safehouses";

export const partnerAssignmentsTable = pgTable("partner_assignments", {
  assignmentId:        bigserial("assignment_id", { mode: "number" }).primaryKey(),
  partnerId:           bigint("partner_id", { mode: "number" }).references(() => partnersTable.partnerId),
  safehouseId:         bigint("safehouse_id", { mode: "number" }).references(() => safehousesTable.safehouseId),
  programArea:         text("program_area"),
  assignmentStart:     date("assignment_start"),
  assignmentEnd:       date("assignment_end"),
  responsibilityNotes: text("responsibility_notes"),
  isPrimary:           boolean("is_primary"),
  status:              text("status"),
});

export type PartnerAssignment = typeof partnerAssignmentsTable.$inferSelect;
export type InsertPartnerAssignment = typeof partnerAssignmentsTable.$inferInsert;
