import { pgTable, text, bigserial, bigint, date, boolean, numeric, doublePrecision } from "drizzle-orm/pg-core";
import { supportersTable } from "./supporters";
import { socialMediaPostsTable } from "./socialMediaPosts";
import { safehousesTable } from "./safehouses";

export const donationsTable = pgTable("donations", {
  donationId:             bigserial("donation_id", { mode: "number" }).primaryKey(),
  supporterId:            bigint("supporter_id", { mode: "number" }).references(() => supportersTable.supporterId),
  campaignId:             bigint("campaign_id", { mode: "number" }),
  donationType:           text("donation_type"),
  donationDate:           date("donation_date"),
  isRecurring:            boolean("is_recurring"),
  campaignName:           text("campaign_name"),
  channelSource:          text("channel_source"),
  currencyCode:           text("currency_code"),
  amount:                 numeric("amount"),
  estimatedValue:         numeric("estimated_value"),
  impactUnit:             text("impact_unit"),
  notes:                  text("notes"),
  referralPostId:         bigint("referral_post_id", { mode: "number" }).references(() => socialMediaPostsTable.postId),
  safehouseId:            bigint("safehouse_id", { mode: "number" }).references(() => safehousesTable.safehouseId),
  attributedOutcomeScore: doublePrecision("attributed_outcome_score"),
  attributionRunId:       bigint("attribution_run_id", { mode: "number" }),
});

export type Donation = typeof donationsTable.$inferSelect;
export type InsertDonation = typeof donationsTable.$inferInsert;
