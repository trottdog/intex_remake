import { pgTable, bigserial, bigint, varchar } from "drizzle-orm/pg-core";
import { safehousesTable } from "./safehouses";

export const staffSafehouseAssignmentsTable = pgTable("staff_safehouse_assignments", {
  id:          bigserial("id", { mode: "number" }).primaryKey(),
  userId:      varchar("user_id").notNull(),
  safehouseId: bigint("safehouse_id", { mode: "number" }).notNull().references(() => safehousesTable.safehouseId),
});

export type StaffSafehouseAssignment = typeof staffSafehouseAssignmentsTable.$inferSelect;
export type InsertStaffSafehouseAssignment = typeof staffSafehouseAssignmentsTable.$inferInsert;
