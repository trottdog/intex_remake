import { Router } from "express";
import { eq, and, notInArray, sql, desc } from "drizzle-orm";
import { db } from "../lib/db";
import { programUpdatesTable, donorViewedItemsTable, campaignsTable, supportersTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";

const router = Router();

function fmt(r: typeof programUpdatesTable.$inferSelect) {
  return {
    ...r,
    publishedAt: r.publishedAt?.toISOString?.() ?? r.publishedAt,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt,
  };
}

// List — donors see only published; staff/admin/super_admin see all
router.get("/program-updates", requireAuth, async (req, res) => {
  try {
    const role = (req as { user?: { role?: string } }).user?.role;
    let rows;
    if (role === "donor") {
      rows = await db.select().from(programUpdatesTable)
        .where(eq(programUpdatesTable.isPublished, true))
        .orderBy(desc(programUpdatesTable.publishedAt));
    } else {
      rows = await db.select().from(programUpdatesTable)
        .orderBy(desc(programUpdatesTable.createdAt));
    }
    return res.json({ data: rows.map(fmt), total: rows.length });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

// Create
router.post("/program-updates", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { title, summary, category, isPublished } = req.body as {
      title?: string; summary?: string; category?: string; isPublished?: boolean;
    };
    if (!title?.trim()) return res.status(400).json({ error: "title is required" });
    const userId = (req as { user?: { id?: number } }).user?.id;
    const now = new Date();
    const [row] = await db.insert(programUpdatesTable).values({
      title: title.trim(),
      summary: summary ?? null,
      category: category ?? null,
      isPublished: !!isPublished,
      publishedAt: isPublished ? now : null,
      createdBy: userId ?? null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return res.status(201).json(fmt(row));
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed to create update" }); }
});

// Update
router.patch("/program-updates/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(programUpdatesTable).where(eq(programUpdatesTable.updateId, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "Not found" });

    const { title, summary, category, isPublished } = req.body as {
      title?: string; summary?: string; category?: string; isPublished?: boolean;
    };
    const wasPublished = existing[0].isPublished;
    const nowPublishing = isPublished && !wasPublished;
    const now = new Date();

    const [row] = await db.update(programUpdatesTable).set({
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(summary !== undefined ? { summary } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(isPublished !== undefined ? { isPublished } : {}),
      publishedAt: nowPublishing ? now : existing[0].publishedAt,
      updatedAt: now,
    }).where(eq(programUpdatesTable.updateId, id)).returning();
    return res.json(fmt(row));
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed to update" }); }
});

// Delete
router.delete("/program-updates/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(donorViewedItemsTable).where(
      and(eq(donorViewedItemsTable.itemType, "update"), eq(donorViewedItemsTable.itemId, id))
    );
    await db.delete(programUpdatesTable).where(eq(programUpdatesTable.updateId, id));
    return res.status(204).send();
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed to delete" }); }
});

// ── Donor notifications ────────────────────────────────────────────────────────

// GET /api/donor/notifications — unread counts + latest items
router.get("/donor/notifications", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    const supporterId = (req as { user?: { supporterId?: number } }).user?.supporterId;
    if (!supporterId) return res.status(404).json({ error: "Donor profile not found" });

    // Viewed update IDs
    const viewedUpdates = await db.select({ itemId: donorViewedItemsTable.itemId })
      .from(donorViewedItemsTable)
      .where(and(eq(donorViewedItemsTable.supporterId, supporterId), eq(donorViewedItemsTable.itemType, "update")));
    const viewedUpdateIds = viewedUpdates.map(v => v.itemId as number);

    // Viewed campaign IDs
    const viewedCampaigns = await db.select({ itemId: donorViewedItemsTable.itemId })
      .from(donorViewedItemsTable)
      .where(and(eq(donorViewedItemsTable.supporterId, supporterId), eq(donorViewedItemsTable.itemType, "campaign")));
    const viewedCampaignIds = viewedCampaigns.map(v => v.itemId as number);

    // Unread published updates
    const allUpdates = await db.select().from(programUpdatesTable)
      .where(eq(programUpdatesTable.isPublished, true))
      .orderBy(desc(programUpdatesTable.publishedAt));
    const unreadUpdates = allUpdates.filter(u => !viewedUpdateIds.includes(u.updateId));

    // Unread active campaigns
    const allCampaigns = await db.select().from(campaignsTable)
      .where(eq(campaignsTable.status, "active"))
      .orderBy(desc(campaignsTable.createdAt));
    const unreadCampaigns = allCampaigns.filter(c => !viewedCampaignIds.includes(c.campaignId));

    // Notification feed: blend updates + campaigns, sorted by date
    const items = [
      ...unreadUpdates.map(u => ({
        id: u.updateId,
        type: "update" as const,
        title: u.title,
        summary: u.summary,
        category: u.category,
        date: u.publishedAt?.toISOString() ?? u.createdAt?.toISOString() ?? null,
      })),
      ...unreadCampaigns.map(c => ({
        id: c.campaignId,
        type: "campaign" as const,
        title: c.title,
        summary: c.description,
        category: c.category,
        date: c.createdAt?.toISOString() ?? null,
      })),
    ].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).slice(0, 20);

    return res.json({
      unreadUpdatesCount: unreadUpdates.length,
      unreadCampaignsCount: unreadCampaigns.length,
      totalUnread: unreadUpdates.length + unreadCampaigns.length,
      items,
    });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

// POST /api/donor/viewed-items — mark items as viewed
router.post("/donor/viewed-items", requireAuth, requireRoles("donor"), async (req, res) => {
  try {
    const supporterId = (req as { user?: { supporterId?: number } }).user?.supporterId;
    if (!supporterId) return res.status(404).json({ error: "Donor profile not found" });
    const { itemType, itemIds } = req.body as { itemType: string; itemIds: number[] };
    if (!itemType || !itemIds?.length) return res.status(400).json({ error: "itemType and itemIds required" });

    // Check already viewed
    const existing = await db.select({ itemId: donorViewedItemsTable.itemId })
      .from(donorViewedItemsTable)
      .where(and(eq(donorViewedItemsTable.supporterId, supporterId), eq(donorViewedItemsTable.itemType, itemType)));
    const existingIds = new Set(existing.map(e => e.itemId as number));
    const newIds = itemIds.filter(id => !existingIds.has(id));

    if (newIds.length > 0) {
      await db.insert(donorViewedItemsTable).values(
        newIds.map(id => ({ supporterId, itemType, itemId: id, viewedAt: new Date() }))
      );
    }
    return res.json({ marked: newIds.length });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

export default router;
