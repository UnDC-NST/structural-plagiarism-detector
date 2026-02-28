import { Router } from "express";
import { CompareController } from "../controllers/CompareController";

export function createCompareRouter(controller: CompareController): Router {
  const router = Router();
  router.post("/", controller.compare); 
  router.post("/bulk", controller.bulkAnalyze); 
  return router;
}
