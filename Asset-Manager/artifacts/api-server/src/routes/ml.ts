import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { mlPredictionSnapshotsTable, mlPipelineRunsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

type PredictionRow = typeof mlPredictionSnapshotsTable.$inferSelect;
type PipelineRow = typeof mlPipelineRunsTable.$inferSelect;

function fmtPrediction(r: PredictionRow) {
  return {
    ...r,
    predictionScore: r.predictionScore,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

function fmtPipeline(r: PipelineRow) {
  return {
    ...r,
    trainedAt: r.trainedAt?.toISOString?.() ?? r.trainedAt,
  };
}

router.get("/ml/predictions", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { pipelineName, entityId, entityType, page = "1", limit = "50", pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    let rows = await db.select().from(mlPredictionSnapshotsTable);
    if (pipelineName) rows = rows.filter(r => r.pipelineName === pipelineName);
    if (entityId) rows = rows.filter(r => r.entityId === parseInt(entityId));
    if (entityType) rows = rows.filter(r => r.entityType === entityType);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(fmtPrediction), total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/ml/pipelines", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const rows = await db.select().from(mlPipelineRunsTable);
    return res.json({ data: rows.map(fmtPipeline) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/ml/predictions/:entityType/:entityId", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const rows = await db.select().from(mlPredictionSnapshotsTable);
    const filtered = rows.filter(r => r.entityType === req.params.entityType && r.entityId === parseInt(req.params.entityId));
    return res.json({ data: filtered.map(fmtPrediction) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/ml/insights", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const predictions = await db.select().from(mlPredictionSnapshotsTable).limit(100);
    const pipelines = await db.select().from(mlPipelineRunsTable);
    const avgScore = predictions.length > 0
      ? predictions.reduce((s, p) => s + (p.predictionScore ?? 0), 0) / predictions.length
      : 0;
    return res.json({
      totalPredictions: predictions.length,
      activePipelines: pipelines.filter(p => p.status === "completed").length,
      avgConfidence: parseFloat(avgScore.toFixed(4)),
      recentPredictions: predictions.slice(0, 5).map(fmtPrediction),
      pipelines: pipelines.map(fmtPipeline),
    });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
