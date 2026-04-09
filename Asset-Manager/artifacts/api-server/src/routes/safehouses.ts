import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { safehousesTable, safehouseMonthlyMetricsTable, residentsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

// Public: list safehouse names only (for donate page)
router.get("/public/safehouses", async (_req, res) => {
  try {
    const rows = await db.select({
      safehouseId: safehousesTable.safehouseId,
      safehouseName: safehousesTable.name,
    }).from(safehousesTable).orderBy(safehousesTable.name);
    return res.json({ data: rows });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/safehouses", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "50", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const rows = await db.select().from(safehousesTable).limit(limitNum).offset((pageNum - 1) * limitNum);
    const all = await db.select({ safehouseId: safehousesTable.safehouseId }).from(safehousesTable);
    return res.json({ data: rows, total: all.length, pagination: paginate(all.length, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed to list safehouses" }); }
});

router.post("/safehouses", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(safehousesTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch { return res.status(500).json({ error: "Failed to create safehouse" }); }
});

router.get("/safehouses/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(safehousesTable).where(eq(safehousesTable.safehouseId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch { return res.status(500).json({ error: "Failed to get safehouse" }); }
});

router.patch("/safehouses/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(safehousesTable).set(req.body).where(eq(safehousesTable.safehouseId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch { return res.status(500).json({ error: "Failed to update safehouse" }); }
});

router.delete("/safehouses/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(safehousesTable).where(eq(safehousesTable.safehouseId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed to delete safehouse" }); }
});

router.get("/safehouses/:id/metrics", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const months = parseInt((req.query.months as string) || "12");
    const rows = await db
      .select()
      .from(safehouseMonthlyMetricsTable)
      .where(eq(safehouseMonthlyMetricsTable.safehouseId, parseInt(req.params.id as string)))
      .limit(months);
    return res.json({
      data: rows.map(r => ({
        ...r,
        avgHealthScore: r.avgHealthScore ? parseFloat(r.avgHealthScore) : null,
        avgEducationProgress: r.avgEducationProgress ? parseFloat(r.avgEducationProgress) : null,
      })),
      total: rows.length
    });
  } catch { return res.status(500).json({ error: "Failed to get safehouse metrics" }); }
});

export default router;
