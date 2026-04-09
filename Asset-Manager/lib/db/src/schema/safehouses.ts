import { pgTable, text, bigserial, integer, date } from "drizzle-orm/pg-core";

export const safehousesTable = pgTable("safehouses", {
  safehouseId:      bigserial("safehouse_id", { mode: "number" }).primaryKey(),
  safehouseCode:    text("safehouse_code"),
  name:             text("name"),
  region:           text("region"),
  city:             text("city"),
  province:         text("province"),
  country:          text("country"),
  openDate:         date("open_date"),
  status:           text("status"),
  capacityGirls:    integer("capacity_girls"),
  capacityStaff:    integer("capacity_staff"),
  currentOccupancy: integer("current_occupancy"),
  notes:            text("notes"),
});

export type Safehouse = typeof safehousesTable.$inferSelect;
export type InsertSafehouse = typeof safehousesTable.$inferInsert;
