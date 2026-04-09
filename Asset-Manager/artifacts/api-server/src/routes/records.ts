import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { educationRecordsTable, healthWellbeingRecordsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

// ─── EDUCATION RECORDS ────────────────────────────────────────────────────
router.get("/education-records", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { residentId, page = "1", limit = "20", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    let rows = await db.select().from(educationRecordsTable);
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    const total = rows.length;
    return res.json({
      data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(r => ({
        ...r,
        attendanceRate: r.attendanceRate ? parseFloat(r.attendanceRate) : null,
        progressPercent: r.progressPercent ? parseFloat(r.progressPercent) : null,
      })),
      total,
      pagination: paginate(total, pageNum, limitNum)
    });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/education-records", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(educationRecordsTable).values(req.body).returning();
    return res.status(201).json({ ...row, attendanceRate: row.attendanceRate ? parseFloat(row.attendanceRate) : null, progressPercent: row.progressPercent ? parseFloat(row.progressPercent) : null });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/education-records/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(educationRecordsTable).set(req.body).where(eq(educationRecordsTable.educationRecordId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ...row, attendanceRate: row.attendanceRate ? parseFloat(row.attendanceRate) : null, progressPercent: row.progressPercent ? parseFloat(row.progressPercent) : null });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/education-records/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(educationRecordsTable).where(eq(educationRecordsTable.educationRecordId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ─── HEALTH / WELLBEING RECORDS ───────────────────────────────────────────
router.get("/health-records", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { residentId, page = "1", limit = "20", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    let rows = await db.select().from(healthWellbeingRecordsTable);
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    const total = rows.length;
    return res.json({
      data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(r => ({
        ...r,
        generalHealthScore: r.generalHealthScore ? parseFloat(r.generalHealthScore) : null,
        nutritionScore: r.nutritionScore ? parseFloat(r.nutritionScore) : null,
        sleepQualityScore: r.sleepQualityScore ? parseFloat(r.sleepQualityScore) : null,
        energyLevelScore: r.energyLevelScore ? parseFloat(r.energyLevelScore) : null,
        heightCm: r.heightCm ? parseFloat(r.heightCm) : null,
        weightKg: r.weightKg ? parseFloat(r.weightKg) : null,
        bmi: r.bmi ? parseFloat(r.bmi) : null,
      })),
      total,
      pagination: paginate(total, pageNum, limitNum)
    });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/health-records", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(healthWellbeingRecordsTable).values(req.body).returning();
    return res.status(201).json({ ...row, generalHealthScore: row.generalHealthScore ? parseFloat(row.generalHealthScore) : null });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/health-records/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(healthWellbeingRecordsTable).set(req.body).where(eq(healthWellbeingRecordsTable.healthRecordId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ...row, generalHealthScore: row.generalHealthScore ? parseFloat(row.generalHealthScore) : null });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/health-records/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(healthWellbeingRecordsTable).where(eq(healthWellbeingRecordsTable.healthRecordId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
