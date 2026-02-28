import { Router } from "express";
import { CompareController } from "../controllers/CompareController";

/**
 * Factory — creates the router with controller instance injected.
 * Keeps route file free of service coupling.
 */
export function createCompareRouter(controller: CompareController): Router {
  const router = Router();

  // POST /api/v1/compare
  router.post("/", (req, res, next) => controller.compare(req, res, next));

  // POST /api/v1/bulk-analyze
  router.post("/bulk", (req, res, next) =>
    controller.bulkAnalyze(req, res, next),
  );

  return router;
}
