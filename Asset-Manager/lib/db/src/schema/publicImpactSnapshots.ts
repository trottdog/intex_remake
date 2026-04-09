import { pgTable, text, bigserial, date, boolean, jsonb, timestamp, numeric } from "drizzle-orm/pg-core";

export const publicImpactSnapshotsTable = pgTable("public_impact_snapshots", {
  snapshotId:          bigserial("snapshot_id", { mode: "number" }).primaryKey(),
  snapshotDate:        date("snapshot_date"),
  headline:            text("headline"),
  summaryText:         text("summary_text"),
  metricPayloadJson:   jsonb("metric_payload_json"),
  isPublished:         boolean("is_published"),
  publishedAt:         timestamp("published_at"),
  projectedGapPhp30d:  numeric("projected_gap_php_30d"),
  fundingGapBand:      text("funding_gap_band"),
  fundingGapUpdatedAt: timestamp("funding_gap_updated_at", { withTimezone: true }),
});

export type PublicImpactSnapshot = typeof publicImpactSnapshotsTable.$inferSelect;
export type InsertPublicImpactSnapshot = typeof publicImpactSnapshotsTable.$inferInsert;
