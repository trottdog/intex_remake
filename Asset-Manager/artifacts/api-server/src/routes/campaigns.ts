import { Router } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../lib/db";
import { campaignsTable, donationsTable, supportersTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

// ── LIST CAMPAIGNS ──────────────────────────────────────────────────────────
// Donors see active only; admins see all
router.get("/campaigns", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    const showAll = role === "super_admin" || role === "admin" || role === "staff";

    const rows = showAll
      ? await db.select().from(campaignsTable).orderBy(sql`${campaignsTable.createdAt} DESC`)
      : await db.select().from(campaignsTable)
          .where(eq(campaignsTable.status, "active"))
          .orderBy(sql`${campaignsTable.deadline} ASC`);

    // Compute totalRaised per campaign from donations
    const raised = await db
      .select({
        campaignId: donationsTable.campaignId,
        totalRaised: sql<number>`coalesce(sum(${donationsTable.amount}::numeric), 0)`,
        donorCount:  sql<number>`count(distinct ${donationsTable.supporterId})`,
      })
      .from(donationsTable)
      .where(sql`${donationsTable.campaignId} IS NOT NULL`)
      .groupBy(donationsTable.campaignId);

    const raisedMap = Object.fromEntries(
      raised.map(r => [r.campaignId, { totalRaised: parseFloat(String(r.totalRaised)), donorCount: Number(r.donorCount) }])
    );

    const data = rows.map(c => ({
      ...c,
      goal: c.goal ? parseFloat(c.goal) : null,
      totalRaised: raisedMap[c.campaignId]?.totalRaised ?? 0,
      donorCount:  raisedMap[c.campaignId]?.donorCount ?? 0,
    }));

    return res.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to list campaigns" });
  }
});

// ── GET SINGLE CAMPAIGN ─────────────────────────────────────────────────────
router.get("/campaigns/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(campaignsTable).where(eq(campaignsTable.campaignId, id)).limit(1);
    if (!row) return res.status(404).json({ error: "Campaign not found" });

    const [raisedRow] = await db
      .select({
        totalRaised: sql<number>`coalesce(sum(${donationsTable.amount}::numeric), 0)`,
        donorCount:  sql<number>`count(distinct ${donationsTable.supporterId})`,
      })
      .from(donationsTable)
      .where(eq(donationsTable.campaignId, id));

    return res.json({
      ...row,
      goal: row.goal ? parseFloat(row.goal) : null,
      totalRaised: parseFloat(String(raisedRow?.totalRaised ?? 0)),
      donorCount:  Number(raisedRow?.donorCount ?? 0),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to get campaign" });
  }
});

// ── CREATE CAMPAIGN (super_admin) ───────────────────────────────────────────
router.post("/campaigns", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const { title, description, category, goal, deadline, status } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const [row] = await db.insert(campaignsTable).values({
      title,
      description: description ?? null,
      category: category ?? null,
      goal: goal ? String(goal) : null,
      deadline: deadline ?? null,
      status: status ?? "draft",
      createdBy: req.user!.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return res.status(201).json({ ...row, goal: row.goal ? parseFloat(row.goal) : null, totalRaised: 0, donorCount: 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create campaign" });
  }
});

// ── UPDATE CAMPAIGN (super_admin) ───────────────────────────────────────────
router.patch("/campaigns/:id", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, category, goal, deadline, status } = req.body;

    const [row] = await db.update(campaignsTable)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(goal !== undefined && { goal: goal ? String(goal) : null }),
        ...(deadline !== undefined && { deadline }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      })
      .where(eq(campaignsTable.campaignId, id))
      .returning();

    if (!row) return res.status(404).json({ error: "Campaign not found" });
    return res.json({ ...row, goal: row.goal ? parseFloat(row.goal) : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update campaign" });
  }
});

// ── DELETE CAMPAIGN (super_admin) ───────────────────────────────────────────
router.delete("/campaigns/:id", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(campaignsTable).where(eq(campaignsTable.campaignId, id));
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// ── DONOR DONATE TO CAMPAIGN ────────────────────────────────────────────────
router.post("/campaigns/:id/donate", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { amount, currencyCode = "PHP", channelSource = "online", notes } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "A valid positive amount is required" });
    }
    if (!req.user!.supporterId) {
      return res.status(400).json({ error: "No donor profile linked to this account" });
    }

    // Verify campaign exists and is active
    const [campaign] = await db.select().from(campaignsTable)
      .where(and(eq(campaignsTable.campaignId, campaignId), eq(campaignsTable.status, "active")))
      .limit(1);
    if (!campaign) return res.status(404).json({ error: "Campaign not found or not accepting donations" });

    const today = new Date().toISOString().split("T")[0];
    const [donation] = await db.insert(donationsTable).values({
      supporterId:  req.user!.supporterId,
      campaignId,
      campaignName: campaign.title,
      donationType: "monetary",
      donationDate: today,
      isRecurring:  false,
      channelSource,
      currencyCode,
      amount:       String(parseFloat(amount)),
      notes:        notes ?? null,
    }).returning();

    return res.status(201).json({
      ...donation,
      amount: donation.amount ? parseFloat(donation.amount) : null,
      campaignTitle: campaign.title,
      message: `Thank you! Your donation of ₱${parseFloat(amount).toLocaleString()} to "${campaign.title}" has been recorded.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process donation" });
  }
});

export default router;
