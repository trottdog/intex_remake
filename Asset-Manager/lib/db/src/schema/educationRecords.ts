import { pgTable, text, bigserial, bigint, date, numeric } from "drizzle-orm/pg-core";
import { residentsTable } from "./residents";

export const educationRecordsTable = pgTable("education_records", {
  educationRecordId: bigserial("education_record_id", { mode: "number" }).primaryKey(),
  residentId:        bigint("resident_id", { mode: "number" }).references(() => residentsTable.residentId),
  recordDate:        date("record_date"),
  educationLevel:    text("education_level"),
  schoolName:        text("school_name"),
  enrollmentStatus:  text("enrollment_status"),
  attendanceRate:    numeric("attendance_rate"),
  progressPercent:   numeric("progress_percent"),
  completionStatus:  text("completion_status"),
  notes:             text("notes"),
});

export type EducationRecord = typeof educationRecordsTable.$inferSelect;
export type InsertEducationRecord = typeof educationRecordsTable.$inferInsert;
