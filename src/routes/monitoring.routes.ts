import { Router } from "express";
import { MonitoringController } from "../controllers/MonitoringController";

export function createMonitoringRouter(
  controller: MonitoringController
): Router {
  const router = Router();

  
  router.get("/health", controller.health);
  router.get("/health/liveness", controller.liveness);
  router.get("/health/readiness", controller.readiness);

  
  router.get("/metrics", controller.metrics);
  router.get("/metrics/prometheus", controller.prometheusMetrics);

  
  router.get("/circuit-breakers", controller.circuitBreakers);

  
  router.get("/cache/stats", controller.cacheStats);

  return router;
}
