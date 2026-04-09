import { pgTable, text, bigserial, bigint, timestamp } from "drizzle-orm/pg-core";

export const donorViewedItemsTable = pgTable("donor_viewed_items", {
  id:          bigserial("id", { mode: "number" }).primaryKey(),
  supporterId: bigint("supporter_id", { mode: "number" }),
  itemType:    text("item_type"),   // "update" | "campaign"
  itemId:      bigint("item_id", { mode: "number" }),
  viewedAt:    timestamp("viewed_at").defaultNow(),
});

export type DonorViewedItem = typeof donorViewedItemsTable.$inferSelect;
export type InsertDonorViewedItem = typeof donorViewedItemsTable.$inferInsert;
