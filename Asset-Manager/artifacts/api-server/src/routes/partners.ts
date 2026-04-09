import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { partnersTable, partnerAssignmentsTable, safehousesTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

// ── PARTNERS ─────────────────────────────────────────────────────────────────
router.get("/partners", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const rows = await db.select().from(partnersTable).limit(limitNum).offset((pageNum - 1) * limitNum);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(partnersTable);
    return res.json({ data: rows, total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/partners", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(partnersTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/partners/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(partnersTable).where(eq(partnersTable.partnerId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/partners/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(partnersTable).set(req.body).where(eq(partnersTable.partnerId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/partners/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(partnersTable).where(eq(partnersTable.partnerId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── PARTNER ASSIGNMENTS ───────────────────────────────────────────────────────
router.get("/partner-assignments", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { safehouseId, partnerId } = req.query as Record<string, string>;
    let rows = await db.select({
      assignmentId:        partnerAssignmentsTable.assignmentId,
      partnerId:           partnerAssignmentsTable.partnerId,
      safehouseId:         partnerAssignmentsTable.safehouseId,
      programArea:         partnerAssignmentsTable.programArea,
      assignmentStart:     partnerAssignmentsTable.assignmentStart,
      assignmentEnd:       partnerAssignmentsTable.assignmentEnd,
      responsibilityNotes: partnerAssignmentsTable.responsibilityNotes,
      isPrimary:           partnerAssignmentsTable.isPrimary,
      status:              partnerAssignmentsTable.status,
      safehouseName:       safehousesTable.safehouseName,
    }).from(partnerAssignmentsTable)
      .leftJoin(safehousesTable, eq(partnerAssignmentsTable.safehouseId, safehousesTable.safehouseId));
    if (safehouseId) rows = rows.filter(r => r.safehouseId === parseInt(safehouseId));
    if (partnerId) rows = rows.filter(r => r.partnerId === parseInt(partnerId));
    return res.json({ data: rows, total: rows.length });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/partner-assignments", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(partnerAssignmentsTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/partner-assignments/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(partnerAssignmentsTable).set(req.body).where(eq(partnerAssignmentsTable.assignmentId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/partner-assignments/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(partnerAssignmentsTable).where(eq(partnerAssignmentsTable.assignmentId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
