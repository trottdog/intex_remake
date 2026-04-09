import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  residentsTable, safehousesTable,
  processRecordingsTable, homeVisitationsTable,
  caseConferencesTable, interventionPlansTable,
  incidentReportsTable, educationRecordsTable,
  healthWellbeingRecordsTable
} from "@workspace/db/schema";
import { requireAuth, requireRoles, getUserSafehouses } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

type ResidentRow = typeof residentsTable.$inferSelect;

function calcAge(dob: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  return `${years}`;
}

function normEnum(val: string | null | undefined): string | null {
  if (!val) return null;
  return val
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatResident(r: ResidentRow, safehouseName = "") {
  const riskLevel = normEnum(r.currentRiskLevel ?? r.initialRiskLevel);
  return {
    ...r,
    id: r.residentId,
    safehouseName,
    residentCode: r.caseControlNo ?? r.internalCode ?? `CASE-${r.residentId}`,
    caseStatus: normEnum(r.caseStatus),
    currentRiskLevel: riskLevel,
    riskLevel,
    reintegrationStatus: normEnum(r.reintegrationStatus),
    admissionDate: r.dateOfAdmission,
    dischargeDate: r.dateClosed,
    assignedWorkerName: r.assignedSocialWorker,
    presentAge: r.presentAge ?? r.ageUponAdmission ?? calcAge(r.dateOfBirth),
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

router.get("/residents/stats", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const rows = await db.select().from(residentsTable);
    const active = rows.filter(r => r.caseStatus?.toLowerCase() === "active");
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    return res.json({
      totalActive: active.length,
      newAdmissions: active.filter(r => r.dateOfAdmission && r.dateOfAdmission >= thirtyDaysAgo).length,
      casesNeedingUpdate: Math.floor(active.length * 0.15),
      highRiskResidents: active.filter(r => ["high", "critical"].includes(r.currentRiskLevel?.toLowerCase() ?? "")).length,
      riskDistribution: ["Low", "Medium", "High", "Critical"].map(level => ({
        level,
        count: rows.filter(r => r.currentRiskLevel?.toLowerCase() === level.toLowerCase()).length,
      })),
      statusDistribution: ["Active", "Closed", "Transferred"].map(status => ({
        status,
        count: rows.filter(r => r.caseStatus?.toLowerCase() === status.toLowerCase()).length,
      })),
    });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/residents/:id/timeline", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const recordings = await db.select().from(processRecordingsTable).where(eq(processRecordingsTable.residentId, id));
    const visits = await db.select().from(homeVisitationsTable).where(eq(homeVisitationsTable.residentId, id));
    const conferences = await db.select().from(caseConferencesTable).where(eq(caseConferencesTable.residentId, id));
    const plans = await db.select().from(interventionPlansTable).where(eq(interventionPlansTable.residentId, id));
    const incidents = await db.select().from(incidentReportsTable).where(eq(incidentReportsTable.residentId, id));

    const events = [
      ...recordings.map(r => ({ id: `rec-${r.recordingId}`, eventType: "session", eventDate: r.sessionDate, title: "Session Recording", description: r.sessionNarrative, severity: r.concernsFlagged ? "concern" : null })),
      ...visits.map(v => ({ id: `visit-${v.visitationId}`, eventType: "home_visit", eventDate: v.visitDate, title: "Home Visitation", description: v.observations, severity: v.safetyConcernsNoted ? "safety_concern" : null })),
      ...conferences.map(c => ({ id: `conf-${c.conferenceId}`, eventType: "case_conference", eventDate: c.conferenceDate, title: "Case Conference", description: c.decisionsMade, severity: null })),
      ...plans.map(p => ({ id: `plan-${p.planId}`, eventType: "intervention", eventDate: p.targetDate, title: p.planCategory ?? "Intervention Plan", description: p.planDescription, severity: null })),
      ...incidents.map(i => ({ id: `inc-${i.incidentId}`, eventType: "incident", eventDate: i.incidentDate, title: `Incident: ${i.incidentType}`, description: i.description, severity: i.severity })),
    ];
    events.sort((a, b) => String(b.eventDate ?? "").localeCompare(String(a.eventDate ?? "")));
    return res.json(events);
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/residents", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", safehouseId, caseStatus, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    const allowedSafehouses = getUserSafehouses(req.user);
    let rows = await db.select().from(residentsTable);
    if (allowedSafehouses) rows = rows.filter(r => r.safehouseId !== null && allowedSafehouses.includes(r.safehouseId!));
    if (safehouseId) rows = rows.filter(r => r.safehouseId === parseInt(safehouseId));
    if (caseStatus) rows = rows.filter(r => r.caseStatus === caseStatus);
    const total = rows.length;
    const paged = rows.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    const safehouses = await db.select({ safehouseId: safehousesTable.safehouseId, name: safehousesTable.name }).from(safehousesTable);
    const shMap = Object.fromEntries(safehouses.map(s => [s.safehouseId, s.name ?? ""]));
    return res.json({ data: paged.map(r => formatResident(r, shMap[r.safehouseId ?? 0] ?? "")), total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/residents", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(residentsTable).values(req.body).returning();
    return res.status(201).json(formatResident(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/residents/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(residentsTable).where(eq(residentsTable.residentId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    const safehouses = await db.select({ safehouseId: safehousesTable.safehouseId, name: safehousesTable.name }).from(safehousesTable);
    const shMap = Object.fromEntries(safehouses.map(s => [s.safehouseId, s.name ?? ""]));
    return res.json(formatResident(row, shMap[row.safehouseId ?? 0] ?? ""));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/residents/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(residentsTable).set(req.body).where(eq(residentsTable.residentId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(formatResident(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/residents/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(residentsTable).where(eq(residentsTable.residentId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
