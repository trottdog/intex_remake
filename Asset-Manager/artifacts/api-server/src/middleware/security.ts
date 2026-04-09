import { Request, Response, NextFunction } from "express";

const API_BASE = process.env.VITE_API_BASE_URL ?? "";

const connectSrc = ["'self'", API_BASE].filter(Boolean).join(" ");

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Content-Security-Policy", cspDirectives);
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(maxRequests = 200, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const entry = requestCounts.get(ip);
    if (!entry || entry.resetAt < now) {
      requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const stripHtml = (val: unknown): unknown => {
    if (typeof val === "string") {
      return val
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .trim();
    }
    if (Array.isArray(val)) return val.map(stripHtml);
    if (val && typeof val === "object") {
      return Object.fromEntries(Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, stripHtml(v)]));
    }
    return val;
  };
  if (req.body) req.body = stripHtml(req.body);
  next();
}
