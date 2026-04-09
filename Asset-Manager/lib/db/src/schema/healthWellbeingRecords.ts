import { pgTable, text, bigserial, bigint, date, numeric, boolean } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";

export const healthWellbeingRecordsTable = pgTable("health_wellbeing_records", {
  healthRecordId:          bigserial("health_record_id", { mode: "number" }).primaryKey(),
  residentId:              bigint("resident_id", { mode: "number" }).references(() => residentsTable.residentId),
  recordDate:              date("record_date"),
  generalHealthScore:      numeric("general_health_score"),
  nutritionScore:          numeric("nutrition_score"),
  sleepQualityScore:       numeric("sleep_quality_score"),
  energyLevelScore:        numeric("energy_level_score"),
  heightCm:                numeric("height_cm"),
  weightKg:                numeric("weight_kg"),
  bmi:                     numeric("bmi"),
  medicalCheckupDone:      boolean("medical_checkup_done"),
  dentalCheckupDone:       boolean("dental_checkup_done"),
  psychologicalCheckupDone:boolean("psychological_checkup_done"),
  notes:                   text("notes"),
});

export type HealthWellbeingRecord = typeof healthWellbeingRecordsTable.$inferSelect;
export type InsertHealthWellbeingRecord = typeof healthWellbeingRecordsTable.$inferInsert;
