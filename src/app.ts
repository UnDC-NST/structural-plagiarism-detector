import express from "express";
import cors from "cors";
import { config } from "./config/Config";
import { configureSecurity } from "./middlewares/securityMiddleware";

// ── Middleware ────────────────────────────────────────────────────────────────
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./middlewares/errorHandler";
import { rateLimiter } from "./middlewares/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger";
import { correlationMiddleware } from "./middlewares/correlationMiddleware";
import { createMetricsMiddleware } from "./middlewares/metricsMiddleware";

// ── Route Factories ───────────────────────────────────────────────────────────
import { createAnalyzeRouter } from "./routes/analyze.routes";
import { createSubmissionRouter } from "./routes/submission.routes";
import { createCompareRouter } from "./routes/compare.routes";
import { createMonitoringRouter } from "./routes/monitoring.routes";
import { createOrganizationRouter } from "./routes/organization.routes";

// ── DI Container (all controllers pre-wired) ──────────────────────────────────
import {
  analyzeController,
  submissionController,
  compareController,
  monitoringController,
  organizationController,
  organizationService,
  metricsService,
} from "./container";

const app = express();

// ── Security Middleware (Helmet) - FIRST ──────────────────────────────────────
configureSecurity(app);

// ── Global Middleware (order matters!) ────────────────────────────────────────
app.use(cors({ origin: config.allowedOrigins }));
app.use(express.json({ limit: config.maxCodeSizeBytes }));

// Request tracing with correlation IDs
app.use(correlationMiddleware);

// Request logging
app.use(requestLogger);

// Metrics collection
app.use(createMetricsMiddleware(metricsService));

// ── Public Monitoring Endpoints (no auth) ─────────────────────────────────────
// These should be accessible for load balancers and monitoring systems
app.use("/", createMonitoringRouter(monitoringController));

// ── Legacy Health Check (backward compatibility) ──────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Create Auth Middleware ────────────────────────────────────────────────────
const authMiddleware = createAuthMiddleware(organizationService);

// ── Protected API Routes (auth + rate limiting) ───────────────────────────────
app.use("/api/v1/organizations", rateLimiter, createOrganizationRouter(organizationController, authMiddleware));
app.use("/api/v1/analyze", rateLimiter, authMiddleware, createAnalyzeRouter(analyzeController));
app.use("/api/v1/submissions", rateLimiter, authMiddleware, createSubmissionRouter(submissionController));
app.use("/api/v1/compare", rateLimiter, authMiddleware, createCompareRouter(compareController));

// ── 404 Fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Centralized Error Handler (must be last) ──────────────────────────────────
app.use(errorHandler);

export default app;
