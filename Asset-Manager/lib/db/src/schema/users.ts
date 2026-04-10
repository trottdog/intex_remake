import { pgTable, text, serial, timestamp, boolean, bigint } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id:           serial("id").primaryKey(),
  username:     text("username").notNull().unique(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName:    text("first_name").notNull(),
  lastName:     text("last_name").notNull(),
  role:         text("role", { enum: ["public", "donor", "staff", "admin", "super_admin"] }).notNull().default("public"),
  isActive:     boolean("is_active").notNull().default(true),
  mfaEnabled:   boolean("mfa_enabled").notNull().default(false),
  mfaSecret:    text("mfa_secret"),
  lastLogin:    timestamp("last_login", { withTimezone: true }),
  supporterId:  bigint("supporter_id", { mode: "number" }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
