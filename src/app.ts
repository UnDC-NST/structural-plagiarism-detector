import express from "express";
import cors from "cors";
import { config } from "./config";

// Middleware
import { authMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./middlewares/errorHandler";
import { rateLimiter } from "./middlewares/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger";

// Route factories
import { createAnalyzeRouter } from "./routes/analyze.routes";
import { createSubmissionRouter } from "./routes/submission.routes";
import { createCompareRouter } from "./routes/compare.routes";

// DI container — all controllers pre-wired with their services
import {
  analyzeController,
  submissionController,
  compareController,
} from "./container";

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: config.allowedOrigins }));
app.use(express.json({ limit: "200kb" }));
app.use(requestLogger);

// ── Health check (public — no API key required) ───────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth + rate limiting (applied to all routes below) ───────────────────────
app.use(authMiddleware);
app.use(rateLimiter);

// ── Versioned API routes ──────────────────────────────────────────────────────
app.use("/api/v1/analyze", createAnalyzeRouter(analyzeController));
app.use("/api/v1/submissions", createSubmissionRouter(submissionController));
app.use("/api/v1/compare", createCompareRouter(compareController));

// Bulk-analyze lives under /api/v1/compare/bulk (wired inside compareRouter)

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Centralised error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

export default app;
