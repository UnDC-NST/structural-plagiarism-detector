import { Router } from "express";
import { CompareController } from "../controllers/CompareController";

export function createCompareRouter(controller: CompareController): Router {
  const router = Router();
  router.post("/", controller.compare); // POST /api/v1/compare
  router.post("/bulk", controller.bulkAnalyze); // POST /api/v1/compare/bulk
  return router;
}
