import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityHeaders, rateLimiter, sanitizeInput } from "./middleware/security";

const app: Express = express();

// Redirect HTTP → HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] === "http") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(securityHeaders);
app.use(rateLimiter(500, 60_000));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, false);
    if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: false,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

app.use("/api", router);

export default app;
