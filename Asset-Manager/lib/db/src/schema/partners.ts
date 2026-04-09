import { pgTable, text, bigserial, date } from "drizzle-orm/pg-core";

export const partnersTable = pgTable("partners", {
  partnerId:    bigserial("partner_id", { mode: "number" }).primaryKey(),
  partnerName:  text("partner_name"),
  partnerType:  text("partner_type"),
  roleType:     text("role_type"),
  contactName:  text("contact_name"),
  email:        text("email"),
  phone:        text("phone"),
  region:       text("region"),
  status:       text("status"),
  startDate:    date("start_date"),
  endDate:      date("end_date"),
  notes:        text("notes"),
});

export type Partner = typeof partnersTable.$inferSelect;
export type InsertPartner = typeof partnersTable.$inferInsert;
