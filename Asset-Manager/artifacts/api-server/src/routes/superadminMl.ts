/**
 * Super Admin ML Dashboard — Backend Read Layer
 *
 * Sources of truth:
 *   - SUPER_ADMIN_ML_UI_DATA_CONTRACT.md  (widget specs W01–W13)
 *   - beacon_schema.sql + super_admin_ml_additive_columns.sql (schema)
 *
 * Role guards:
 *   - Most endpoints: super_admin only
 *   - W08 social planner: super_admin | admin
 *   - W11 interventions / W12 safehouse health (admin view): super_admin | admin
 *
 * Privacy:
 *   - ml_scores_restricted = true → excluded from watchlist/row-level endpoints
 *   - Other row endpoints null-out ML fields and set mlScoresRestricted: true
 *   - Donor emails redacted to "***@***.***" for admin role
 *   - PHP monetary values returned as NUMERIC strings
 *   - Timestamps as ISO 8601 with timezone
 */

import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { requireAuth, requireRoles, getUserSafehouses, type AuthUser } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

// ── Freshness thresholds (days) per pipeline ─────────────────────────────────
const FRESHNESS_THRESHOLDS: Record<string, number> = {
  donor_churn_risk:          8,
  resident_regression_risk:  8,
  safehouse_health_score:   35,
  reintegration_readiness:  35,
  donor_upgrade_likelihood: 35,
  social_post_conversion:   35,
  donation_attribution:     35,
  intervention_effectiveness: 35,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function numericStr(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n.toFixed(2);
}

/** Parse date-range query params into a Postgres date string or null */
function resolveDateBounds(query: Record<string, string>): { dateStart: string | null; dateEnd: string | null } {
  const { dateRange = "90d", dateStart: qs, dateEnd: qe } = query;
  if (dateRange === "custom") return { dateStart: qs ?? null, dateEnd: qe ?? null };
  const now = new Date();
  let daysBack = 90;
  if (dateRange === "30d")  daysBack = 30;
  else if (dateRange === "6mo")  daysBack = 182;
  else if (dateRange === "12mo") daysBack = 365;
  const start = new Date(now.getTime() - daysBack * 86400_000);
  return {
    dateStart: start.toISOString().split("T")[0],
    dateEnd:   now.toISOString().split("T")[0],
  };
}

function redactEmail(email: string | null | undefined, role: AuthUser["role"]): string | null {
  if (!email) return null;
  if (role === "admin" || role === "staff") return "***@***.***";
  return email;
}

function freshnessStatus(daysSince: number | null, pipelineName: string): "ok" | "stale" | "never-run" {
  if (daysSince === null) return "never-run";
  const threshold = FRESHNESS_THRESHOLDS[pipelineName] ?? 35;
  return daysSince > threshold ? "stale" : "ok";
}

// ── OVERVIEW PAGE ─────────────────────────────────────────────────────────────

/**
 * W01 — Action Queue Card
 * GET /api/superadmin/overview/action-queue
 * Role: super_admin
 * Ignores all global filters.
 */
router.get(
  "/superadmin/overview/action-queue",
  requireAuth,
  requireRoles("super_admin"),
  async (_req, res) => {
    try {
      // Churn alert: count at-risk donors from latest churn pipeline run snapshot
      const churnRows = await db.execute<{
        count: string;
        supporter_id: string;
        display_name: string | null;
        band_label: string | null;
        prediction_score: number;
      }>(sql`
        WITH latest_churn_run AS (
          SELECT run_id FROM ml_pipeline_runs
          WHERE pipeline_name = 'donor_churn_risk' AND status = 'completed'
          ORDER BY trained_at DESC LIMIT 1
        )
        SELECT
          ps.entity_id   AS supporter_id,
          s.display_name,
          ps.band_label,
          ps.prediction_score
        FROM ml_prediction_snapshots ps
        JOIN latest_churn_run r ON ps.run_id = r.run_id
        LEFT JOIN supporters s ON s.supporter_id = ps.entity_id
        WHERE ps.pipeline_name = 'donor_churn_risk'
        ORDER BY ps.prediction_score DESC
      `);

      const churnAll = churnRows.rows;
      const atRiskRows = churnAll.filter(r => r.band_label === "at-risk");
      const atRiskCount = atRiskRows.length;
      const topThree = atRiskRows.slice(0, 3).map(r => ({
        supporterId: Number(r.supporter_id),
        displayName: r.display_name ?? null,
        churnBand:   r.band_label ?? null,
      }));

      // Regression alert: critical/high band residents (exclude ml_scores_restricted)
      const regressionRows = await db.execute<{ count: string }>(sql`
        WITH latest_regression_run AS (
          SELECT run_id FROM ml_pipeline_runs
          WHERE pipeline_name = 'resident_regression_risk' AND status = 'completed'
          ORDER BY trained_at DESC LIMIT 1
        )
        SELECT COUNT(*)::int AS count
        FROM ml_prediction_snapshots ps
        JOIN latest_regression_run r ON ps.run_id = r.run_id
        LEFT JOIN residents res ON res.resident_id = ps.entity_id
        WHERE ps.pipeline_name = 'resident_regression_risk'
          AND ps.band_label IN ('critical','high')
          AND (res.ml_scores_restricted IS NULL OR res.ml_scores_restricted = false)
      `);
      const criticalOrHighCount = Number(regressionRows.rows[0]?.count ?? 0);

      // Safehouse alert: safehouses with health_band at-risk or critical (latest metric per safehouse)
      const shRows = await db.execute<{ safehouse_id: string; name: string; health_band: string | null }>(sql`
        WITH latest_metrics AS (
          SELECT DISTINCT ON (safehouse_id)
            safehouse_id, health_band
          FROM safehouse_monthly_metrics
          WHERE health_band IS NOT NULL
          ORDER BY safehouse_id, month_start DESC
        )
        SELECT lm.safehouse_id, sh.name, lm.health_band
        FROM latest_metrics lm
        JOIN safehouses sh ON sh.safehouse_id = lm.safehouse_id
        WHERE lm.health_band IN ('at-risk','critical')
      `);
      const atRiskOrCriticalCount = shRows.rows.length;
      const safehouseNames = shRows.rows.map(r => r.name).filter(Boolean);

      return res.json({
        data: {
          churnAlert:     { atRiskCount, topThree },
          regressionAlert: { criticalOrHighCount },
          safehouseAlert: { atRiskOrCriticalCount, safehouseNames },
        },
      });
    } catch (e) {
      console.error("[W01]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load action queue" } });
    }
  },
);

/**
 * W02 — Funding Gap KPI + Sparkline
 * GET /api/superadmin/overview/funding-gap
 * Role: super_admin
 * Ignores safehouseId and dateRange — always latest snapshot + trailing 12 months.
 */
router.get(
  "/superadmin/overview/funding-gap",
  requireAuth,
  requireRoles("super_admin"),
  async (_req, res) => {
    try {
      const snapRows = await db.execute<{
        projected_gap_php_30d: string | null;
        funding_gap_band: string | null;
        funding_gap_updated_at: string | null;
        snapshot_date: string | null;
      }>(sql`
        SELECT
          projected_gap_php_30d,
          funding_gap_band,
          funding_gap_updated_at,
          snapshot_date
        FROM public_impact_snapshots
        WHERE funding_gap_updated_at IS NOT NULL
        ORDER BY funding_gap_updated_at DESC
        LIMIT 1
      `);

      const latestSnapshot = snapRows.rows[0]
        ? {
            projectedGapPhp30d:  numericStr(snapRows.rows[0].projected_gap_php_30d),
            fundingGapBand:      snapRows.rows[0].funding_gap_band ?? null,
            fundingGapUpdatedAt: toIso(snapRows.rows[0].funding_gap_updated_at),
            snapshotDate:        snapRows.rows[0].snapshot_date ?? null,
          }
        : null;

      const sparkRows = await db.execute<{ month: string; total_donations_php: string }>(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', donation_date::date), 'YYYY-MM') AS month,
          COALESCE(SUM(amount::numeric), 0)::text AS total_donations_php
        FROM donations
        WHERE donation_date >= (CURRENT_DATE - INTERVAL '12 months')
          AND donation_date IS NOT NULL
        GROUP BY DATE_TRUNC('month', donation_date::date)
        ORDER BY DATE_TRUNC('month', donation_date::date)
      `);

      const sparkline = sparkRows.rows.map(r => ({
        month:            r.month,
        totalDonationsPhp: numericStr(r.total_donations_php) ?? "0.00",
      }));

      return res.json({ data: { latestSnapshot, sparkline } });
    } catch (e) {
      console.error("[W02]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load funding gap" } });
    }
  },
);

/**
 * W03 — Safehouse Health Leaderboard (Mini)
 * GET /api/superadmin/overview/safehouse-health-mini
 * Role: super_admin | admin
 * Returns top 5 by peer_rank (super_admin); own safehouse only (admin).
 */
router.get(
  "/superadmin/overview/safehouse-health-mini",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const allowedIds = getUserSafehouses(req.user);
      const safeFilter = allowedIds && allowedIds.length > 0
        ? sql`AND lm.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`
        : sql``;

      const rows = await db.execute<{
        safehouse_id: string;
        safehouse_name: string;
        composite_health_score: number | null;
        health_band: string | null;
        trend_direction: string | null;
        peer_rank: number | null;
      }>(sql`
        WITH latest_metrics AS (
          SELECT DISTINCT ON (safehouse_id)
            safehouse_id,
            composite_health_score,
            health_band,
            trend_direction,
            peer_rank
          FROM safehouse_monthly_metrics
          ORDER BY safehouse_id, month_start DESC
        )
        SELECT
          lm.safehouse_id,
          sh.name AS safehouse_name,
          lm.composite_health_score,
          lm.health_band,
          lm.trend_direction,
          lm.peer_rank
        FROM latest_metrics lm
        JOIN safehouses sh ON sh.safehouse_id = lm.safehouse_id
        WHERE lm.composite_health_score IS NOT NULL
        ${safeFilter}
        ORDER BY lm.peer_rank ASC NULLS LAST
        LIMIT 5
      `);

      const data = rows.rows.map(r => ({
        safehouseId:          Number(r.safehouse_id),
        safehouseName:        r.safehouse_name,
        compositeHealthScore: r.composite_health_score ?? null,
        healthBand:           r.health_band ?? null,
        trendDirection:       r.trend_direction ?? null,
        peerRank:             r.peer_rank ?? null,
      }));

      return res.json({ data });
    } catch (e) {
      console.error("[W03]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load safehouse mini leaderboard" } });
    }
  },
);

// ── DONORS PAGE ───────────────────────────────────────────────────────────────

/**
 * W04 — Donor Churn Table
 * GET /api/superadmin/donors/churn
 * Role: super_admin | admin
 * Admin: filtered to donors linked to their safehouse; email redacted.
 */
router.get(
  "/superadmin/donors/churn",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(q.page ?? "1"));
      const limitNum = resolveLimit(q.pageSize ?? q.limit, undefined, 20);
      const offset   = (pageNum - 1) * limitNum;

      const role      = req.user!.role;
      const allowedIds = getUserSafehouses(req.user);

      // Build WHERE clauses
      const conditions: ReturnType<typeof sql>[] = [];

      if (allowedIds && allowedIds.length > 0) {
        conditions.push(sql`s.supporter_id IN (
          SELECT DISTINCT supporter_id FROM donations
          WHERE safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])
        )`);
      }
      if (q.churnBand) {
        const bands = q.churnBand.split(",").map(b => b.trim());
        conditions.push(sql`s.churn_band = ANY(ARRAY[${sql.join(bands.map(b => sql`${b}`), sql`, `)}]::text[])`);
      }
      if (q.acquisitionChannel) {
        const chans = q.acquisitionChannel.split(",").map(c => c.trim());
        conditions.push(sql`s.acquisition_channel = ANY(ARRAY[${sql.join(chans.map(c => sql`${c}`), sql`, `)}]::text[])`);
      }
      if (q.region) {
        const regions = q.region.split(",").map(r => r.trim());
        conditions.push(sql`s.region = ANY(ARRAY[${sql.join(regions.map(r => sql`${r}`), sql`, `)}]::text[])`);
      }
      if (q.recurringEnabled !== undefined) {
        conditions.push(sql`s.recurring_enabled = ${q.recurringEnabled === "true"}`);
      }
      if (q.safehousePreference) {
        conditions.push(sql`s.supporter_id IN (
          SELECT DISTINCT supporter_id FROM donations WHERE safehouse_id = ${parseInt(q.safehousePreference)}
        )`);
      }

      const where = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      // Sort
      const sortByMap: Record<string, ReturnType<typeof sql>> = {
        churn_risk_score:       sql`s.churn_risk_score DESC NULLS LAST`,
        last_donation_date:     sql`MAX(d.donation_date) DESC NULLS LAST`,
        days_since_last_donation: sql`(CURRENT_DATE - MAX(d.donation_date)::date) ASC NULLS LAST`,
      };
      const orderClause = sortByMap[q.sortBy ?? ""] ?? sql`s.churn_risk_score DESC NULLS LAST`;

      const rows = await db.execute<{
        supporter_id: string;
        display_name: string | null;
        email: string | null;
        churn_risk_score: number | null;
        churn_band: string | null;
        churn_top_drivers: unknown;
        churn_recommended_action: string | null;
        churn_score_updated_at: string | null;
        last_donation_date: string | null;
        total_donations_php: string | null;
        days_since_last_donation: string | null;
        acquisition_channel: string | null;
        region: string | null;
        recurring_enabled: boolean;
      }>(sql`
        SELECT
          s.supporter_id,
          s.display_name,
          s.email,
          s.churn_risk_score,
          s.churn_band,
          s.churn_top_drivers,
          s.churn_recommended_action,
          s.churn_score_updated_at,
          MAX(d.donation_date)             AS last_donation_date,
          SUM(d.amount::numeric)::text     AS total_donations_php,
          (CURRENT_DATE - MAX(d.donation_date::date))::text AS days_since_last_donation,
          s.acquisition_channel,
          s.region,
          s.recurring_enabled
        FROM supporters s
        LEFT JOIN donations d ON d.supporter_id = s.supporter_id
        ${where}
        GROUP BY
          s.supporter_id, s.display_name, s.email,
          s.churn_risk_score, s.churn_band, s.churn_top_drivers,
          s.churn_recommended_action, s.churn_score_updated_at,
          s.acquisition_channel, s.region, s.recurring_enabled
        ORDER BY ${orderClause}
        LIMIT ${limitNum} OFFSET ${offset}
      `);

      const totalRows = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count
        FROM supporters s
        ${where}
      `);
      const total = Number(totalRows.rows[0]?.count ?? 0);

      const data = rows.rows.map(r => ({
        supporterId:             Number(r.supporter_id),
        displayName:             r.display_name ?? null,
        email:                   redactEmail(r.email, role),
        churnRiskScore:          r.churn_risk_score ?? null,
        churnBand:               r.churn_band ?? null,
        churnTopDrivers:         (r.churn_top_drivers as unknown[]) ?? null,
        churnRecommendedAction:  r.churn_recommended_action ?? null,
        churnScoreUpdatedAt:     toIso(r.churn_score_updated_at),
        lastDonationDate:        r.last_donation_date ?? null,
        totalDonationsPhp:       numericStr(r.total_donations_php) ?? "0.00",
        daysSinceLastDonation:   r.days_since_last_donation !== null ? Number(r.days_since_last_donation) : null,
        acquisitionChannel:      r.acquisition_channel ?? null,
        region:                  r.region ?? null,
        recurringEnabled:        r.recurring_enabled ?? false,
      }));

      return res.json({ data, meta: { page: pageNum, pageSize: limitNum, total }, pagination: paginate(total, pageNum, limitNum) });
    } catch (e) {
      console.error("[W04]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load donor churn table" } });
    }
  },
);

/**
 * W04 Drilldown — last 5 donations for a supporter
 * GET /api/superadmin/donors/:id/donations-recent
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/donors/:id/donations-recent",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const supporterId = parseInt(req.params.id as string);
      const allowedIds  = getUserSafehouses(req.user);

      // Admin: enforce safehouse scoping — reject if this supporter has no donation
      // linked to the admin's safehouse (prevents cross-safehouse IDOR).
      if (allowedIds && allowedIds.length > 0) {
        const scopeCheck = await db.execute<{ exists: boolean }>(sql`
          SELECT EXISTS (
            SELECT 1 FROM donations
            WHERE supporter_id = ${supporterId}
              AND safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])
          ) AS exists
        `);
        if (!scopeCheck.rows[0]?.exists) {
          return res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
        }
      }

      // Super-admin: unrestricted (or admin verified above) — return last 5 donations
      const rows = await db.execute<{
        donation_id: string;
        donation_date: string | null;
        amount: string | null;
        channel_source: string | null;
        campaign_name: string | null;
        attributed_outcome_score: number | null;
      }>(sql`
        SELECT donation_id, donation_date, amount, channel_source, campaign_name, attributed_outcome_score
        FROM donations
        WHERE supporter_id = ${supporterId}
        ORDER BY donation_date DESC NULLS LAST
        LIMIT 5
      `);
      const data = rows.rows.map(r => ({
        donationId:             Number(r.donation_id),
        donationDate:           r.donation_date ?? null,
        amount:                 numericStr(r.amount),
        channel:                r.channel_source ?? null,
        campaignTitle:          r.campaign_name ?? null,
        attributedOutcomeScore: r.attributed_outcome_score ?? null,
      }));
      return res.json({ data });
    } catch (e) {
      console.error("[W04-drilldown]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W05 — Donor Upgrade Board
 * GET /api/superadmin/donors/upgrade
 * Role: super_admin only
 */
router.get(
  "/superadmin/donors/upgrade",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(q.page ?? "1"));
      const limitNum = resolveLimit(q.pageSize ?? q.limit, undefined, 20);
      const offset   = (pageNum - 1) * limitNum;

      const conditions: ReturnType<typeof sql>[] = [];
      if (q.upgradeBand) {
        const bands = q.upgradeBand.split(",").map(b => b.trim());
        conditions.push(sql`s.upgrade_band = ANY(ARRAY[${sql.join(bands.map(b => sql`${b}`), sql`, `)}]::text[])`);
      }
      if (q.minUpgradeScore) {
        conditions.push(sql`s.upgrade_likelihood_score >= ${parseFloat(q.minUpgradeScore)}`);
      }
      if (q.recurringEnabled !== undefined) {
        conditions.push(sql`s.recurring_enabled = ${q.recurringEnabled === "true"}`);
      }
      if (q.acquisitionChannel) {
        const chans = q.acquisitionChannel.split(",").map(c => c.trim());
        conditions.push(sql`s.acquisition_channel = ANY(ARRAY[${sql.join(chans.map(c => sql`${c}`), sql`, `)}]::text[])`);
      }
      if (q.minAvgQuarterlyAmount) {
        conditions.push(sql`(
          SELECT COALESCE(AVG(qt.qtotal), 0)
          FROM (
            SELECT SUM(amount::numeric) AS qtotal
            FROM donations
            WHERE supporter_id = s.supporter_id
              AND donation_date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('quarter', donation_date::date)
          ) qt
        ) >= ${parseFloat(q.minAvgQuarterlyAmount)}`);
      }

      const where = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const rows = await db.execute<{
        supporter_id: string;
        display_name: string | null;
        email: string | null;
        upgrade_likelihood_score: number | null;
        upgrade_band: string | null;
        upgrade_recommended_ask_band: string | null;
        upgrade_top_drivers: unknown;
        upgrade_score_updated_at: string | null;
        recurring_enabled: boolean;
        acquisition_channel: string | null;
        lifetime_total: string;
        avg_quarterly: string;
        prev_quarter_total: string;
        curr_quarter_total: string;
        last_donation_date: string | null;
      }>(sql`
        SELECT
          s.supporter_id,
          s.display_name,
          s.email,
          s.upgrade_likelihood_score,
          s.upgrade_band,
          s.upgrade_recommended_ask_band,
          s.upgrade_top_drivers,
          s.upgrade_score_updated_at,
          s.recurring_enabled,
          s.acquisition_channel,
          COALESCE(SUM(d.amount::numeric), 0)::text              AS lifetime_total,
          MAX(d.donation_date)                                   AS last_donation_date,
          COALESCE(AVG(qt.qtotal), 0)::text                      AS avg_quarterly,
          COALESCE(MAX(qt.qtotal) FILTER (WHERE qt.qnum = 2), 0)::text AS prev_quarter_total,
          COALESCE(MAX(qt.qtotal) FILTER (WHERE qt.qnum = 1), 0)::text AS curr_quarter_total
        FROM supporters s
        LEFT JOIN donations d ON d.supporter_id = s.supporter_id
        LEFT JOIN LATERAL (
          SELECT
            SUM(amount::numeric) AS qtotal,
            ROW_NUMBER() OVER (ORDER BY DATE_TRUNC('quarter', donation_date::date) DESC) AS qnum
          FROM donations di
          WHERE di.supporter_id = s.supporter_id
            AND di.donation_date >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('quarter', donation_date::date)
        ) qt ON true
        ${where}
        GROUP BY
          s.supporter_id, s.display_name, s.email,
          s.upgrade_likelihood_score, s.upgrade_band,
          s.upgrade_recommended_ask_band, s.upgrade_top_drivers,
          s.upgrade_score_updated_at, s.recurring_enabled, s.acquisition_channel
        ORDER BY s.upgrade_likelihood_score DESC NULLS LAST
        LIMIT ${limitNum} OFFSET ${offset}
      `);

      const totalRows = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count FROM supporters s ${where}
      `);
      const total = Number(totalRows.rows[0]?.count ?? 0);

      const data = rows.rows.map(r => {
        const curr = parseFloat(r.curr_quarter_total) || 0;
        const prev = parseFloat(r.prev_quarter_total) || 0;
        let donationAmountTrend: "increasing" | "stable" | "decreasing" = "stable";
        if (prev > 0) {
          const change = (curr - prev) / prev;
          if (change > 0.1) donationAmountTrend = "increasing";
          else if (change < -0.1) donationAmountTrend = "decreasing";
        }
        return {
          supporterId:              Number(r.supporter_id),
          displayName:              r.display_name ?? null,
          email:                    r.email ?? null,
          upgradeLikelihoodScore:   r.upgrade_likelihood_score ?? null,
          upgradeBand:              r.upgrade_band ?? null,
          upgradeRecommendedAskBand: r.upgrade_recommended_ask_band ?? null,
          upgradeTopDrivers:        (r.upgrade_top_drivers as unknown[]) ?? null,
          upgradeScoreUpdatedAt:    toIso(r.upgrade_score_updated_at),
          avgDonationPhp:           numericStr(r.avg_quarterly) ?? "0.00",
          totalDonationsPhp:        numericStr(r.lifetime_total) ?? "0.00",
          lastDonationDate:         r.last_donation_date ?? null,
          donationAmountTrend,
          recurringEnabled:         r.recurring_enabled ?? false,
          acquisitionChannel:       r.acquisition_channel ?? null,
        };
      });

      return res.json({ data, meta: { page: pageNum, pageSize: limitNum, total }, pagination: paginate(total, pageNum, limitNum) });
    } catch (e) {
      console.error("[W05]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load donor upgrade board" } });
    }
  },
);

/**
 * W06 — Attribution Sankey
 * GET /api/superadmin/attribution/sankey
 * Role: super_admin
 */
router.get(
  "/superadmin/attribution/sankey",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);

      const dateFilter = dateStart && dateEnd
        ? sql`AND d.donation_date BETWEEN ${dateStart} AND ${dateEnd}`
        : sql``;

      // Nodes: supporters, program areas, safehouses
      const flowRows = await db.execute<{
        supporter_id: string;
        display_name: string | null;
        program_area: string | null;
        safehouse_id: string | null;
        safehouse_name: string | null;
        allocated: string;
      }>(sql`
        SELECT
          s.supporter_id,
          s.display_name,
          da.program_area,
          da.safehouse_id,
          sh.name AS safehouse_name,
          SUM(da.amount_allocated::numeric)::text AS allocated
        FROM donation_allocations da
        JOIN donations d ON d.donation_id = da.donation_id
        JOIN supporters s ON s.supporter_id = d.supporter_id
        LEFT JOIN safehouses sh ON sh.safehouse_id = da.safehouse_id
        WHERE da.program_area IS NOT NULL
          ${dateFilter}
        GROUP BY s.supporter_id, s.display_name, da.program_area, da.safehouse_id, sh.name
        LIMIT 200
      `);

      const nodeMap = new Map<string, { id: string; label: string; type: string }>();
      const links: { source: string; target: string; valuePhp: string }[] = [];

      for (const row of flowRows.rows) {
        const supKey = `supporter_${row.supporter_id}`;
        if (!nodeMap.has(supKey)) {
          nodeMap.set(supKey, { id: supKey, label: row.display_name ?? `Supporter ${row.supporter_id}`, type: "supporter" });
        }
        const programKey = `program_${(row.program_area ?? "unknown").toLowerCase().replace(/\s+/g, "_")}`;
        if (!nodeMap.has(programKey)) {
          nodeMap.set(programKey, { id: programKey, label: row.program_area ?? "Unknown", type: "programArea" });
        }
        links.push({ source: supKey, target: programKey, valuePhp: numericStr(row.allocated) ?? "0.00" });

        if (row.safehouse_id) {
          const shKey = `safehouse_${row.safehouse_id}`;
          if (!nodeMap.has(shKey)) {
            nodeMap.set(shKey, { id: shKey, label: row.safehouse_name ?? `Safehouse ${row.safehouse_id}`, type: "safehouse" });
          }
          links.push({ source: programKey, target: shKey, valuePhp: numericStr(row.allocated) ?? "0.00" });
        }
      }

      // Determine quarter label
      const nowQ = new Date();
      const quarter = Math.ceil((nowQ.getMonth() + 1) / 3);
      const windowLabel = `Q${quarter} ${nowQ.getFullYear()}`;

      return res.json({
        data: {
          nodes: Array.from(nodeMap.values()),
          links,
          disclaimer: "Correlation shown — not evidence of direct causation.",
          windowLabel,
        },
      });
    } catch (e) {
      console.error("[W06-sankey]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load attribution sankey" } });
    }
  },
);

/**
 * W06 — Attribution Programs KPI Cards
 * GET /api/superadmin/attribution/programs
 * Role: super_admin
 */
router.get(
  "/superadmin/attribution/programs",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);

      const dateFilter = dateStart && dateEnd
        ? sql`AND d.donation_date BETWEEN ${dateStart} AND ${dateEnd}`
        : sql``;

      const safehouseFilter = q.safehouseId && q.safehouseId !== "all"
        ? sql`AND da.safehouse_id = ${parseInt(q.safehouseId)}`
        : sql``;

      const programFilter = q.programArea
        ? sql`AND da.program_area = ANY(ARRAY[${sql.join(q.programArea.split(",").map(p => sql`${p.trim()}`), sql`, `)}]::text[])`
        : sql``;

      const rows = await db.execute<{
        program_area: string;
        total_allocated: string;
        avg_attributed_outcome_score: number | null;
        safehouse_count: string;
      }>(sql`
        SELECT
          da.program_area,
          SUM(da.amount_allocated::numeric)::text AS total_allocated,
          AVG(d.attributed_outcome_score)          AS avg_attributed_outcome_score,
          COUNT(DISTINCT da.safehouse_id)::text    AS safehouse_count
        FROM donation_allocations da
        JOIN donations d ON d.donation_id = da.donation_id
        WHERE da.program_area IS NOT NULL
          ${dateFilter}
          ${safehouseFilter}
          ${programFilter}
        GROUP BY da.program_area
        ORDER BY avg_attributed_outcome_score DESC NULLS LAST
      `);

      const data = rows.rows.map(r => ({
        programArea:               r.program_area,
        totalAllocatedPhp:         numericStr(r.total_allocated) ?? "0.00",
        avgAttributedOutcomeScore: r.avg_attributed_outcome_score ?? null,
        safehouseCount:            Number(r.safehouse_count),
        healthScoreDelta:          null as number | null,
        educationProgressDelta:    null as number | null,
      }));

      return res.json({ data });
    } catch (e) {
      console.error("[W06-programs]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load attribution programs" } });
    }
  },
);

/**
 * W06 — Attribution Export (CSV placeholder — returns JSON record set)
 * GET /api/superadmin/attribution/export
 * Role: super_admin
 */
router.get(
  "/superadmin/attribution/export",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);
      const dateFilter = dateStart && dateEnd
        ? sql`AND d.donation_date BETWEEN ${dateStart} AND ${dateEnd}`
        : sql``;

      const rows = await db.execute<{
        donation_id: string;
        donation_date: string | null;
        amount: string | null;
        attributed_outcome_score: number | null;
        display_name: string | null;
        program_area: string | null;
        safehouse_name: string | null;
      }>(sql`
        SELECT
          d.donation_id,
          d.donation_date,
          d.amount,
          d.attributed_outcome_score,
          s.display_name,
          da.program_area,
          sh.name AS safehouse_name
        FROM donations d
        LEFT JOIN donation_allocations da ON da.donation_id = d.donation_id
        LEFT JOIN supporters s ON s.supporter_id = d.supporter_id
        LEFT JOIN safehouses sh ON sh.safehouse_id = da.safehouse_id
        WHERE 1=1 ${dateFilter}
        ORDER BY d.donation_date DESC
        LIMIT 5000
      `);

      const data = rows.rows.map(r => ({
        donationId:             Number(r.donation_id),
        donationDate:           r.donation_date ?? null,
        amountPhp:              numericStr(r.amount),
        attributedOutcomeScore: r.attributed_outcome_score ?? null,
        donorName:              r.display_name ?? null,
        programArea:            r.program_area ?? null,
        safehouseName:          r.safehouse_name ?? null,
      }));

      return res.json({ data, count: data.length });
    } catch (e) {
      console.error("[W06-export]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

// ── CAMPAIGNS & SOCIAL PAGE ───────────────────────────────────────────────────

/**
 * W07 — Campaign Movement vs Noise
 * GET /api/superadmin/campaigns/effectiveness
 * Role: super_admin
 */
router.get(
  "/superadmin/campaigns/effectiveness",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);

      const conditions: ReturnType<typeof sql>[] = [];
      if (dateStart && dateEnd) {
        conditions.push(sql`(c.deadline IS NULL OR c.deadline BETWEEN ${dateStart} AND ${dateEnd})`);
      }
      if (q.category) {
        const cats = q.category.split(",").map(v => v.trim());
        conditions.push(sql`c.category = ANY(ARRAY[${sql.join(cats.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.status) {
        const statuses = q.status.split(",").map(v => v.trim());
        conditions.push(sql`c.status = ANY(ARRAY[${sql.join(statuses.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.isBoosted === "true") {
        conditions.push(sql`c.campaign_id IN (
          SELECT DISTINCT campaign_id FROM donations d2
          JOIN social_media_posts sp ON sp.campaign_name = d2.campaign_name
          WHERE sp.is_boosted = true
        )`);
      }

      const where = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      const rows = await db.execute<{
        campaign_id: string;
        title: string | null;
        category: string | null;
        status: string | null;
        goal: string | null;
        deadline: string | null;
        total_raised: string;
        unique_donors: string;
        avg_engagement_rate: number | null;
        total_impressions: string | null;
        prediction_score: number | null;
        band_label: string | null;
        context_json: unknown;
      }>(sql`
        WITH campaign_donations AS (
          SELECT
            campaign_id,
            SUM(amount::numeric)::text AS total_raised,
            COUNT(DISTINCT supporter_id)::text AS unique_donors
          FROM donations
          WHERE campaign_id IS NOT NULL
          GROUP BY campaign_id
        ),
        campaign_social AS (
          SELECT
            camp.campaign_id,
            AVG(sp.engagement_rate::numeric)::double precision AS avg_engagement_rate,
            SUM(sp.impressions)::text AS total_impressions
          FROM campaigns camp
          LEFT JOIN social_media_posts sp ON sp.campaign_name = camp.title
          WHERE sp.campaign_name IS NOT NULL
          GROUP BY camp.campaign_id
        ),
        latest_ml AS (
          SELECT DISTINCT ON (ps.entity_id)
            ps.entity_id,
            ps.prediction_score,
            ps.band_label,
            ps.context_json
          FROM ml_prediction_snapshots ps
          JOIN ml_pipeline_runs r ON r.run_id = ps.run_id
          WHERE ps.pipeline_name = 'campaign_effectiveness'
            AND r.status = 'completed'
          ORDER BY ps.entity_id, r.trained_at DESC
        )
        SELECT
          c.campaign_id,
          c.title,
          c.category,
          c.status,
          c.goal,
          c.deadline,
          COALESCE(cd.total_raised, '0')    AS total_raised,
          COALESCE(cd.unique_donors, '0')   AS unique_donors,
          cs.avg_engagement_rate,
          cs.total_impressions,
          ml.prediction_score,
          ml.band_label,
          ml.context_json
        FROM campaigns c
        LEFT JOIN campaign_donations cd ON cd.campaign_id = c.campaign_id
        LEFT JOIN campaign_social cs ON cs.campaign_id = c.campaign_id
        LEFT JOIN latest_ml ml ON ml.entity_id = c.campaign_id
        ${where}
        ORDER BY ml.prediction_score DESC NULLS LAST
      `);

      const data = rows.rows.map(r => {
        const ctx = (r.context_json as Record<string, unknown>) ?? {};
        const totalRaised = parseFloat(r.total_raised) || 0;
        const goal = r.goal ? parseFloat(r.goal) : null;
        let conversionRatio: number | null = r.prediction_score ?? null;
        if (conversionRatio === null && goal && goal > 0) {
          conversionRatio = totalRaised / goal;
        }
        return {
          campaignId:          Number(r.campaign_id),
          title:               r.title ?? null,
          category:            r.category ?? null,
          status:              r.status ?? null,
          goal:                numericStr(r.goal),
          totalRaisedPhp:      numericStr(r.total_raised) ?? "0.00",
          uniqueDonors:        Number(r.unique_donors),
          avgEngagementRate:   r.avg_engagement_rate ?? null,
          totalImpressions:    r.total_impressions !== null ? Number(r.total_impressions) : null,
          conversionRatio,
          classificationBand:  (ctx.classification_band as string | null) ?? r.band_label ?? null,
          recommendedReplicate: (ctx.recommended_replicate as boolean | null) ?? null,
          deadline:            r.deadline ?? null,
        };
      });

      return res.json({ data });
    } catch (e) {
      console.error("[W07]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load campaign effectiveness" } });
    }
  },
);

/**
 * W08 — Social Post Conversion Heatmap
 * GET /api/superadmin/social/heatmap
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/social/heatmap",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);

      // Base conditions always included to avoid double-WHERE when dynamic filters are added
      const conditions: ReturnType<typeof sql>[] = [
        sql`sp.day_of_week IS NOT NULL`,
        sql`sp.post_hour IS NOT NULL`,
      ];
      if (dateStart && dateEnd) {
        conditions.push(sql`sp.created_at BETWEEN ${dateStart}::timestamptz AND ${dateEnd}::timestamptz`);
      }
      if (q.platform) {
        const platforms = q.platform.split(",").map(v => v.trim());
        conditions.push(sql`sp.platform = ANY(ARRAY[${sql.join(platforms.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }

      const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

      // Check minimum post count
      const countRow = await db.execute<{ count: string }>(sql`SELECT COUNT(*)::int AS count FROM social_media_posts sp ${where}`);
      const totalCount = Number(countRow.rows[0]?.count ?? 0);

      if (totalCount < 10) {
        return res.json({ data: null, insufficientData: true });
      }

      const rows = await db.execute<{
        day_of_week: string;
        post_hour: number;
        avg_donation_referrals: number;
        post_count: number;
      }>(sql`
        SELECT
          sp.day_of_week,
          sp.post_hour,
          AVG(sp.donation_referrals)::double precision AS avg_donation_referrals,
          COUNT(*)::int AS post_count
        FROM social_media_posts sp
        ${where}
        GROUP BY sp.day_of_week, sp.post_hour
        ORDER BY sp.day_of_week, sp.post_hour
      `);

      const cells = rows.rows.map(r => ({
        dayOfWeek:           r.day_of_week,
        postHour:            Number(r.post_hour),
        avgDonationReferrals: parseFloat(String(r.avg_donation_referrals ?? 0)),
        postCount:            Number(r.post_count),
      }));

      return res.json({ data: { cells, minimumPostsForCell: 3 } });
    } catch (e) {
      console.error("[W08-heatmap]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to load social heatmap" } });
    }
  },
);

/**
 * W08 — Social Post Recommendation Card
 * GET /api/superadmin/social/recommendation
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/social/recommendation",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);

      const conditions: ReturnType<typeof sql>[] = [sql`sp.conversion_band = 'high-converter'`];
      if (dateStart && dateEnd) {
        conditions.push(sql`sp.created_at BETWEEN ${dateStart}::timestamptz AND ${dateEnd}::timestamptz`);
      }
      const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

      const rows = await db.execute<{
        post_id: string;
        platform: string | null;
        caption: string | null;
        created_at: string | null;
        day_of_week: string | null;
        post_hour: number | null;
        media_type: string | null;
        content_topic: string | null;
        conversion_prediction_score: number | null;
        conversion_band: string | null;
        predicted_referral_count: string | null;
        predicted_donation_value_php: string | null;
      }>(sql`
        SELECT
          sp.post_id,
          sp.platform,
          sp.caption,
          sp.created_at,
          sp.day_of_week,
          sp.post_hour,
          sp.media_type,
          sp.content_topic,
          sp.conversion_prediction_score,
          sp.conversion_band,
          sp.predicted_referral_count,
          sp.predicted_donation_value_php
        FROM social_media_posts sp
        ${where}
        ORDER BY sp.conversion_prediction_score DESC NULLS LAST
        LIMIT 1
      `);

      if (!rows.rows[0]) {
        return res.json({ data: null });
      }
      const r = rows.rows[0];
      return res.json({
        data: {
          postId:                    r.post_id ? Number(r.post_id) : null,
          caption:                   r.caption ?? null,
          postedAt:                  toIso(r.created_at),
          platform:                  r.platform ?? null,
          dayOfWeek:                 r.day_of_week ?? null,
          postHour:                  r.post_hour ?? null,
          mediaType:                 r.media_type ?? null,
          contentTopic:              r.content_topic ?? null,
          conversionPredictionScore: r.conversion_prediction_score ?? null,
          conversionBand:            r.conversion_band ?? null,
          predictedReferralCount:    numericStr(r.predicted_referral_count),
          predictedDonationValuePhp: numericStr(r.predicted_donation_value_php),
          basis:                     "Highest-scoring recent post with conversion_band = high-converter",
        },
      });
    } catch (e) {
      console.error("[W08-recommendation]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W08 — Social Post-Level Table
 * GET /api/superadmin/social/posts
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/social/posts",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(q.page ?? "1"));
      const limitNum = resolveLimit(q.pageSize ?? q.limit, undefined, 20);
      const offset   = (pageNum - 1) * limitNum;

      const { dateStart, dateEnd } = resolveDateBounds(q);
      const conditions: ReturnType<typeof sql>[] = [];

      if (dateStart && dateEnd) {
        conditions.push(sql`sp.created_at BETWEEN ${dateStart}::timestamptz AND ${dateEnd}::timestamptz`);
      }
      if (q.platform) {
        const vals = q.platform.split(",").map(v => v.trim());
        conditions.push(sql`sp.platform = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.mediaType) {
        const vals = q.mediaType.split(",").map(v => v.trim());
        conditions.push(sql`sp.media_type = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.postType) {
        const vals = q.postType.split(",").map(v => v.trim());
        conditions.push(sql`sp.post_type = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.contentTopic) {
        const vals = q.contentTopic.split(",").map(v => v.trim());
        conditions.push(sql`sp.content_topic = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.isBoosted !== undefined) {
        conditions.push(sql`sp.is_boosted = ${q.isBoosted === "true"}`);
      }
      if (q.conversionBand) {
        const vals = q.conversionBand.split(",").map(v => v.trim());
        conditions.push(sql`sp.conversion_band = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.ids) {
        const ids = q.ids.split(",").map(id => parseInt(id.trim())).filter(n => !isNaN(n));
        conditions.push(sql`sp.post_id = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::bigint[])`);
      }

      const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const rows = await db.execute<{
        post_id: string;
        platform: string | null;
        caption: string | null;
        post_type: string | null;
        day_of_week: string | null;
        post_hour: number | null;
        media_type: string | null;
        content_topic: string | null;
        impressions: number | null;
        engagement_rate: string | null;
        conversion_prediction_score: number | null;
        conversion_band: string | null;
        predicted_referral_count: string | null;
        predicted_donation_value_php: string | null;
        donation_referrals: number | null;
        conversion_comparable_post_ids: unknown;
        conversion_top_drivers: unknown;
        conversion_score_updated_at: string | null;
        is_boosted: boolean | null;
        created_at: string | null;
      }>(sql`
        SELECT
          sp.post_id, sp.platform, sp.caption, sp.post_type,
          sp.day_of_week, sp.post_hour,
          sp.media_type, sp.content_topic,
          sp.impressions, sp.engagement_rate,
          sp.conversion_prediction_score, sp.conversion_band,
          sp.predicted_referral_count, sp.predicted_donation_value_php,
          sp.donation_referrals, sp.conversion_comparable_post_ids,
          sp.conversion_top_drivers, sp.conversion_score_updated_at,
          sp.is_boosted, sp.created_at
        FROM social_media_posts sp
        ${where}
        ORDER BY sp.conversion_prediction_score DESC NULLS LAST
        LIMIT ${limitNum} OFFSET ${offset}
      `);

      const totalRows = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count FROM social_media_posts sp ${where}
      `);
      const total = Number(totalRows.rows[0]?.count ?? 0);

      const data = rows.rows.map(r => {
        const predicted = r.predicted_referral_count !== null ? parseFloat(r.predicted_referral_count) : null;
        const actual    = r.donation_referrals ?? null;
        const delta     = predicted !== null && actual !== null ? actual - predicted : null;
        return {
          postId:                    Number(r.post_id),
          platform:                  r.platform ?? null,
          caption:                   r.caption ?? null,
          postType:                  r.post_type ?? null,
          dayOfWeek:                 r.day_of_week ?? null,
          postHour:                  r.post_hour ?? null,
          mediaType:                 r.media_type ?? null,
          contentTopic:              r.content_topic ?? null,
          impressions:               r.impressions ?? null,
          engagementRate:            r.engagement_rate !== null ? parseFloat(r.engagement_rate) : null,
          conversionPredictionScore: r.conversion_prediction_score ?? null,
          conversionBand:            r.conversion_band ?? null,
          predictedReferralCount:    numericStr(r.predicted_referral_count),
          predictedDonationValuePhp: numericStr(r.predicted_donation_value_php),
          donationReferrals:         actual,
          predictedVsActualDelta:    delta !== null ? parseFloat(delta.toFixed(2)) : null,
          conversionComparablePostIds: (r.conversion_comparable_post_ids as number[] | null) ?? null,
          conversionTopDrivers:      (r.conversion_top_drivers as { label: string; weight: number }[] | null) ?? null,
          conversionScoreUpdatedAt:  toIso(r.conversion_score_updated_at),
          isBoosted:                 r.is_boosted ?? false,
          postedAt:                  toIso(r.created_at),
        };
      });

      return res.json({ data, meta: { page: pageNum, pageSize: limitNum, total }, pagination: paginate(total, pageNum, limitNum) });
    } catch (e) {
      console.error("[W08-posts]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

// ── RESIDENTS & SAFEHOUSES PAGE ───────────────────────────────────────────────

/**
 * W09 — Resident Regression Distribution (stacked bar)
 * GET /api/superadmin/residents/regression/distribution
 * Role: super_admin | admin
 * Restricted residents are counted but ML values not exposed.
 */
router.get(
  "/superadmin/residents/regression/distribution",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const allowedIds = getUserSafehouses(req.user);

      const shFilter = allowedIds && allowedIds.length > 0
        ? sql`AND r.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`
        : sql``;

      const rows = await db.execute<{
        safehouse_id: string;
        safehouse_name: string;
        band: string | null;
        is_restricted: boolean;
        cnt: string;
      }>(sql`
        SELECT
          r.safehouse_id,
          sh.name AS safehouse_name,
          CASE WHEN r.ml_scores_restricted = true THEN NULL ELSE r.regression_risk_band END AS band,
          COALESCE(r.ml_scores_restricted, false) AS is_restricted,
          COUNT(*)::text AS cnt
        FROM residents r
        JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        WHERE r.safehouse_id IS NOT NULL
          AND r.case_status = 'active'
          ${shFilter}
        GROUP BY r.safehouse_id, sh.name, band, r.ml_scores_restricted
        ORDER BY r.safehouse_id
      `);

      const byHouse = new Map<string, {
        safehouseId: number; safehouseName: string;
        bands: Record<string, number>; totalScored: number; totalRestricted: number;
      }>();

      for (const row of rows.rows) {
        const key = row.safehouse_id;
        if (!byHouse.has(key)) {
          byHouse.set(key, {
            safehouseId:    Number(key),
            safehouseName:  row.safehouse_name,
            bands:          { critical: 0, high: 0, moderate: 0, low: 0, stable: 0 },
            totalScored:    0,
            totalRestricted: 0,
          });
        }
        const entry = byHouse.get(key)!;
        const count = Number(row.cnt);
        if (row.is_restricted) {
          entry.totalRestricted += count;
        } else if (row.band && Object.prototype.hasOwnProperty.call(entry.bands, row.band)) {
          entry.bands[row.band] += count;
          entry.totalScored += count;
        }
      }

      const allEntries = Array.from(byHouse.values());
      const totalRestricted = allEntries.reduce((sum, h) => sum + h.totalRestricted, 0);
      return res.json({ data: allEntries, meta: { totalRestricted } });
    } catch (e) {
      console.error("[W09-dist]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W09 — Resident Regression Watchlist (row-level, excludes restricted)
 * GET /api/superadmin/residents/regression/watchlist
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/residents/regression/watchlist",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(q.page ?? "1"));
      const limitNum = resolveLimit(q.pageSize ?? q.limit, undefined, 20);
      const offset   = (pageNum - 1) * limitNum;

      const allowedIds = getUserSafehouses(req.user);
      const conditions: ReturnType<typeof sql>[] = [
        sql`(r.ml_scores_restricted IS NULL OR r.ml_scores_restricted = false)`,
        sql`r.regression_risk_score IS NOT NULL`,
      ];

      if (allowedIds && allowedIds.length > 0) {
        conditions.push(sql`r.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`);
      }
      if (q.safehouseId && q.safehouseId !== "all") {
        if (req.user!.role !== "super_admin") {
          return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions for cross-safehouse access" } });
        }
        conditions.push(sql`r.safehouse_id = ${parseInt(q.safehouseId)}`);
      }
      if (q.caseCategory) {
        const vals = q.caseCategory.split(",").map(v => v.trim());
        conditions.push(sql`r.case_category = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.regressionRiskBand) {
        const vals = q.regressionRiskBand.split(",").map(v => v.trim());
        conditions.push(sql`r.regression_risk_band = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.minRegressionRiskScore) {
        conditions.push(sql`r.regression_risk_score >= ${parseFloat(q.minRegressionRiskScore)}`);
      }
      if (q.caseStatus) {
        const vals = q.caseStatus.split(",").map(v => v.trim());
        conditions.push(sql`r.case_status = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }

      const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

      const rows = await db.execute<{
        resident_id: string;
        internal_code: string | null;
        safehouse_name: string;
        regression_risk_score: number;
        regression_risk_band: string | null;
        regression_risk_drivers: unknown;
        regression_recommended_action: string | null;
        regression_score_updated_at: string | null;
        current_risk_level: string | null;
        case_category: string | null;
      }>(sql`
        SELECT
          r.resident_id,
          r.internal_code,
          sh.name AS safehouse_name,
          r.regression_risk_score,
          r.regression_risk_band,
          r.regression_risk_drivers,
          r.regression_recommended_action,
          r.regression_score_updated_at,
          r.current_risk_level,
          r.case_category
        FROM residents r
        JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        ${where}
        ORDER BY r.regression_risk_score DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `);

      const totalRows = await db.execute<{ count: string; restricted: string }>(sql`
        SELECT
          COUNT(*) FILTER (WHERE r.ml_scores_restricted IS DISTINCT FROM true AND r.regression_risk_score IS NOT NULL)::text AS count,
          COUNT(*) FILTER (WHERE r.ml_scores_restricted = true)::text AS restricted
        FROM residents r
        JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
      `);

      const total      = Number(totalRows.rows[0]?.count ?? 0);
      const restricted = Number(totalRows.rows[0]?.restricted ?? 0);

      const data = rows.rows.map(r => {
        const drivers = (r.regression_risk_drivers as Array<{ label?: string }> | null) ?? null;
        const topDriverLabel = drivers && drivers.length > 0 ? (drivers[0].label ?? null) : null;
        return {
          residentId:                Number(r.resident_id),
          caseCode:                  r.internal_code ?? null,
          safehouseName:             r.safehouse_name,
          regressionRiskScore:       r.regression_risk_score,
          regressionRiskBand:        r.regression_risk_band ?? null,
          regressionRiskDrivers:     drivers,
          topDriverLabel,
          regressionRecommendedAction: r.regression_recommended_action ?? null,
          regressionScoreUpdatedAt:  toIso(r.regression_score_updated_at),
          currentRiskLevel:          r.current_risk_level ?? null,
          caseCategory:              r.case_category ?? null,
          mlScoresRestricted:        false,
        };
      });

      return res.json({
        data,
        meta:       { page: pageNum, pageSize: limitNum, total, totalRestricted: restricted },
        pagination: paginate(total, pageNum, limitNum),
      });
    } catch (e) {
      console.error("[W09-watchlist]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W10 — Reintegration Funnel
 * GET /api/superadmin/residents/reintegration/funnel
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/residents/reintegration/funnel",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const allowedIds = getUserSafehouses(req.user);

      const shFilter = allowedIds && allowedIds.length > 0
        ? sql`AND r.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`
        : sql``;

      const { dateStart, dateEnd } = resolveDateBounds(q);
      const reintegratedDateFilter = dateStart && dateEnd
        ? sql`AND r.date_closed BETWEEN ${dateStart} AND ${dateEnd}`
        : sql``;

      // Stage 1: Assessed
      const assessedRows = await db.execute<{ safehouse_id: string; safehouse_name: string; cnt: string }>(sql`
        SELECT r.safehouse_id, sh.name AS safehouse_name, COUNT(*)::text AS cnt
        FROM residents r JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        WHERE r.reintegration_readiness_score IS NOT NULL
          AND (r.ml_scores_restricted IS NULL OR r.ml_scores_restricted = false)
          AND r.case_status = 'active'
          ${shFilter}
        GROUP BY r.safehouse_id, sh.name
      `);

      // Stage 2: Eligible
      const eligibleRows = await db.execute<{ safehouse_id: string; safehouse_name: string; cnt: string }>(sql`
        SELECT r.safehouse_id, sh.name AS safehouse_name, COUNT(*)::text AS cnt
        FROM residents r JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        WHERE r.reintegration_readiness_band IN ('ready','near-ready')
          AND (r.ml_scores_restricted IS NULL OR r.ml_scores_restricted = false)
          AND r.case_status = 'active'
          ${shFilter}
        GROUP BY r.safehouse_id, sh.name
      `);

      // Stage 3: In Planning
      const planningRows = await db.execute<{ safehouse_id: string; safehouse_name: string; cnt: string }>(sql`
        SELECT r.safehouse_id, sh.name AS safehouse_name, COUNT(DISTINCT r.resident_id)::text AS cnt
        FROM residents r
        JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        JOIN intervention_plans ip ON ip.resident_id = r.resident_id
        WHERE ip.plan_category = 'reintegration'
          AND ip.status IN ('draft','in-progress')
          AND r.case_status = 'active'
          ${shFilter}
        GROUP BY r.safehouse_id, sh.name
      `);

      // Stage 4: Reintegrated (within date range)
      const reintegratedRows = await db.execute<{ safehouse_id: string; safehouse_name: string; cnt: string }>(sql`
        SELECT r.safehouse_id, sh.name AS safehouse_name, COUNT(*)::text AS cnt
        FROM residents r JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        WHERE r.reintegration_status = 'reintegrated'
          ${reintegratedDateFilter}
          ${shFilter}
        GROUP BY r.safehouse_id, sh.name
      `);

      function toBreakdown(rows: { safehouse_id: string; safehouse_name: string; cnt: string }[]) {
        return rows.map(r => ({ safehouseId: Number(r.safehouse_id), safehouseName: r.safehouse_name, count: Number(r.cnt) }));
      }
      function sumCount(rows: { cnt: string }[]) {
        return rows.reduce((s, r) => s + Number(r.cnt), 0);
      }

      const restrictedRow = await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count FROM residents WHERE ml_scores_restricted = true
      `);
      const totalRestricted = Number(restrictedRow.rows[0]?.count ?? 0);

      return res.json({
        data: {
          stages: [
            { stage: "Assessed",     label: "Assessed",     count: sumCount(assessedRows.rows),     safehouseBreakdown: toBreakdown(assessedRows.rows) },
            { stage: "Eligible",     label: "Eligible",     count: sumCount(eligibleRows.rows),     safehouseBreakdown: toBreakdown(eligibleRows.rows) },
            { stage: "In Planning",  label: "In Planning",  count: sumCount(planningRows.rows),     safehouseBreakdown: toBreakdown(planningRows.rows) },
            { stage: "Reintegrated", label: "Reintegrated", count: sumCount(reintegratedRows.rows), safehouseBreakdown: toBreakdown(reintegratedRows.rows) },
          ],
          totalRestricted,
        },
      });
    } catch (e) {
      console.error("[W10-funnel]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W10 — Reintegration Ranked Table (excludes ml_scores_restricted)
 * GET /api/superadmin/residents/reintegration/table
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/residents/reintegration/table",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const pageNum  = Math.max(1, parseInt(q.page ?? "1"));
      const limitNum = resolveLimit(q.pageSize ?? q.limit, undefined, 20);
      const offset   = (pageNum - 1) * limitNum;

      const allowedIds = getUserSafehouses(req.user);
      const conditions: ReturnType<typeof sql>[] = [
        sql`(r.ml_scores_restricted IS NULL OR r.ml_scores_restricted = false)`,
      ];

      if (allowedIds && allowedIds.length > 0) {
        conditions.push(sql`r.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`);
      }
      if (q.safehouseId && q.safehouseId !== "all") {
        if (req.user!.role !== "super_admin") {
          return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
        }
        conditions.push(sql`r.safehouse_id = ${parseInt(q.safehouseId)}`);
      }
      if (q.reintegrationType) {
        const vals = q.reintegrationType.split(",").map(v => v.trim());
        conditions.push(sql`r.reintegration_type = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.reintegrationReadinessBand) {
        const vals = q.reintegrationReadinessBand.split(",").map(v => v.trim());
        conditions.push(sql`r.reintegration_readiness_band = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.regressionRiskBand) {
        const vals = q.regressionRiskBand.split(",").map(v => v.trim());
        conditions.push(sql`r.regression_risk_band = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.minReadinessScore) {
        conditions.push(sql`r.reintegration_readiness_score >= ${parseFloat(q.minReadinessScore)}`);
      }
      if (q.reintegrationStatus) {
        const vals = q.reintegrationStatus.split(",").map(v => v.trim());
        conditions.push(sql`r.reintegration_status = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.caseCategory) {
        const vals = q.caseCategory.split(",").map(v => v.trim());
        conditions.push(sql`r.case_category = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }

      const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

      const rows = await db.execute<{
        resident_id: string;
        internal_code: string | null;
        safehouse_name: string;
        reintegration_readiness_score: number | null;
        reintegration_readiness_band: string | null;
        reintegration_readiness_drivers: unknown;
        reintegration_recommended_action: string | null;
        reintegration_score_updated_at: string | null;
        length_of_stay: string | null;
        reintegration_type: string | null;
        case_category: string | null;
      }>(sql`
        SELECT
          r.resident_id, r.internal_code,
          sh.name AS safehouse_name,
          r.reintegration_readiness_score,
          r.reintegration_readiness_band,
          r.reintegration_readiness_drivers,
          r.reintegration_recommended_action,
          r.reintegration_score_updated_at,
          r.length_of_stay,
          r.reintegration_type,
          r.case_category
        FROM residents r
        JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        ${where}
        ORDER BY r.reintegration_readiness_score DESC NULLS LAST
        LIMIT ${limitNum} OFFSET ${offset}
      `);

      const totalRows = await db.execute<{ count: string; restricted: string }>(sql`
        SELECT
          COUNT(*) FILTER (WHERE r.ml_scores_restricted IS DISTINCT FROM true)::text AS count,
          COUNT(*) FILTER (WHERE r.ml_scores_restricted = true)::text AS restricted
        FROM residents r JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
      `);

      const total      = Number(totalRows.rows[0]?.count ?? 0);
      const restricted = Number(totalRows.rows[0]?.restricted ?? 0);

      const data = rows.rows.map(r => {
        const drivers = r.reintegration_readiness_drivers as {
          positive?: Array<{ label?: string }>;
          barriers?: Array<{ label?: string }>;
        } | null;
        return {
          residentId:                     Number(r.resident_id),
          caseCode:                       r.internal_code ?? null,
          safehouseName:                  r.safehouse_name,
          reintegrationReadinessScore:    r.reintegration_readiness_score ?? null,
          reintegrationReadinessBand:     r.reintegration_readiness_band ?? null,
          topPositiveIndicator:           drivers?.positive?.[0]?.label ?? null,
          topBarrier:                     drivers?.barriers?.[0]?.label ?? null,
          reintegrationRecommendedAction: r.reintegration_recommended_action ?? null,
          reintegrationScoreUpdatedAt:    toIso(r.reintegration_score_updated_at),
          lengthOfStay:                   r.length_of_stay ?? null,
          reintegrationType:              r.reintegration_type ?? null,
          caseCategory:                   r.case_category ?? null,
        };
      });

      return res.json({
        data,
        meta:       { page: pageNum, pageSize: limitNum, total, totalRestricted: restricted },
        pagination: paginate(total, pageNum, limitNum),
      });
    } catch (e) {
      console.error("[W10-table]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W11 — Intervention Effectiveness Matrix
 * GET /api/superadmin/interventions/effectiveness
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/interventions/effectiveness",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const { dateStart, dateEnd } = resolveDateBounds(q);
      const allowedIds = getUserSafehouses(req.user);

      const conditions: ReturnType<typeof sql>[] = [
        sql`ip.status = 'completed'`,
        sql`ip.effectiveness_outcome_score IS NOT NULL`,
      ];

      if (dateStart && dateEnd) {
        conditions.push(sql`ip.updated_at BETWEEN ${dateStart}::timestamptz AND ${dateEnd}::timestamptz`);
      }
      if (allowedIds && allowedIds.length > 0) {
        conditions.push(sql`r.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`);
      }
      if (q.safehouseId && q.safehouseId !== "all") {
        if (req.user!.role !== "super_admin") {
          return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
        }
        conditions.push(sql`r.safehouse_id = ${parseInt(q.safehouseId)}`);
      }
      if (q.planCategory) {
        const vals = q.planCategory.split(",").map(v => v.trim());
        conditions.push(sql`ip.plan_category = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.effectivenessBand) {
        const vals = q.effectivenessBand.split(",").map(v => v.trim());
        conditions.push(sql`ip.effectiveness_band = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }

      const where = sql`WHERE ${sql.join(conditions, sql` AND `)}`;

      const rows = await db.execute<{
        plan_category: string | null;
        plan_count: string;
        avg_effectiveness_score: number | null;
        effectiveness_outcome_drivers_agg: unknown[];
        high_impact: string;
        moderate: string;
        low_impact: string;
        insufficient_data: string;
      }>(sql`
        SELECT
          ip.plan_category,
          COUNT(*)::text AS plan_count,
          AVG(ip.effectiveness_outcome_score)::double precision AS avg_effectiveness_score,
          ARRAY_AGG(ip.effectiveness_outcome_drivers) AS effectiveness_outcome_drivers_agg,
          COUNT(*) FILTER (WHERE ip.effectiveness_band = 'high-impact')::text AS high_impact,
          COUNT(*) FILTER (WHERE ip.effectiveness_band = 'moderate')::text AS moderate,
          COUNT(*) FILTER (WHERE ip.effectiveness_band = 'low-impact')::text AS low_impact,
          COUNT(*) FILTER (WHERE ip.effectiveness_band = 'insufficient-data')::text AS insufficient_data
        FROM intervention_plans ip
        JOIN residents r ON r.resident_id = ip.resident_id
        ${where}
        GROUP BY ip.plan_category
        ORDER BY avg_effectiveness_score DESC NULLS LAST
      `);

      const data = rows.rows.map(r => {
        const driversAgg = (r.effectiveness_outcome_drivers_agg as Array<Array<{ dimension?: string; delta?: number }> | null>) ?? [];
        let avgHealthScoreDelta = null as number | null;
        let avgEducationProgressDelta = null as number | null;
        let avgSessionProgressRate = null as number | null;
        let healthCount = 0, educationCount = 0, sessionCount = 0;
        let healthSum = 0, educationSum = 0, sessionSum = 0;

        for (const drivers of driversAgg) {
          if (!drivers) continue;
          for (const d of drivers) {
            if (d.dimension === "health_score" && d.delta !== undefined) { healthSum += d.delta; healthCount++; }
            if (d.dimension === "education_progress" && d.delta !== undefined) { educationSum += d.delta; educationCount++; }
            if (d.dimension === "session_progress" && d.delta !== undefined) { sessionSum += d.delta; sessionCount++; }
          }
        }
        if (healthCount > 0) avgHealthScoreDelta = parseFloat((healthSum / healthCount).toFixed(2));
        if (educationCount > 0) avgEducationProgressDelta = parseFloat((educationSum / educationCount).toFixed(2));
        if (sessionCount > 0) avgSessionProgressRate = parseFloat((sessionSum / sessionCount).toFixed(4));

        return {
          planCategory:            r.plan_category ?? "Unknown",
          planCount:               Number(r.plan_count),
          avgEffectivenessScore:   r.avg_effectiveness_score ?? null,
          avgHealthScoreDelta,
          avgEducationProgressDelta,
          avgSessionProgressRate,
          effectivenessBandDistribution: {
            "high-impact":       Number(r.high_impact),
            "moderate":          Number(r.moderate),
            "low-impact":        Number(r.low_impact),
            "insufficient-data": Number(r.insufficient_data),
          },
        };
      });

      return res.json({ data });
    } catch (e) {
      console.error("[W11]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W11 Drilldown — Individual plans within a category
 * GET /api/superadmin/interventions/effectiveness/:category/plans
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/interventions/effectiveness/:category/plans",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const category = req.params.category as string;
      const allowedIds = getUserSafehouses(req.user);

      const shFilter = allowedIds && allowedIds.length > 0
        ? sql`AND r.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`
        : sql``;

      const rows = await db.execute<{
        plan_id: string;
        services_provided: string | null;
        effectiveness_outcome_score: number | null;
        effectiveness_outcome_drivers: unknown;
        internal_code: string | null;
        safehouse_name: string;
      }>(sql`
        SELECT
          ip.plan_id, ip.services_provided,
          ip.effectiveness_outcome_score, ip.effectiveness_outcome_drivers,
          r.internal_code, sh.name AS safehouse_name
        FROM intervention_plans ip
        JOIN residents r ON r.resident_id = ip.resident_id
        JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
        WHERE ip.plan_category = ${category}
          AND ip.status = 'completed'
          AND ip.effectiveness_outcome_score IS NOT NULL
          ${shFilter}
        ORDER BY ip.effectiveness_outcome_score DESC NULLS LAST
      `);

      const data = rows.rows.map(r => {
        const drivers = (r.effectiveness_outcome_drivers as Array<{ label?: string }> | null) ?? null;
        const topDriverLabel = drivers && drivers.length > 0 ? (drivers[0].label ?? null) : null;
        return {
          planId:                     Number(r.plan_id),
          servicesProvided:           r.services_provided ?? null,
          effectivenessOutcomeScore:  r.effectiveness_outcome_score ?? null,
          topDriverLabel,
          effectivenessOutcomeDrivers: drivers,
          internalCode:               r.internal_code ?? null,
          safehouseName:              r.safehouse_name,
        };
      });

      return res.json({ data });
    } catch (e) {
      console.error("[W11-plans]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W12 — Safehouse Health Leaderboard
 * GET /api/superadmin/safehouses/health
 * Role: super_admin (all safehouses) | admin (own safehouse only, no peer rank)
 */
router.get(
  "/superadmin/safehouses/health",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const allowedIds = getUserSafehouses(req.user);

      const conditions: ReturnType<typeof sql>[] = [];

      if (allowedIds && allowedIds.length > 0) {
        conditions.push(sql`sh.safehouse_id = ANY(ARRAY[${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)}]::bigint[])`);
      }
      if (q.monthStart) {
        conditions.push(sql`smm.month_start = ${q.monthStart}`);
      }
      if (q.status) {
        const vals = q.status.split(",").map(v => v.trim());
        conditions.push(sql`sh.status = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.region) {
        const vals = q.region.split(",").map(v => v.trim());
        conditions.push(sql`sh.region = ANY(ARRAY[${sql.join(vals.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }

      const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const rows = await db.execute<{
        safehouse_id: string;
        safehouse_name: string;
        safehouse_code: string | null;
        region: string | null;
        city: string | null;
        status: string | null;
        month_start: string | null;
        composite_health_score: number | null;
        peer_rank: number | null;
        health_band: string | null;
        trend_direction: string | null;
        health_score_drivers: unknown;
        incident_severity_distribution: unknown;
        health_score_computed_at: string | null;
        avg_health_score: string | null;
        avg_education_progress: string | null;
        incident_count: number | null;
        process_recording_count: number | null;
        home_visitation_count: number | null;
        active_residents: number | null;
      }>(sql`
        WITH latest_metrics AS (
          SELECT DISTINCT ON (safehouse_id)
            safehouse_id, month_start,
            composite_health_score, peer_rank, health_band,
            trend_direction, health_score_drivers,
            incident_severity_distribution, health_score_computed_at,
            avg_health_score, avg_education_progress,
            incident_count, process_recording_count,
            home_visitation_count, active_residents
          FROM safehouse_monthly_metrics
          ORDER BY safehouse_id, month_start DESC
        )
        SELECT
          sh.safehouse_id, sh.name AS safehouse_name,
          sh.safehouse_code, sh.region, sh.city, sh.status,
          lm.month_start,
          lm.composite_health_score, lm.peer_rank, lm.health_band,
          lm.trend_direction, lm.health_score_drivers,
          lm.incident_severity_distribution, lm.health_score_computed_at,
          lm.avg_health_score, lm.avg_education_progress,
          lm.incident_count, lm.process_recording_count,
          lm.home_visitation_count, lm.active_residents
        FROM safehouses sh
        LEFT JOIN latest_metrics lm ON lm.safehouse_id = sh.safehouse_id
        ${where}
        ORDER BY lm.peer_rank ASC NULLS LAST
      `);

      const isSuperAdmin = req.user!.role === "super_admin";
      const data = rows.rows.map(r => ({
        safehouseId:                  Number(r.safehouse_id),
        safehouseName:                r.safehouse_name,
        safehouseCode:                r.safehouse_code ?? null,
        region:                       r.region ?? null,
        city:                         r.city ?? null,
        status:                       r.status ?? null,
        monthStart:                   r.month_start ?? null,
        compositeHealthScore:         r.composite_health_score ?? null,
        peerRank:                     isSuperAdmin ? (r.peer_rank ?? null) : null,
        healthBand:                   r.health_band ?? null,
        trendDirection:               r.trend_direction ?? null,
        healthScoreDrivers:           (r.health_score_drivers as unknown[]) ?? null,
        incidentSeverityDistribution: r.incident_severity_distribution ?? null,
        healthScoreComputedAt:        toIso(r.health_score_computed_at),
        avgHealthScore:               numericStr(r.avg_health_score),
        avgEducationProgress:         numericStr(r.avg_education_progress),
        incidentCount:                r.incident_count ?? null,
        processRecordingCount:        r.process_recording_count ?? null,
        homeVisitationCount:          r.home_visitation_count ?? null,
        activeResidents:              r.active_residents ?? null,
      }));

      return res.json({ data });
    } catch (e) {
      console.error("[W12]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W12 — Safehouse Health History (for drilldown trend line)
 * GET /api/superadmin/safehouses/:id/health-history
 * Role: super_admin | admin
 */
router.get(
  "/superadmin/safehouses/:id/health-history",
  requireAuth,
  requireRoles("super_admin", "admin"),
  async (req, res) => {
    try {
      const safehouseId = parseInt(req.params.id as string);
      const allowedIds  = getUserSafehouses(req.user);
      if (allowedIds && !allowedIds.includes(safehouseId)) {
        return res.status(403).json({ error: { code: "FORBIDDEN", message: "Insufficient permissions" } });
      }

      const rows = await db.execute<{
        month_start: string;
        composite_health_score: number | null;
        peer_rank: number | null;
        health_band: string | null;
        trend_direction: string | null;
        incident_count: number | null;
        incident_severity_distribution: unknown;
        health_score_drivers: unknown;
        health_score_computed_at: string | null;
      }>(sql`
        SELECT
          month_start, composite_health_score, peer_rank, health_band,
          trend_direction, incident_count, incident_severity_distribution,
          health_score_drivers, health_score_computed_at
        FROM safehouse_monthly_metrics
        WHERE safehouse_id = ${safehouseId}
          AND month_start IS NOT NULL
        ORDER BY month_start DESC
        LIMIT 12
      `);

      const data = rows.rows.map(r => ({
        monthStart:                   r.month_start,
        compositeHealthScore:         r.composite_health_score ?? null,
        peerRank:                     r.peer_rank ?? null,
        healthBand:                   r.health_band ?? null,
        trendDirection:               r.trend_direction ?? null,
        incidentCount:                r.incident_count ?? null,
        incidentSeverityDistribution: r.incident_severity_distribution ?? null,
        healthScoreDrivers:           (r.health_score_drivers as unknown[]) ?? null,
        healthScoreComputedAt:        toIso(r.health_score_computed_at),
      }));

      return res.json({ data });
    } catch (e) {
      console.error("[W12-history]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W12 — Safehouse Compare Mode (radar chart)
 * GET /api/superadmin/safehouses/health/compare?safehouseIdA=1&safehouseIdB=2&monthStart=2026-04-01
 * Role: super_admin only
 */
router.get(
  "/superadmin/safehouses/health/compare",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;
      const idA = parseInt(q.safehouseIdA ?? "");
      const idB = parseInt(q.safehouseIdB ?? "");
      if (isNaN(idA) || isNaN(idB)) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "safehouseIdA and safehouseIdB are required integers" } });
      }

      const monthFilter = q.monthStart
        ? sql`AND smm.month_start = ${q.monthStart}`
        : sql``;

      async function fetchSafehouseSnapshot(id: number) {
        const rows = await db.execute<{
          safehouse_id: string;
          safehouse_name: string;
          avg_health_score: string | null;
          avg_education_progress: string | null;
          incident_count: number | null;
          process_recording_count: number | null;
          home_visitation_count: number | null;
        }>(sql`
          SELECT
            sh.safehouse_id, sh.name AS safehouse_name,
            smm.avg_health_score, smm.avg_education_progress,
            smm.incident_count, smm.process_recording_count,
            smm.home_visitation_count
          FROM safehouses sh
          LEFT JOIN LATERAL (
            SELECT avg_health_score, avg_education_progress, incident_count,
                   process_recording_count, home_visitation_count
            FROM safehouse_monthly_metrics
            WHERE safehouse_id = sh.safehouse_id ${monthFilter}
            ORDER BY month_start DESC LIMIT 1
          ) smm ON true
          WHERE sh.safehouse_id = ${id}
        `);
        return rows.rows[0] ?? null;
      }

      // Compute incidentCountInverted: 100 - (incidentCount / maxIncidentCount * 100)
      const maxIncRow = await db.execute<{ max_inc: string }>(sql`
        SELECT MAX(incident_count)::text AS max_inc FROM safehouse_monthly_metrics WHERE incident_count IS NOT NULL
      `);
      const maxInc = Number(maxIncRow.rows[0]?.max_inc ?? 1) || 1;

      const [rowA, rowB] = await Promise.all([fetchSafehouseSnapshot(idA), fetchSafehouseSnapshot(idB)]);

      function buildAxes(row: typeof rowA) {
        if (!row) return null;
        const inc = row.incident_count ?? 0;
        return {
          avgHealthScore:          parseFloat(row.avg_health_score ?? "0") || null,
          avgEducationProgress:    parseFloat(row.avg_education_progress ?? "0") || null,
          incidentCountInverted:   parseFloat((100 - (inc / maxInc) * 100).toFixed(1)),
          processRecordingCount:   row.process_recording_count ?? null,
          homeVisitationCount:     row.home_visitation_count ?? null,
        };
      }

      return res.json({
        data: {
          safehouseA: rowA ? { safehouseId: idA, safehouseName: rowA.safehouse_name, axes: buildAxes(rowA) } : null,
          safehouseB: rowB ? { safehouseId: idB, safehouseName: rowB.safehouse_name, axes: buildAxes(rowB) } : null,
        },
      });
    } catch (e) {
      console.error("[W12-compare]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

// ── MODEL OPERATIONS PAGE ─────────────────────────────────────────────────────

/**
 * W13 — Pipeline Status Table (replaces existing /ml/pipelines)
 * GET /api/superadmin/ml/pipelines
 * Role: super_admin
 */
router.get(
  "/superadmin/ml/pipelines",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const q = req.query as Record<string, string>;

      const conditions: ReturnType<typeof sql>[] = [];
      if (q.pipelineName) {
        const names = q.pipelineName.split(",").map(v => v.trim());
        conditions.push(sql`r.pipeline_name = ANY(ARRAY[${sql.join(names.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.status) {
        const statuses = q.status.split(",").map(v => v.trim());
        conditions.push(sql`r.status = ANY(ARRAY[${sql.join(statuses.map(v => sql`${v}`), sql`, `)}]::text[])`);
      }
      if (q.trainedAtStart) {
        conditions.push(sql`r.trained_at >= ${q.trainedAtStart}::timestamptz`);
      }
      if (q.trainedAtEnd) {
        conditions.push(sql`r.trained_at <= ${q.trainedAtEnd}::timestamptz`);
      }

      const where = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const rows = await db.execute<{
        run_id: string;
        pipeline_name: string;
        display_name: string | null;
        model_name: string | null;
        status: string;
        trained_at: string;
        scored_entity_count: number | null;
        data_source: string | null;
        metrics_json: unknown;
        feature_importance_json: unknown;
        last_prediction_at: string | null;
        prediction_count: string;
        avg_score: string | null;
        min_score: string | null;
        max_score: string | null;
      }>(sql`
        WITH latest_predictions AS (
          SELECT
            pipeline_name,
            MAX(created_at)                  AS last_prediction_at,
            COUNT(*)                         AS prediction_count,
            AVG(prediction_score)            AS avg_score,
            MIN(prediction_score)            AS min_score,
            MAX(prediction_score)            AS max_score
          FROM ml_prediction_snapshots
          GROUP BY pipeline_name
        )
        SELECT
          r.run_id, r.pipeline_name, r.display_name, r.model_name,
          r.status, r.trained_at, r.scored_entity_count, r.data_source,
          r.metrics_json, r.feature_importance_json,
          lp.last_prediction_at,
          COALESCE(lp.prediction_count, 0)::text AS prediction_count,
          lp.avg_score::text AS avg_score,
          lp.min_score::text AS min_score,
          lp.max_score::text AS max_score
        FROM ml_pipeline_runs r
        LEFT JOIN latest_predictions lp ON lp.pipeline_name = r.pipeline_name
        ${where}
        ORDER BY r.trained_at DESC
      `);

      const data = rows.rows.map(r => {
        const metrics = (r.metrics_json as Record<string, number> | null) ?? {};
        const lastAt  = r.last_prediction_at ? new Date(r.last_prediction_at) : null;
        const daysSince = lastAt
          ? Math.floor((Date.now() - lastAt.getTime()) / 86400_000)
          : null;
        const runIdNum = Number(r.run_id);
        return {
          runId:             runIdNum,
          latestRunId:       runIdNum,
          lastRunId:         runIdNum,
          pipelineName:      r.pipeline_name,
          displayName:       r.display_name ?? null,
          modelName:         r.model_name ?? null,
          lastRunStatus:     r.status,
          lastRunAt:         toIso(r.trained_at),
          scoredEntityCount: r.scored_entity_count ?? null,
          dataSource:        r.data_source ?? null,
          metricsF1:         metrics.f1 ?? null,
          metricsPrecision:  metrics.precision ?? null,
          metricsRecall:     metrics.recall ?? null,
          metricsRmse:       metrics.rmse ?? null,
          daysSinceLastRun:  daysSince,
          freshness:         freshnessStatus(daysSince, r.pipeline_name),
          totalSnapshots:    Number(r.prediction_count),
          avgScore:          r.avg_score !== null ? parseFloat(parseFloat(r.avg_score).toFixed(4)) : null,
          minScore:          r.min_score !== null ? parseFloat(parseFloat(r.min_score).toFixed(4)) : null,
          maxScore:          r.max_score !== null ? parseFloat(parseFloat(r.max_score).toFixed(4)) : null,
          featureImportanceJson: r.feature_importance_json ?? null,
        };
      });

      return res.json({ data });
    } catch (e) {
      console.error("[W13-pipelines]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W13 — Score Distribution Histogram
 * GET /api/superadmin/ml/score-distribution?pipelineName=donor_churn_risk
 * Role: super_admin
 */
router.get(
  "/superadmin/ml/score-distribution",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const { pipelineName } = req.query as Record<string, string>;
      if (!pipelineName) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "pipelineName is required" } });
      }

      const latestRun = await db.execute<{ run_id: string }>(sql`
        SELECT run_id FROM ml_pipeline_runs
        WHERE pipeline_name = ${pipelineName} AND status = 'completed'
        ORDER BY trained_at DESC LIMIT 1
      `);

      if (!latestRun.rows[0]) {
        return res.json({ data: null });
      }
      const runId = Number(latestRun.rows[0].run_id);

      const rows = await db.execute<{ bucket: string; count: string }>(sql`
        SELECT
          (FLOOR(prediction_score * 10) / 10)::text AS bucket,
          COUNT(*)::text AS count
        FROM ml_prediction_snapshots
        WHERE pipeline_name = ${pipelineName}
          AND run_id = ${runId}
          AND prediction_score IS NOT NULL
        GROUP BY FLOOR(prediction_score * 10)
        ORDER BY FLOOR(prediction_score * 10)
      `);

      const bucketMap = new Map<number, number>();
      for (const r of rows.rows) {
        bucketMap.set(parseFloat(r.bucket), Number(r.count));
      }
      const buckets = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(b => ({
        bucket: b,
        count:  bucketMap.get(b) ?? 0,
      }));

      return res.json({ data: { pipelineName, runId, buckets } });
    } catch (e) {
      console.error("[W13-score-dist]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W13 — Band Label Distribution
 * GET /api/superadmin/ml/band-distribution?pipelineName=donor_churn_risk
 * Role: super_admin
 */
router.get(
  "/superadmin/ml/band-distribution",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const { pipelineName } = req.query as Record<string, string>;
      if (!pipelineName) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "pipelineName is required" } });
      }

      const latestRun = await db.execute<{ run_id: string }>(sql`
        SELECT run_id FROM ml_pipeline_runs
        WHERE pipeline_name = ${pipelineName} AND status = 'completed'
        ORDER BY trained_at DESC LIMIT 1
      `);

      if (!latestRun.rows[0]) {
        return res.json({ data: null });
      }
      const runId = Number(latestRun.rows[0].run_id);

      const rows = await db.execute<{ band_label: string | null; count: string }>(sql`
        SELECT band_label, COUNT(*)::text AS count
        FROM ml_prediction_snapshots
        WHERE pipeline_name = ${pipelineName} AND run_id = ${runId}
        GROUP BY band_label
        ORDER BY count DESC
      `);

      const bands = rows.rows.map(r => ({
        bandLabel: r.band_label ?? "unclassified",
        count:     Number(r.count),
      }));

      return res.json({ data: { pipelineName, runId, bands } });
    } catch (e) {
      console.error("[W13-band-dist]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * W13 — Feature Importance for a pipeline run
 * GET /api/superadmin/ml/feature-importance/:runId
 * Role: super_admin
 */
router.get(
  "/superadmin/ml/feature-importance/:runId",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const runId = parseInt(req.params.runId as string);
      const rows = await db.execute<{
        run_id: string;
        pipeline_name: string;
        display_name: string | null;
        feature_importance_json: unknown;
      }>(sql`
        SELECT run_id, pipeline_name, display_name, feature_importance_json
        FROM ml_pipeline_runs
        WHERE run_id = ${runId}
        LIMIT 1
      `);

      if (!rows.rows[0]) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Pipeline run not found" } });
      }

      const r = rows.rows[0];
      const features = (r.feature_importance_json as Array<{ feature: string; importance: number; label?: string }> | null) ?? null;
      const topFeatures = features
        ? [...features].sort((a, b) => b.importance - a.importance).slice(0, 10)
        : null;

      return res.json({
        data: {
          runId:                Number(r.run_id),
          pipelineName:         r.pipeline_name,
          displayName:          r.display_name ?? null,
          featureImportanceJson: topFeatures,
        },
      });
    } catch (e) {
      console.error("[W13-feature]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

// ── PATCH ACTION ENDPOINTS ────────────────────────────────────────────────────

/**
 * PATCH /api/superadmin/residents/:id — update resident ML action fields
 * Allowed fields: regressionRecommendedAction, reintegrationRecommendedAction
 * Role: super_admin
 */
router.patch(
  "/superadmin/residents/:id",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const residentId = parseInt(req.params.id as string);
      const body = req.body as Record<string, string>;
      const updates: string[] = [];
      const values: unknown[] = [];

      if (body.regressionRecommendedAction !== undefined) {
        values.push(body.regressionRecommendedAction);
        updates.push(`regression_recommended_action = $${values.length}`);
      }
      if (body.reintegrationRecommendedAction !== undefined) {
        values.push(body.reintegrationRecommendedAction);
        updates.push(`reintegration_recommended_action = $${values.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
      }

      values.push(residentId);
      const result = await db.execute(
        sql.raw(`UPDATE residents SET ${updates.join(", ")} WHERE resident_id = $${values.length} RETURNING resident_id`),
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Resident not found" } });
      }
      return res.json({ success: true, residentId });
    } catch (e) {
      console.error("[PATCH resident]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * PATCH /api/superadmin/donors/:id — update donor ML action fields
 * Allowed fields: churnRecommendedAction, upgradeBand
 * Role: super_admin
 */
router.patch(
  "/superadmin/donors/:id",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const supporterId = parseInt(req.params.id as string);
      const body = req.body as Record<string, string>;
      const updates: string[] = [];
      const values: unknown[] = [];

      if (body.churnRecommendedAction !== undefined) {
        values.push(body.churnRecommendedAction);
        updates.push(`churn_recommended_action = $${values.length}`);
      }
      if (body.upgradeBand !== undefined) {
        values.push(body.upgradeBand);
        updates.push(`upgrade_band = $${values.length}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No valid fields to update" } });
      }

      values.push(supporterId);
      const result = await db.execute(
        sql.raw(`UPDATE supporters SET ${updates.join(", ")} WHERE supporter_id = $${values.length} RETURNING supporter_id`),
      );

      if (!result.rows[0]) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Supporter not found" } });
      }
      return res.json({ success: true, supporterId });
    } catch (e) {
      console.error("[PATCH donor]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

/**
 * PATCH /api/superadmin/campaigns/:id/ml-flags — update campaign ML flags in snapshot context_json
 * Role: super_admin
 */
router.patch(
  "/superadmin/campaigns/:id/ml-flags",
  requireAuth,
  requireRoles("super_admin"),
  async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id as string);
      const { recommendedAvoid } = req.body as { recommendedAvoid?: boolean };

      if (recommendedAvoid === undefined) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "recommendedAvoid is required" } });
      }

      await db.execute(sql`
        UPDATE ml_prediction_snapshots
        SET context_json = COALESCE(context_json, '{}'::jsonb) || ${JSON.stringify({ recommendedAvoid })}::jsonb
        WHERE pipeline_name = 'campaign_effectiveness'
          AND entity_id = ${campaignId}
          AND run_id = (
            SELECT run_id FROM ml_pipeline_runs
            WHERE pipeline_name = 'campaign_effectiveness' AND status = 'completed'
            ORDER BY trained_at DESC LIMIT 1
          )
      `);

      return res.json({ success: true, campaignId });
    } catch (e) {
      console.error("[PATCH campaign ml-flags]", e);
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed" } });
    }
  },
);

export default router;
