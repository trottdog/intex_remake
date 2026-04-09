import { pgTable, text, bigserial, bigint, date, numeric, timestamp } from "drizzle-orm/pg-core";

export const campaignsTable = pgTable("campaigns", {
  campaignId:  bigserial("campaign_id", { mode: "number" }).primaryKey(),
  title:       text("title").notNull(),
  description: text("description"),
  category:    text("category"),
  goal:        numeric("goal"),
  deadline:    date("deadline"),
  status:      text("status").default("draft"),
  createdBy:   bigint("created_by", { mode: "number" }),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export type Campaign = typeof campaignsTable.$inferSelect;
export type InsertCampaign = typeof campaignsTable.$inferInsert;
