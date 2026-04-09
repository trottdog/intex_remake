import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { inKindDonationItemsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate } from "../lib/paginate";

const router = Router();

type ItemRow = typeof inKindDonationItemsTable.$inferSelect;

function fmt(item: ItemRow) {
  return {
    ...item,
    quantity: item.quantity ? parseFloat(item.quantity) : null,
    estimatedUnitValue: item.estimatedUnitValue ? parseFloat(item.estimatedUnitValue) : null,
  };
}

router.get("/in-kind-donation-items", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const { donationId, itemCategory, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = parseInt(pageSize);
    let rows = await db.select().from(inKindDonationItemsTable);
    if (donationId) rows = rows.filter(r => r.donationId === parseInt(donationId));
    if (itemCategory) rows = rows.filter(r => r.itemCategory === itemCategory);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(fmt), total, pagination: paginate(total, pageNum, limitNum) });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed" }); }
});

router.post("/in-kind-donation-items", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [inserted] = await db.insert(inKindDonationItemsTable).values(req.body).returning();
    return res.status(201).json(fmt(inserted));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed" }); }
});

router.get("/in-kind-donation-items/:id", requireAuth, requireRoles("staff", "admin", "super_admin"), async (req, res) => {
  try {
    const [item] = await db.select().from(inKindDonationItemsTable).where(eq(inKindDonationItemsTable.itemId, parseInt(req.params.id as string)));
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(fmt(item));
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed" }); }
});

router.delete("/in-kind-donation-items/:id", requireAuth, requireRoles("admin", "super_admin"), async (req, res) => {
  try {
    const [item] = await db.select().from(inKindDonationItemsTable).where(eq(inKindDonationItemsTable.itemId, parseInt(req.params.id as string)));
    if (!item) return res.status(404).json({ error: "Not found" });
    await db.delete(inKindDonationItemsTable).where(eq(inKindDonationItemsTable.itemId, parseInt(req.params.id as string)));
    return res.status(204).send();
  } catch (err) { console.error(err); return res.status(500).json({ error: "Failed" }); }
});

export default router;
