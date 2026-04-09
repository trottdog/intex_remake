import { pgTable, text, bigserial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const mlPipelineRunsTable = pgTable("ml_pipeline_runs", {
  runId:                bigserial("run_id", { mode: "number" }).primaryKey(),
  pipelineName:         text("pipeline_name").notNull(),
  displayName:          text("display_name"),
  modelName:            text("model_name"),
  status:               text("status").notNull().default("completed"),
  trainedAt:            timestamp("trained_at", { withTimezone: true }).notNull().defaultNow(),
  dataSource:           text("data_source"),
  sourceCommit:         text("source_commit"),
  metricsJson:          jsonb("metrics_json"),
  manifestJson:         jsonb("manifest_json"),
  scoredEntityCount:    integer("scored_entity_count"),
  featureImportanceJson: jsonb("feature_importance_json"),
});

export type MlPipelineRun = typeof mlPipelineRunsTable.$inferSelect;
export type InsertMlPipelineRun = typeof mlPipelineRunsTable.$inferInsert;
