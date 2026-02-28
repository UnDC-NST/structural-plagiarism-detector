import { Router } from "express";
import { AnalyzeController } from "../controllers/AnalyzeController";

export function createAnalyzeRouter(controller: AnalyzeController): Router {
  const router = Router();
  
  router.post("/", controller.handle);
  return router;
}
