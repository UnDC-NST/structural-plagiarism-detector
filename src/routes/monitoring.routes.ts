import { Router } from "express";
import { MonitoringController } from "../controllers/MonitoringController";

/**
 * createMonitoringRouter — Routes for observability endpoints
 *
 * Note: In production, protect these routes with authentication
 */
export function createMonitoringRouter(
  controller: MonitoringController
): Router {
  const router = Router();

  // Health checks (no auth - used by load balancers)
  router.get("/health", controller.health);
  router.get("/health/liveness", controller.liveness);
  router.get("/health/readiness", controller.readiness);

  // Metrics (should be protected in production)
  router.get("/metrics", controller.metrics);
  router.get("/metrics/prometheus", controller.prometheusMetrics);

  // Circuit breakers
  router.get("/circuit-breakers", controller.circuitBreakers);

  // Cache stats
  router.get("/cache/stats", controller.cacheStats);

  return router;
}
