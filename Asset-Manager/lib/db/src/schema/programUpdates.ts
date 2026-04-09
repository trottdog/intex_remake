import { pgTable, text, bigserial, bigint, boolean, timestamp } from "drizzle-orm/pg-core";

export const programUpdatesTable = pgTable("program_updates", {
  updateId:    bigserial("update_id", { mode: "number" }).primaryKey(),
  title:       text("title").notNull(),
  summary:     text("summary"),
  category:    text("category"),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  createdBy:   bigint("created_by", { mode: "number" }),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export type ProgramUpdate = typeof programUpdatesTable.$inferSelect;
export type InsertProgramUpdate = typeof programUpdatesTable.$inferInsert;
