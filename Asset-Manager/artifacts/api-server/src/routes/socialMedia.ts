import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { socialMediaPostsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

type PostRow = typeof socialMediaPostsTable.$inferSelect;

function fmt(r: PostRow) {
  return {
    ...r,
    boostBudgetPhp: r.boostBudgetPhp ? parseFloat(r.boostBudgetPhp) : null,
    videoViews: r.videoViews ? parseFloat(r.videoViews) : null,
    engagementRate: r.engagementRate ? parseFloat(r.engagementRate) : null,
    estimatedDonationValuePhp: r.estimatedDonationValuePhp ? parseFloat(r.estimatedDonationValuePhp) : null,
    watchTimeSeconds: r.watchTimeSeconds ? parseFloat(r.watchTimeSeconds) : null,
    avgViewDurationSeconds: r.avgViewDurationSeconds ? parseFloat(r.avgViewDurationSeconds) : null,
    subscriberCountAtPost: r.subscriberCountAtPost ? parseFloat(r.subscriberCountAtPost) : null,
    forwards: r.forwards ? parseFloat(r.forwards) : null,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

router.get("/social-media-posts", requireAuth, requireRoles("donor", "staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", platform, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    let rows = await db.select().from(socialMediaPostsTable);
    if (platform) rows = rows.filter(r => r.platform === platform);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(fmt), total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/social-media-posts", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.insert(socialMediaPostsTable).values(req.body).returning();
    return res.status(201).json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/social-media-posts/analytics", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const rows = await db.select().from(socialMediaPostsTable);
    const byPlatform = rows.reduce((acc, r) => {
      if (!r.platform) return acc;
      if (!acc[r.platform]) acc[r.platform] = { posts: 0, totalLikes: 0, totalShares: 0, totalReach: 0, totalDonationReferrals: 0 };
      acc[r.platform].posts += 1;
      acc[r.platform].totalLikes += r.likes ?? 0;
      acc[r.platform].totalShares += r.shares ?? 0;
      acc[r.platform].totalReach += r.reach ?? 0;
      acc[r.platform].totalDonationReferrals += r.donationReferrals ?? 0;
      return acc;
    }, {} as Record<string, { posts: number; totalLikes: number; totalShares: number; totalReach: number; totalDonationReferrals: number; }>);
    const topPosts = rows.sort((a, b) => (b.donationReferrals ?? 0) - (a.donationReferrals ?? 0)).slice(0, 5).map(fmt);
    return res.json({ byPlatform, topPosts, totalPosts: rows.length });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/social-media-posts/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.select().from(socialMediaPostsTable).where(eq(socialMediaPostsTable.postId, parseInt(req.params.id as string))).limit(1);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/social-media-posts/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [row] = await db.update(socialMediaPostsTable).set(req.body).where(eq(socialMediaPostsTable.postId, parseInt(req.params.id as string))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(row));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/social-media-posts/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    await db.delete(socialMediaPostsTable).where(eq(socialMediaPostsTable.postId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
