import { pgTable, text, bigserial, bigint, numeric } from "drizzle-orm/pg-core";
import { donationsTable } from "./donations";

export const inKindDonationItemsTable = pgTable("in_kind_donation_items", {
  itemId:               bigserial("item_id", { mode: "number" }).primaryKey(),
  donationId:           bigint("donation_id", { mode: "number" }).references(() => donationsTable.donationId),
  itemName:             text("item_name"),
  itemCategory:         text("item_category"),
  quantity:             numeric("quantity"),
  unitOfMeasure:        text("unit_of_measure"),
  estimatedUnitValue:   numeric("estimated_unit_value"),
  intendedUse:          text("intended_use"),
  receivedCondition:    text("received_condition"),
});

export type InKindDonationItem = typeof inKindDonationItemsTable.$inferSelect;
export type InsertInKindDonationItem = typeof inKindDonationItemsTable.$inferInsert;
