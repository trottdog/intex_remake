import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { supportersTable, donationsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

type SupporterRow = typeof supportersTable.$inferSelect;

function fmt(r: SupporterRow) {
  return { ...r };
}

router.get("/supporters/me", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    if (!req.user!.supporterId) return res.status(404).json({ error: "Donor profile not found" });
    const [row] = await db.select().from(supportersTable).where(eq(supportersTable.supporterId, req.user!.supporterId!)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/supporters/me", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    if (!req.user!.supporterId) return res.status(404).json({ error: "Donor profile not found" });
    const { firstName, lastName, phone, organizationName } = req.body as Partial<SupporterRow>;
    const updates: Partial<typeof supportersTable.$inferInsert> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (organizationName !== undefined) updates.organizationName = organizationName;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No fields to update" });
    const [updated] = await db.update(supportersTable).set(updates).where(eq(supportersTable.supporterId, req.user!.supporterId!)).returning();
    return res.json(fmt(updated));
  } catch { return res.status(500).json({ error: "Failed to update profile" }); }
});

router.get("/supporters/me/recurring", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    if (!req.user!.supporterId) return res.status(404).json({ error: "Donor profile not found" });
    const [row] = await db.select({ recurringEnabled: supportersTable.recurringEnabled })
      .from(supportersTable).where(eq(supportersTable.supporterId, req.user!.supporterId!)).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ recurringEnabled: row.recurringEnabled ?? false });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/supporters/me/recurring", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    if (!req.user!.supporterId) return res.status(404).json({ error: "Donor profile not found" });
    const { recurringEnabled } = req.body as { recurringEnabled: boolean };
    if (typeof recurringEnabled !== "boolean") return res.status(400).json({ error: "recurringEnabled must be a boolean" });
    const [updated] = await db.update(supportersTable)
      .set({ recurringEnabled })
      .where(eq(supportersTable.supporterId, req.user!.supporterId!))
      .returning({ recurringEnabled: supportersTable.recurringEnabled });
    return res.json({ recurringEnabled: updated.recurringEnabled ?? false, message: recurringEnabled ? "Recurring monthly donations enabled." : "Recurring donations disabled." });
  } catch { return res.status(500).json({ error: "Failed to update recurring status" }); }
});

// ── Supporter stats — all real DB queries ─────────────────────────────────────
router.get("/supporters/stats", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const thisMonth = new Date();
    const monthStart = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, "0")}-01`;

    const [counts] = await db.select({
      total:        sql<number>`count(*)::int`,
      active:       sql<number>`count(*) filter (where status = 'active' or status is null)::int`,
      recurring:    sql<number>`count(*) filter (where recurring_enabled = true)::int`,
      newThisMonth: sql<number>`count(*) filter (where created_at >= ${monthStart})::int`,
    }).from(supportersTable);

    const [donationAgg] = await db.select({
      lifetimeTotal:  sql<string>`coalesce(sum(amount::numeric), 0)`,
      thisMonthTotal: sql<string>`coalesce(sum(amount::numeric) filter (where donation_date >= ${monthStart}), 0)`,
      totalCount:     sql<number>`count(*)::int`,
    }).from(donationsTable);

    const byChannel = await db.select({
      channel: supportersTable.acquisitionChannel,
      count:   sql<number>`count(*)::int`,
    }).from(supportersTable).groupBy(supportersTable.acquisitionChannel);

    const byType = await db.select({
      type:  supportersTable.supporterType,
      count: sql<number>`count(*)::int`,
    }).from(supportersTable).groupBy(supportersTable.supporterType);

    const total = Number(counts.total) || 0;
    const lifetimeTotal = parseFloat(String(donationAgg.lifetimeTotal)) || 0;
    const totalDonationCount = Number(donationAgg.totalCount) || 0;
    const avgGiftSize = totalDonationCount > 0 ? parseFloat((lifetimeTotal / totalDonationCount).toFixed(2)) : 0;

    return res.json({
      totalSupporters:  total,
      activeSupporters: Number(counts.active) || 0,
      recurringDonors:  Number(counts.recurring) || 0,
      newSupporters:    Number(counts.newThisMonth) || 0,
      raisedThisMonth:  parseFloat(String(donationAgg.thisMonthTotal)) || 0,
      lifetimeTotal:    parseFloat(lifetimeTotal.toFixed(2)),
      avgGiftSize,
      acquisitionByChannel: byChannel
        .filter(r => r.channel)
        .map(r => ({ channel: r.channel!, count: Number(r.count) })),
      supportTypeMix: byType
        .filter(r => r.type)
        .map(r => ({ type: r.type!, count: Number(r.count), percentage: parseFloat(((Number(r.count) / (total || 1)) * 100).toFixed(2)) })),
    });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.get("/supporters/:id/giving-stats", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const donations = await db.select().from(donationsTable).where(eq(donationsTable.supporterId, id));
    const total = donations.reduce((s, d) => s + parseFloat(d.amount || "0"), 0);
    return res.json({
      supporterId: id,
      totalGiven: parseFloat(total.toFixed(2)),
      donationCount: donations.length,
      avgGiftAmount: donations.length > 0 ? parseFloat((total / donations.length).toFixed(2)) : 0,
      lastDonationDate: donations.sort((a, b) => String(b.donationDate).localeCompare(String(a.donationDate)))[0]?.donationDate ?? null,
      donationsByType: donations.reduce((acc, d) => { if (d.donationType) acc[d.donationType] = (acc[d.donationType] || 0) + 1; return acc; }, {} as Record<string, number>),
    });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── List supporters — LEFT JOIN donations, grouped by PK for accurate totals ──
router.get("/supporters", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const offset = (pageNum - 1) * limitNum;

    // Use LEFT JOIN + GROUP BY supporter_id. PostgreSQL allows selecting all
    // non-aggregated columns when grouped by the primary key (functional dependency).
    const rows = await db
      .select({
        supporterId:        supportersTable.supporterId,
        supporterType:      supportersTable.supporterType,
        displayName:        supportersTable.displayName,
        organizationName:   supportersTable.organizationName,
        firstName:          supportersTable.firstName,
        lastName:           supportersTable.lastName,
        relationshipType:   supportersTable.relationshipType,
        region:             supportersTable.region,
        country:            supportersTable.country,
        email:              supportersTable.email,
        phone:              supportersTable.phone,
        status:             supportersTable.status,
        createdAt:          supportersTable.createdAt,
        firstDonationDate:  supportersTable.firstDonationDate,
        acquisitionChannel: supportersTable.acquisitionChannel,
        canLogin:           supportersTable.canLogin,
        recurringEnabled:   supportersTable.recurringEnabled,
        // These aggregates compute correctly over the LEFT JOIN per-supporter group
        lifetimeGiving: sql<string>`COALESCE(SUM(${donationsTable.amount}::numeric), 0)`,
        donationCount:  sql<number>`COUNT(${donationsTable.donationId})::int`,
        lastGiftDate:   sql<string | null>`MAX(${donationsTable.donationDate})`,
        hasRecurring:   sql<boolean>`COALESCE(BOOL_OR(${donationsTable.isRecurring}), false)`,
      })
      .from(supportersTable)
      .leftJoin(donationsTable, eq(donationsTable.supporterId, supportersTable.supporterId))
      .groupBy(supportersTable.supporterId)
      .limit(limitNum)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(supportersTable);

    const data = rows.map(r => ({
      ...r,
      lifetimeGiving: parseFloat(String(r.lifetimeGiving)) || 0,
      donationCount:  Number(r.donationCount) || 0,
    }));

    return res.json({ data, total: Number(total), pagination: paginate(Number(total), pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/supporters", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(supportersTable).values(req.body).returning();
    return res.status(201).json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/supporters/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(supportersTable).where(eq(supportersTable.supporterId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/supporters/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(supportersTable).set(req.body).where(eq(supportersTable.supporterId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/supporters/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(supportersTable).where(eq(supportersTable.supporterId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
