import express from "express";
import cors from "cors";
import { config } from "./config/Config";
import { configureSecurity } from "./middlewares/securityMiddleware";

import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { errorHandler } from "./middlewares/errorHandler";
import { rateLimiter } from "./middlewares/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger";
import { correlationMiddleware } from "./middlewares/correlationMiddleware";
import { createMetricsMiddleware } from "./middlewares/metricsMiddleware";

import { createAnalyzeRouter } from "./routes/analyze.routes";
import { createSubmissionRouter } from "./routes/submission.routes";
import { createCompareRouter } from "./routes/compare.routes";
import { createMonitoringRouter } from "./routes/monitoring.routes";
import { createOrganizationRouter } from "./routes/organization.routes";

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

configureSecurity(app);

app.use(cors({ origin: config.allowedOrigins }));
app.use(express.json({ limit: config.maxCodeSizeBytes }));

app.use(correlationMiddleware);

app.use(requestLogger);

app.use(createMetricsMiddleware(metricsService));

app.use("/", createMonitoringRouter(monitoringController));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const authMiddleware = createAuthMiddleware(organizationService);

app.use("/api/v1/organizations", rateLimiter, createOrganizationRouter(organizationController, authMiddleware));
app.use("/api/v1/analyze", rateLimiter, authMiddleware, createAnalyzeRouter(analyzeController));
app.use("/api/v1/submissions", rateLimiter, authMiddleware, createSubmissionRouter(submissionController));
app.use("/api/v1/compare", rateLimiter, authMiddleware, createCompareRouter(compareController));

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

export default app;
