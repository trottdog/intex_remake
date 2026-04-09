import { pgTable, text, bigserial, bigint, date, boolean } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";
import { safehousesTable } from "./safehouses";

export const incidentReportsTable = pgTable("incident_reports", {
  incidentId:      bigserial("incident_id", { mode: "number" }).primaryKey(),
  residentId:      bigint("resident_id", { mode: "number" }).references(() => residentsTable.residentId),
  safehouseId:     bigint("safehouse_id", { mode: "number" }).references(() => safehousesTable.safehouseId),
  incidentDate:    date("incident_date"),
  incidentType:    text("incident_type"),
  severity:        text("severity"),
  description:     text("description"),
  responseTaken:   text("response_taken"),
  resolved:        boolean("resolved"),
  resolutionDate:  date("resolution_date"),
  reportedBy:      text("reported_by"),
  followUpRequired:boolean("follow_up_required"),
  status:          text("status"),
});

export type IncidentReport = typeof incidentReportsTable.$inferSelect;
export type InsertIncidentReport = typeof incidentReportsTable.$inferInsert;
