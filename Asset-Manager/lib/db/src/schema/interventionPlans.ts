import { pgTable, text, bigserial, bigint, date, numeric, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";

export const interventionPlansTable = pgTable("intervention_plans", {
  planId:                       bigserial("plan_id", { mode: "number" }).primaryKey(),
  residentId:                   bigint("resident_id", { mode: "number" }).references(() => residentsTable.residentId),
  planCategory:                 text("plan_category"),
  planDescription:              text("plan_description"),
  servicesProvided:             text("services_provided"),
  targetValue:                  numeric("target_value"),
  targetDate:                   date("target_date"),
  status:                       text("status"),
  caseConferenceDate:           date("case_conference_date"),
  createdAt:                    timestamp("created_at"),
  updatedAt:                    timestamp("updated_at"),
  effectivenessOutcomeScore:    doublePrecision("effectiveness_outcome_score"),
  effectivenessBand:            text("effectiveness_band"),
  effectivenessOutcomeDrivers:  jsonb("effectiveness_outcome_drivers"),
  effectivenessScoreUpdatedAt:  timestamp("effectiveness_score_updated_at", { withTimezone: true }),
});

export type InterventionPlan = typeof interventionPlansTable.$inferSelect;
export type InsertInterventionPlan = typeof interventionPlansTable.$inferInsert;
