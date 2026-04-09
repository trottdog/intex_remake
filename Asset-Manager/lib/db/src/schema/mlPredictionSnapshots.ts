import { pgTable, text, bigserial, bigint, integer, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";
import { mlPipelineRunsTable } from "./mlPipelineRuns";

export const mlPredictionSnapshotsTable = pgTable("ml_prediction_snapshots", {
  predictionId:    bigserial("prediction_id", { mode: "number" }).primaryKey(),
  runId:           bigint("run_id", { mode: "number" }).notNull().references(() => mlPipelineRunsTable.runId),
  pipelineName:    text("pipeline_name").notNull(),
  entityType:      text("entity_type").notNull(),
  entityId:        bigint("entity_id", { mode: "number" }),
  entityKey:       text("entity_key").notNull(),
  entityLabel:     text("entity_label"),
  safehouseId:     bigint("safehouse_id", { mode: "number" }),
  recordTimestamp: timestamp("record_timestamp", { withTimezone: true }),
  predictionValue: integer("prediction_value"),
  predictionScore: doublePrecision("prediction_score").notNull(),
  rankOrder:       integer("rank_order").notNull(),
  contextJson:     jsonb("context_json"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  bandLabel:       text("band_label"),
  actionCode:      text("action_code"),
});

export type MlPredictionSnapshot = typeof mlPredictionSnapshotsTable.$inferSelect;
export type InsertMlPredictionSnapshot = typeof mlPredictionSnapshotsTable.$inferInsert;
