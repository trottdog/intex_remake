import { pgTable, text, bigserial, date, boolean, varchar, doublePrecision, timestamp, jsonb } from "drizzle-orm/pg-core";

export const supportersTable = pgTable("supporters", {
  supporterId:               bigserial("supporter_id", { mode: "number" }).primaryKey(),
  supporterType:             text("supporter_type"),
  displayName:               text("display_name"),
  organizationName:          text("organization_name"),
  firstName:                 text("first_name"),
  lastName:                  text("last_name"),
  relationshipType:          text("relationship_type"),
  region:                    text("region"),
  country:                   text("country"),
  email:                     text("email"),
  phone:                     text("phone"),
  status:                    text("status"),
  createdAt:                 text("created_at"),
  firstDonationDate:         date("first_donation_date"),
  acquisitionChannel:        text("acquisition_channel"),
  identityUserId:            varchar("identity_user_id"),
  canLogin:                  boolean("can_login").notNull().default(false),
  recurringEnabled:          boolean("recurring_enabled").notNull().default(false),
  churnRiskScore:            doublePrecision("churn_risk_score"),
  churnBand:                 text("churn_band"),
  churnTopDrivers:           jsonb("churn_top_drivers"),
  churnRecommendedAction:    text("churn_recommended_action"),
  churnScoreUpdatedAt:       timestamp("churn_score_updated_at", { withTimezone: true }),
  upgradeLikelihoodScore:    doublePrecision("upgrade_likelihood_score"),
  upgradeBand:               text("upgrade_band"),
  upgradeTopDrivers:         jsonb("upgrade_top_drivers"),
  upgradeRecommendedAskBand: text("upgrade_recommended_ask_band"),
  upgradeScoreUpdatedAt:     timestamp("upgrade_score_updated_at", { withTimezone: true }),
});

export type Supporter = typeof supportersTable.$inferSelect;
export type InsertSupporter = typeof supportersTable.$inferInsert;
