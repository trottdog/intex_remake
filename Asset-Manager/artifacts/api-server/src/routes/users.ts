import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "../lib/db";
import { usersTable, staffSafehouseAssignmentsTable } from "@workspace/db/schema";
import { requireAuth, requireRoles } from "../middleware/auth";
import { paginate, resolveLimit } from "../lib/paginate";

const router = Router();

function validatePassword(pw: string | undefined): string | null {
  if (!pw || pw.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one digit";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character";
  return null;
}

type UserRow = typeof usersTable.$inferSelect;

function fmtUser(u: UserRow, safehouses: number[] = []) {
  const { passwordHash, ...rest } = u;
  return {
    ...rest,
    assignedSafehouses: safehouses,
    lastLogin: u.lastLogin?.toISOString?.() ?? u.lastLogin ?? null,
    createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
  };
}

router.get("/users", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const { page = "1", limit = "20", role, pageSize } = req.query as Record<string, string>;
    const pageNum = parseInt(page), limitNum = resolveLimit(limit, pageSize);
    let rows = await db.select().from(usersTable);
    if (role) rows = rows.filter(u => u.role === role);
    const total = rows.length;
    return res.json({ data: rows.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(u => fmtUser(u)), total, pagination: paginate(total, pageNum, limitNum) });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/users", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const { password, assignedSafehouses, ...rest } = req.body;
    const pwdError = validatePassword(password);
    if (pwdError) return res.status(400).json({ error: pwdError });
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
    if (assignedSafehouses?.length) {
      await db.insert(staffSafehouseAssignmentsTable).values(
        assignedSafehouses.map((safehouseId: number) => ({ userId: String(user.id), safehouseId }))
      );
    }
    return res.status(201).json(fmtUser(user, assignedSafehouses ?? []));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.get("/users/:id", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id as string))).limit(1);
    if (!user) return res.status(404).json({ error: "Not found" });
    const assignments = await db.select({ safehouseId: staffSafehouseAssignmentsTable.safehouseId }).from(staffSafehouseAssignmentsTable).where(eq(staffSafehouseAssignmentsTable.userId, String(user.id)));
    return res.json(fmtUser(user, assignments.map(a => a.safehouseId)));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.patch("/users/:id", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const { assignedSafehouses, ...rest } = req.body;
    const [user] = await db.update(usersTable).set(rest).where(eq(usersTable.id, parseInt(req.params.id as string))).returning();
    if (!user) return res.status(404).json({ error: "Not found" });
    if (assignedSafehouses !== undefined) {
      await db.delete(staffSafehouseAssignmentsTable).where(eq(staffSafehouseAssignmentsTable.userId, String(user.id)));
      if (assignedSafehouses.length > 0) {
        await db.insert(staffSafehouseAssignmentsTable).values(assignedSafehouses.map((safehouseId: number) => ({ userId: String(user.id), safehouseId })));
      }
    }
    return res.json(fmtUser(user, assignedSafehouses ?? []));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.delete("/users/:id", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (id === req.user!.id) return res.status(400).json({ error: "Cannot delete your own account" });
    await db.delete(usersTable).where(eq(usersTable.id, id));
    return res.status(204).send();
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/users/:id/disable", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const [user] = await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, parseInt(req.params.id as string))).returning();
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json(fmtUser(user));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

router.post("/users/:id/enable", requireAuth, requireRoles("super_admin"), async (req, res) => {
  try {
    const [user] = await db.update(usersTable).set({ isActive: true }).where(eq(usersTable.id, parseInt(req.params.id as string))).returning();
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json(fmtUser(user));
  } catch { return res.status(500).json({ error: "Failed" }); }
});

export default router;
