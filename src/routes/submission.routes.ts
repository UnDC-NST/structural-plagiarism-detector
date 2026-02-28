import { Router } from "express";
import { SubmissionController } from "../controllers/SubmissionController";

export function createSubmissionRouter(
  controller: SubmissionController,
): Router {
  const router = Router();
  router.post("/", controller.create); 
  router.get("/:id", controller.getById); 
  return router;
}
