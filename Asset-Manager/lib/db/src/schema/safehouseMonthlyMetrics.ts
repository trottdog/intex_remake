import { pgTable, text, bigserial, bigint, date, integer, numeric, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";
import { safehousesTable } from "./safehouses";

export const safehouseMonthlyMetricsTable = pgTable("safehouse_monthly_metrics", {
  metricId:                    bigserial("metric_id", { mode: "number" }).primaryKey(),
  safehouseId:                 bigint("safehouse_id", { mode: "number" }).references(() => safehousesTable.safehouseId),
  monthStart:                  date("month_start"),
  monthEnd:                    date("month_end"),
  activeResidents:             integer("active_residents"),
  avgEducationProgress:        numeric("avg_education_progress"),
  avgHealthScore:              numeric("avg_health_score"),
  processRecordingCount:       integer("process_recording_count"),
  homeVisitationCount:         integer("home_visitation_count"),
  incidentCount:               integer("incident_count"),
  notes:                       text("notes"),
  compositeHealthScore:        doublePrecision("composite_health_score"),
  peerRank:                    integer("peer_rank"),
  healthBand:                  text("health_band"),
  trendDirection:              text("trend_direction"),
  healthScoreDrivers:          jsonb("health_score_drivers"),
  incidentSeverityDistribution: jsonb("incident_severity_distribution"),
  healthScoreComputedAt:       timestamp("health_score_computed_at", { withTimezone: true }),
  healthScoreRunId:            bigint("health_score_run_id", { mode: "number" }),
});

export type SafehouseMonthlyMetric = typeof safehouseMonthlyMetricsTable.$inferSelect;
export type InsertSafehouseMonthlyMetric = typeof safehouseMonthlyMetricsTable.$inferInsert;
