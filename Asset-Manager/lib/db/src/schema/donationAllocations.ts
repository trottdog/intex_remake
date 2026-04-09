import { pgTable, text, bigserial, bigint, date, numeric } from "drizzle-orm/pg-core";
import { donationsTable } from "./donations";
import { safehousesTable } from "./safehouses";

export const donationAllocationsTable = pgTable("donation_allocations", {
  allocationId:   bigserial("allocation_id", { mode: "number" }).primaryKey(),
  donationId:     bigint("donation_id", { mode: "number" }).references(() => donationsTable.donationId),
  safehouseId:    bigint("safehouse_id", { mode: "number" }).references(() => safehousesTable.safehouseId),
  programArea:    text("program_area"),
  amountAllocated:numeric("amount_allocated"),
  allocationDate: date("allocation_date"),
  allocationNotes:text("allocation_notes"),
});

export type DonationAllocation = typeof donationAllocationsTable.$inferSelect;
export type InsertDonationAllocation = typeof donationAllocationsTable.$inferInsert;
