import { Router } from "express";
import { and, eq, sql, SQL } from "drizzle-orm";
import { db } from "../lib/db";
import {
  processRecordingsTable, homeVisitationsTable, caseConferencesTable,
  interventionPlansTable, incidentReportsTable, residentsTable, safehousesTable
} from "@workspace/db/schema";
import { requireAuth, requireRoles, getUserSafehouses } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

/** If the user has assigned safehouses, returns the Set of allowed resident IDs. Otherwise null (unrestricted). */
async function getAllowedResidentIds(user: import("../middleware/auth").AuthUser | undefined): Promise<Set<number> | null> {
  const safehouses = getUserSafehouses(user);
  if (!safehouses) return null;
  const residents = await db.select({ residentId: residentsTable.residentId, safehouseId: residentsTable.safehouseId }).from(residentsTable);
  return new Set(residents.filter(r => r.safehouseId !== null && safehouses.includes(r.safehouseId!)).map(r => r.residentId));
}

function buildWhere(conds: (SQL | undefined)[]): SQL | undefined {
  const valid = conds.filter(Boolean) as SQL[];
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  return and(...valid);
}

// ─── PROCESS RECORDINGS ────────────────────────────────────────────────────
router.get("/process-recordings", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", residentId, safehouseId, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedResidents = await getAllowedResidentIds(req.user);
    let rows = await db.select({
      recordingId: processRecordingsTable.recordingId,
      residentId: processRecordingsTable.residentId,
      sessionDate: processRecordingsTable.sessionDate,
      socialWorker: processRecordingsTable.socialWorker,
      sessionType: processRecordingsTable.sessionType,
      sessionNarrative: processRecordingsTable.sessionNarrative,
      concernsFlagged: processRecordingsTable.concernsFlagged,
      progressNoted: processRecordingsTable.progressNoted,
      referralMade: processRecordingsTable.referralMade,
      residentCode: sql<string>`coalesce(${residentsTable.internalCode}, ${residentsTable.caseControlNo}, '')`,
    }).from(processRecordingsTable)
      .leftJoin(residentsTable, eq(processRecordingsTable.residentId, residentsTable.residentId));
    if (allowedResidents) rows = rows.filter(r => r.residentId !== null && allowedResidents.has(r.residentId!));
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    if (safehouseId) {
      const shResidents = await db.select({ residentId: residentsTable.residentId }).from(residentsTable).where(eq(residentsTable.safehouseId, parseInt(safehouseId)));
      const ids = new Set(shResidents.map(r => r.residentId));
      rows = rows.filter(r => r.residentId !== null && ids.has(r.residentId));
    }
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum), total, pagination: paginate(total, pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/process-recordings", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(processRecordingsTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.get("/process-recordings/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(processRecordingsTable).where(eq(processRecordingsTable.recordingId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.patch("/process-recordings/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(processRecordingsTable).set(req.body).where(eq(processRecordingsTable.recordingId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.delete("/process-recordings/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(processRecordingsTable).where(eq(processRecordingsTable.recordingId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

// ─── HOME VISITATIONS ──────────────────────────────────────────────────────
router.get("/home-visitations", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", residentId, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedResidents = await getAllowedResidentIds(req.user);
    let rows = await db.select({
      visitationId: homeVisitationsTable.visitationId,
      residentId: homeVisitationsTable.residentId,
      visitDate: homeVisitationsTable.visitDate,
      socialWorker: homeVisitationsTable.socialWorker,
      visitType: homeVisitationsTable.visitType,
      locationVisited: homeVisitationsTable.locationVisited,
      familyMembersPresent: homeVisitationsTable.familyMembersPresent,
      purpose: homeVisitationsTable.purpose,
      observations: homeVisitationsTable.observations,
      familyCooperationLevel: homeVisitationsTable.familyCooperationLevel,
      safetyConcernsNoted: homeVisitationsTable.safetyConcernsNoted,
      followUpNeeded: homeVisitationsTable.followUpNeeded,
      followUpNotes: homeVisitationsTable.followUpNotes,
      visitOutcome: homeVisitationsTable.visitOutcome,
      residentCode: sql<string>`coalesce(${residentsTable.internalCode}, ${residentsTable.caseControlNo}, '')`,
    }).from(homeVisitationsTable)
      .leftJoin(residentsTable, eq(homeVisitationsTable.residentId, residentsTable.residentId));
    if (allowedResidents) rows = rows.filter(r => r.residentId !== null && allowedResidents.has(r.residentId!));
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum), total, pagination: paginate(total, pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/home-visitations", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(homeVisitationsTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.get("/home-visitations/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(homeVisitationsTable).where(eq(homeVisitationsTable.visitationId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.patch("/home-visitations/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(homeVisitationsTable).set(req.body).where(eq(homeVisitationsTable.visitationId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.delete("/home-visitations/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(homeVisitationsTable).where(eq(homeVisitationsTable.visitationId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

// ─── CASE CONFERENCES ──────────────────────────────────────────────────────
router.get("/case-conferences", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", residentId, status, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedResidents = await getAllowedResidentIds(req.user);
    let rows = await db.select({
      conferenceId: caseConferencesTable.conferenceId,
      residentId: caseConferencesTable.residentId,
      conferenceDate: caseConferencesTable.conferenceDate,
      conferenceType: caseConferencesTable.conferenceType,
      summary: caseConferencesTable.summary,
      decisionsMade: caseConferencesTable.decisionsMade,
      nextSteps: caseConferencesTable.nextSteps,
      nextConferenceDate: caseConferencesTable.nextConferenceDate,
      createdBy: caseConferencesTable.createdBy,
      residentCode: sql<string>`coalesce(${residentsTable.internalCode}, ${residentsTable.caseControlNo}, '')`,
    }).from(caseConferencesTable)
      .leftJoin(residentsTable, eq(caseConferencesTable.residentId, residentsTable.residentId));
    if (allowedResidents) rows = rows.filter(r => r.residentId !== null && allowedResidents.has(r.residentId!));
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    if (status) rows = rows.filter(r => r.conferenceType === status);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum), total, pagination: paginate(total, pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/case-conferences", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(caseConferencesTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.get("/case-conferences/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(caseConferencesTable).where(eq(caseConferencesTable.conferenceId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.patch("/case-conferences/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(caseConferencesTable).set(req.body).where(eq(caseConferencesTable.conferenceId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.delete("/case-conferences/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(caseConferencesTable).where(eq(caseConferencesTable.conferenceId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

// ─── INTERVENTION PLANS ────────────────────────────────────────────────────
router.get("/intervention-plans", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", residentId, status, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedResidents = await getAllowedResidentIds(req.user);
    let rows = await db.select({
      planId: interventionPlansTable.planId,
      residentId: interventionPlansTable.residentId,
      planCategory: interventionPlansTable.planCategory,
      planDescription: interventionPlansTable.planDescription,
      servicesProvided: interventionPlansTable.servicesProvided,
      targetValue: interventionPlansTable.targetValue,
      targetDate: interventionPlansTable.targetDate,
      status: interventionPlansTable.status,
      caseConferenceDate: interventionPlansTable.caseConferenceDate,
      createdAt: interventionPlansTable.createdAt,
      updatedAt: interventionPlansTable.updatedAt,
      residentCode: sql<string>`coalesce(${residentsTable.internalCode}, ${residentsTable.caseControlNo}, '')`,
    }).from(interventionPlansTable)
      .leftJoin(residentsTable, eq(interventionPlansTable.residentId, residentsTable.residentId));
    if (allowedResidents) rows = rows.filter(r => r.residentId !== null && allowedResidents.has(r.residentId!));
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    if (status) rows = rows.filter(r => r.status === status);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(r => ({ ...r, targetValue: r.targetValue ? parseFloat(r.targetValue) : null })), total, pagination: paginate(total, pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/intervention-plans", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(interventionPlansTable).values(req.body).returning();
    return res.status(201).json({ ...row, targetValue: row.targetValue ? parseFloat(row.targetValue) : null });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.get("/intervention-plans/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(interventionPlansTable).where(eq(interventionPlansTable.planId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ...row, targetValue: row.targetValue ? parseFloat(row.targetValue) : null });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.patch("/intervention-plans/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(interventionPlansTable).set(req.body).where(eq(interventionPlansTable.planId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json({ ...row, targetValue: row.targetValue ? parseFloat(row.targetValue) : null });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.delete("/intervention-plans/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(interventionPlansTable).where(eq(interventionPlansTable.planId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

// ─── INCIDENT REPORTS ──────────────────────────────────────────────────────
router.get("/incident-reports", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", residentId, safehouseId, severity, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedSafehouses = getUserSafehouses(req.user);
    let rows = await db.select({
      incidentId: incidentReportsTable.incidentId,
      residentId: incidentReportsTable.residentId,
      safehouseId: incidentReportsTable.safehouseId,
      incidentDate: incidentReportsTable.incidentDate,
      incidentType: incidentReportsTable.incidentType,
      severity: incidentReportsTable.severity,
      description: incidentReportsTable.description,
      responseTaken: incidentReportsTable.responseTaken,
      resolved: incidentReportsTable.resolved,
      resolutionDate: incidentReportsTable.resolutionDate,
      reportedBy: incidentReportsTable.reportedBy,
      followUpRequired: incidentReportsTable.followUpRequired,
      status: incidentReportsTable.status,
      residentCode: sql<string>`coalesce(${residentsTable.internalCode}, ${residentsTable.caseControlNo}, '')`,
      safehouseName: sql<string | null>`"safehouses"."name"`,
    }).from(incidentReportsTable)
      .leftJoin(residentsTable, eq(incidentReportsTable.residentId, residentsTable.residentId))
      .leftJoin(safehousesTable, eq(incidentReportsTable.safehouseId, safehousesTable.safehouseId));
    if (allowedSafehouses) rows = rows.filter(r =>
      (r.safehouseId !== null && allowedSafehouses.includes(r.safehouseId!)) ||
      (r.safehouseId === null && r.residentId !== null)
    );
    if (residentId) rows = rows.filter(r => r.residentId === parseInt(residentId));
    if (safehouseId) rows = rows.filter(r => r.safehouseId === parseInt(safehouseId));
    if (severity) rows = rows.filter(r => r.severity === severity);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum), total, pagination: paginate(total, pageNum, limitNum) });
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.post("/incident-reports", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(incidentReportsTable).values(req.body).returning();
    return res.status(201).json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.get("/incident-reports/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.incidentId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.patch("/incident-reports/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(incidentReportsTable).set(req.body).where(eq(incidentReportsTable.incidentId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

router.delete("/incident-reports/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(incidentReportsTable).where(eq(incidentReportsTable.incidentId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch (e) { console.error(e); return res.status(500).json({ error: "Failed" }); }
});

export default router;
