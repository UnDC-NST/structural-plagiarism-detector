import { Router } from "express";
import { AnalyzeController } from "../controllers/AnalyzeController";

export function createAnalyzeRouter(controller: AnalyzeController): Router {
  const router = Router();
  router.post("/", (req, res, next) => controller.handle(req, res, next));
  return router;
}
