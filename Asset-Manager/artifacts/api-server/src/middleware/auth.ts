import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { db } from "../lib/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "public" | "donor" | "staff" | "admin" | "super_admin";
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin?: string | null;
  supporterId?: number | null;
  safehouses?: number[];
}

/** Returns the safehouse IDs the user is restricted to, or null if unrestricted (super_admin). */
export function getUserSafehouses(user: AuthUser | undefined): number[] | null {
  if (!user || user.role === "super_admin") return null;
  if (user.safehouses && user.safehouses.length > 0) return user.safehouses;
  return null; // unassigned admin/staff see all data (backward compatible)
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production. Configure it as a Replit Secret before deploying.");
  }
  const ephemeral = randomBytes(48).toString("hex");
  console.warn("[auth] WARNING: JWT_SECRET not set. Using ephemeral secret — all tokens will be invalidated on restart. Set JWT_SECRET as a Replit Secret before deploying.");
  return ephemeral;
}

const JWT_SECRET: string = resolveJwtSecret();

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    const [dbUser] = await db.select({ id: usersTable.id, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.id))
      .limit(1);
    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ error: "Account is disabled or not found" });
    }
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
      // Ignore invalid tokens in optional auth
    }
  }
  next();
}
