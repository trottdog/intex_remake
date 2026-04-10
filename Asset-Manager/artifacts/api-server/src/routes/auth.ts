import { Router } from "express";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { usersTable, staffSafehouseAssignmentsTable, supportersTable } from "@workspace/db/schema";
import { signToken, requireAuth, optionalAuth, AuthUser } from "../middleware/auth";

const router = Router();

function validatePassword(pw: string | undefined): string | null {
  if (!pw || pw.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one digit";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character";
  return null;
}

router.post("/auth/register-donor", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      username,
      password,
    } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      password?: string;
    };

    const cleanFirstName = firstName?.trim();
    const cleanLastName = lastName?.trim();
    const cleanEmail = email?.trim().toLowerCase();
    const cleanUsername = username?.trim().toLowerCase();

    if (!cleanFirstName || !cleanLastName || !cleanEmail || !cleanUsername || !password) {
      return res.status(400).json({ error: "firstName, lastName, email, username, and password are required" });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const [duplicateUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.username}) = ${cleanUsername} or lower(${usersTable.email}) = ${cleanEmail}`)
      .limit(1);

    if (duplicateUser) {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    const [supporter] = await db
      .insert(supportersTable)
      .values({
        supporterType: "individual",
        displayName: `${cleanFirstName} ${cleanLastName}`,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail,
        status: "active",
        createdAt: new Date().toISOString(),
        canLogin: true,
      })
      .returning({ supporterId: supportersTable.supporterId });

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(usersTable)
      .values({
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        role: "donor",
        supporterId: supporter.supporterId,
      })
      .returning({ id: usersTable.id, username: usersTable.username, email: usersTable.email, supporterId: usersTable.supporterId });

    return res.status(201).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create donor account" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));
    const assignments = await db
      .select({ safehouseId: staffSafehouseAssignmentsTable.safehouseId })
      .from(staffSafehouseAssignmentsTable)
      .where(eq(staffSafehouseAssignmentsTable.userId, String(user.id)));
    const safehouses = assignments.map((a) => a.safehouseId);
    const userPayload: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as AuthUser["role"],
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      lastLogin: user.lastLogin?.toISOString() ?? null,
      supporterId: user.supporterId,
      safehouses,
    };
    const token = signToken(userPayload);
    return res.json({ token, user: userPayload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    const pwErrors: string[] = [];
    if (newPassword.length < 12) pwErrors.push("at least 12 characters");
    if (!/[A-Z]/.test(newPassword)) pwErrors.push("an uppercase letter");
    if (!/[a-z]/.test(newPassword)) pwErrors.push("a lowercase letter");
    if (!/[0-9]/.test(newPassword)) pwErrors.push("a digit");
    if (!/[^A-Za-z0-9]/.test(newPassword)) pwErrors.push("a special character");
    if (pwErrors.length > 0) {
      return res.status(400).json({ error: `Password must contain: ${pwErrors.join(", ")}` });
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
    return res.json({ message: "Password changed successfully" });
  } catch {
    return res.status(500).json({ error: "Failed to change password" });
  }
});

router.get("/auth/me", optionalAuth, async (req, res) => {
  if (!req.user) return res.json({ user: null });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1);
    if (!user) return res.status(404).json({ user: null });
    const assignments = await db
      .select({ safehouseId: staffSafehouseAssignmentsTable.safehouseId })
      .from(staffSafehouseAssignmentsTable)
      .where(eq(staffSafehouseAssignmentsTable.userId, String(user.id)));
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
        lastLogin: user.lastLogin?.toISOString() ?? null,
        supporterId: user.supporterId,
        safehouses: assignments.map((a) => a.safehouseId),
      },
    });
  } catch {
    return res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
