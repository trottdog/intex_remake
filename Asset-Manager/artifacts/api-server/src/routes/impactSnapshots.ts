import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { publicImpactSnapshotsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

type SnapshotRow = typeof publicImpactSnapshotsTable.$inferSelect;

function fmt(r: SnapshotRow) {
  return {
    ...r,
    publishedAt: r.publishedAt?.toISOString?.() ?? r.publishedAt ?? null,
  };
}

router.get("/admin/impact-snapshots", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const rows = await db.select().from(publicImpactSnapshotsTable);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(fmt), total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/impact-snapshots", async (_req, res) => {
  try {
    const rows = await db.select().from(publicImpactSnapshotsTable);
    const published = rows.filter(r => r.isPublished);
    return res.json({ data: published.map(fmt), total: published.length });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/impact-snapshots", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(publicImpactSnapshotsTable).values({ ...req.body, isPublished: false }).returning();
    return res.status(201).json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/impact-snapshots/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(publicImpactSnapshotsTable).where(eq(publicImpactSnapshotsTable.snapshotId, parseInt(req.params.id as string))).limit(1);
    if (!row || !row.isPublished) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/admin/impact-snapshots/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(publicImpactSnapshotsTable).where(eq(publicImpactSnapshotsTable.snapshotId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/impact-snapshots/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(publicImpactSnapshotsTable).set(req.body).where(eq(publicImpactSnapshotsTable.snapshotId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/impact-snapshots/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(publicImpactSnapshotsTable).where(eq(publicImpactSnapshotsTable.snapshotId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/impact-snapshots/:id/publish", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(publicImpactSnapshotsTable)
      .set({ isPublished: true, publishedAt: new Date() })
      .where(eq(publicImpactSnapshotsTable.snapshotId, parseInt(req.params.id as string)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/impact-snapshots/:id/unpublish", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(publicImpactSnapshotsTable)
      .set({ isPublished: false })
      .where(eq(publicImpactSnapshotsTable.snapshotId, parseInt(req.params.id as string)))
      .returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
