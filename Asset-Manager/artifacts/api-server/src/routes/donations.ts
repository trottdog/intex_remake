import { Router } from "express";
import { eq, sql, desc, isNull, isNotNull } from "drizzle-orm";
import { db } from "../lib/db";
import { donationsTable, donationAllocationsTable, supportersTable, safehousesTable } from "@workspace/db/schema";
import { requireAuth, requireRoles, getUserSafehouses } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

type DonationRow = typeof donationsTable.$inferSelect;

function fmt(d: DonationRow, supporterName = "") {
  return {
    ...d,
    amount: d.amount ? parseFloat(d.amount) : null,
    estimatedValue: d.estimatedValue ? parseFloat(d.estimatedValue) : null,
    supporterName,
  };
}

// ── Donor: own ledger ─────────────────────────────────────────────────────────
router.get("/donations/my-ledger", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    const { page = "1", limit = "20", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    if (!req.user!.supporterId) return res.json({ data: [], total: 0, pagination: paginate(0, pageNum, limitNum) });
    const rows = await db.select({
      donationId: donationsTable.donationId,
      supporterId: donationsTable.supporterId,
      donationType: donationsTable.donationType,
      donationDate: donationsTable.donationDate,
      isRecurring: donationsTable.isRecurring,
      campaignId: donationsTable.campaignId,
      campaignName: donationsTable.campaignName,
      channelSource: donationsTable.channelSource,
      currencyCode: donationsTable.currencyCode,
      amount: donationsTable.amount,
      estimatedValue: donationsTable.estimatedValue,
      impactUnit: donationsTable.impactUnit,
      notes: donationsTable.notes,
      referralPostId: donationsTable.referralPostId,
      safehouseId: donationsTable.safehouseId,
      safehouseName: safehousesTable.name,
    })
      .from(donationsTable)
      .leftJoin(safehousesTable, eq(donationsTable.safehouseId, safehousesTable.safehouseId))
      .where(eq(donationsTable.supporterId, req.user!.supporterId!))
      .limit(limitNum).offset((pageNum - 1) * limitNum);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(donationsTable).where(eq(donationsTable.supporterId, req.user!.supporterId!));
    const total = Number(count);
    return res.json({ data: rows.map(d => ({ ...d, amount: d.amount ? parseFloat(d.amount) : null })), total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── Trends ────────────────────────────────────────────────────────────────────
router.get("/donations/trends", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const months = parseInt((req.query.months as string) || "12");
    const rows = await db.select({
      month: sql<string>`to_char(${donationsTable.donationDate}::date, 'YYYY-MM')`,
      totalAmount: sql<number>`coalesce(sum(${donationsTable.amount}::numeric), 0)`,
      donationCount: sql<number>`count(*)`,
      avgAmount: sql<number>`coalesce(avg(${donationsTable.amount}::numeric), 0)`,
    }).from(donationsTable)
      .groupBy(sql`to_char(${donationsTable.donationDate}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${donationsTable.donationDate}::date, 'YYYY-MM')`)
      .limit(months);
    return res.json({ data: rows.map(r => ({
      month: r.month, period: r.month,
      total: parseFloat(String(r.totalAmount)), totalAmount: parseFloat(String(r.totalAmount)),
      count: Number(r.donationCount), donationCount: Number(r.donationCount),
      avgAmount: parseFloat(String(r.avgAmount)),
    })) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── List all donations (admin/staff/super_admin) ──────────────────────────────
router.get("/donations", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "100", pageSize, fundType } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedSafehouses = getUserSafehouses(req.user);

    let query = db.select({
      donationId: donationsTable.donationId,
      supporterId: donationsTable.supporterId,
      donationType: donationsTable.donationType,
      donationDate: donationsTable.donationDate,
      isRecurring: donationsTable.isRecurring,
      campaignId: donationsTable.campaignId,
      campaignName: donationsTable.campaignName,
      channelSource: donationsTable.channelSource,
      currencyCode: donationsTable.currencyCode,
      amount: donationsTable.amount,
      estimatedValue: donationsTable.estimatedValue,
      notes: donationsTable.notes,
      safehouseId: donationsTable.safehouseId,
      safehouseName: safehousesTable.name,
      supporterDisplayName: supportersTable.displayName,
      supporterFirstName: supportersTable.firstName,
      supporterLastName: supportersTable.lastName,
      totalAllocated: sql<string>`coalesce((select sum(da.amount_allocated::numeric) from donation_allocations da where da.donation_id = ${donationsTable.donationId}), 0)`,
    })
      .from(donationsTable)
      .leftJoin(supportersTable, eq(donationsTable.supporterId, supportersTable.supporterId))
      .leftJoin(safehousesTable, eq(donationsTable.safehouseId, safehousesTable.safehouseId))
      .orderBy(desc(donationsTable.donationDate))
      .$dynamic();

    // Admin/staff: only see donations directed to their safehouses
    if (allowedSafehouses && allowedSafehouses.length > 0) {
      query = query.where(sql`${donationsTable.safehouseId} = ANY(ARRAY[${sql.raw(allowedSafehouses.join(","))}]::bigint[])`);
    }

    // fundType filter for super_admin
    if (fundType === "general") query = query.where(isNull(donationsTable.safehouseId));
    if (fundType === "directed") query = query.where(isNotNull(donationsTable.safehouseId));

    const rows = await query.limit(limitNum).offset((pageNum - 1) * limitNum);

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(donationsTable).$dynamic();
    if (allowedSafehouses && allowedSafehouses.length > 0) {
      countQuery = countQuery.where(sql`${donationsTable.safehouseId} = ANY(ARRAY[${sql.raw(allowedSafehouses.join(","))}]::bigint[])`);
    }
    if (fundType === "general") countQuery = countQuery.where(isNull(donationsTable.safehouseId));
    if (fundType === "directed") countQuery = countQuery.where(isNotNull(donationsTable.safehouseId));

    const [{ count }] = await countQuery;
    const total = Number(count);

    const data = rows.map(r => {
      const amount = parseFloat(r.amount || "0");
      const totalAllocated = parseFloat(r.totalAllocated || "0");
      const supporterName = r.supporterDisplayName || `${r.supporterFirstName ?? ""} ${r.supporterLastName ?? ""}`.trim() || null;
      return {
        ...r,
        amount,
        estimatedValue: r.estimatedValue ? parseFloat(r.estimatedValue) : null,
        totalAllocated: parseFloat(totalAllocated.toFixed(2)),
        unallocated: parseFloat(Math.max(0, amount - totalAllocated).toFixed(2)),
        supporterName,
        isGeneralFund: r.safehouseId === null,
      };
    });

    return res.json({ data, total, pagination: paginate(total, pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/donations", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(donationsTable).values(req.body).returning();
    return res.status(201).json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/donations/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await db.select().from(donationsTable).where(eq(donationsTable.donationId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    let supporterName = "";
    if (row.supporterId) {
      const [s] = await db.select({ displayName: supportersTable.displayName, firstName: supportersTable.firstName, lastName: supportersTable.lastName }).from(supportersTable).where(eq(supportersTable.supporterId, row.supporterId)).limit(1);
      if (s) supporterName = s.displayName || `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim();
    }
    return res.json(fmt(row, supporterName));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/donations/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(donationsTable).set(req.body).where(eq(donationsTable.donationId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/donations/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(donationsTable).where(eq(donationsTable.donationId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── Donor: give (authenticated donor portal) ──────────────────────────────────
router.post("/donations/give", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    if (!req.user!.supporterId) return res.status(400).json({ error: "No donor profile linked to this account" });
    const { amount, currencyCode = "PHP", channelSource = "online", notes, isRecurring = false, safehouseId } = req.body as {
      amount?: number; currencyCode?: string; channelSource?: string; notes?: string; isRecurring?: boolean; safehouseId?: number | null;
    };
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "A valid donation amount is required" });
    }
    const [row] = await db.insert(donationsTable).values({
      supporterId: req.user!.supporterId,
      donationType: "monetary",
      donationDate: new Date().toISOString().slice(0, 10),
      amount: String(Number(amount).toFixed(2)),
      currencyCode,
      channelSource,
      notes: notes ?? null,
      isRecurring: Boolean(isRecurring),
      safehouseId: safehouseId ?? null,
    }).returning();

    const destination = safehouseId
      ? `This donation will go directly to the safehouse you selected.`
      : `This donation goes to the General Fund and will be allocated by our team.`;

    return res.status(201).json({
      ...fmt(row),
      message: `Thank you! Your ${isRecurring ? "recurring " : ""}donation of ₱${Number(amount).toLocaleString()} has been recorded. ${destination}`,
    });
  } catch { return res.status(500).json({ error: "Failed to record donation" }); }
});

// ── Public donate (no auth, for landing page) ─────────────────────────────────
router.post("/donations/public", async (req, res) => {
  try {
    const { amount, name, email, notes, isRecurring = false, safehouseId, currencyCode = "PHP" } = req.body as {
      amount?: number; name?: string; email?: string; notes?: string;
      isRecurring?: boolean; safehouseId?: number | null; currencyCode?: string;
    };
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "A valid donation amount is required" });
    }
    const [row] = await db.insert(donationsTable).values({
      donationType: "monetary",
      donationDate: new Date().toISOString().slice(0, 10),
      amount: String(Number(amount).toFixed(2)),
      currencyCode,
      channelSource: "online",
      notes: [name ? `From: ${name}` : null, email ? `Email: ${email}` : null, notes ?? null].filter(Boolean).join(" | ") || null,
      isRecurring: Boolean(isRecurring),
      safehouseId: safehouseId ?? null,
    }).returning();
    return res.status(201).json({ donationId: row.donationId, message: "Thank you for your donation!" });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed to record donation" }); }
});

// ── Donation allocations ──────────────────────────────────────────────────────
router.get("/donation-allocations", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { donationId } = req.query as Record<string, string>;
    let rows = await db.select({
      allocationId: donationAllocationsTable.allocationId,
      donationId: donationAllocationsTable.donationId,
      safehouseId: donationAllocationsTable.safehouseId,
      programArea: donationAllocationsTable.programArea,
      amountAllocated: donationAllocationsTable.amountAllocated,
      allocationDate: donationAllocationsTable.allocationDate,
      allocationNotes: donationAllocationsTable.allocationNotes,
      safehouseName: safehousesTable.name,
    }).from(donationAllocationsTable)
      .leftJoin(safehousesTable, eq(donationAllocationsTable.safehouseId, safehousesTable.safehouseId));
    if (donationId) rows = rows.filter(r => r.donationId === parseInt(donationId));
    return res.json({ data: rows.map(r => ({ ...r, amountAllocated: r.amountAllocated ? parseFloat(r.amountAllocated) : null })), total: rows.length });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/donation-allocations", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { donationId, safehouseId, programArea, amountAllocated, allocationNotes } = req.body as {
      donationId?: number; safehouseId?: number; programArea?: string; amountAllocated?: number; allocationNotes?: string;
    };
    if (!donationId || !programArea || !amountAllocated || Number(amountAllocated) <= 0) {
      return res.status(400).json({ error: "donationId, programArea and amountAllocated (>0) are required" });
    }
    const [row] = await db.insert(donationAllocationsTable).values({
      donationId,
      safehouseId: safehouseId ?? null,
      programArea,
      amountAllocated: String(Number(amountAllocated).toFixed(2)),
      allocationDate: new Date().toISOString().slice(0, 10),
      allocationNotes: allocationNotes ?? null,
    }).returning();
    return res.status(201).json({ ...row, amountAllocated: row.amountAllocated ? parseFloat(row.amountAllocated) : null });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed to create allocation" }); }
});

router.delete("/donation-allocations/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(donationAllocationsTable).where(eq(donationAllocationsTable.allocationId, id));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed to delete allocation" }); }
});

export default router;
