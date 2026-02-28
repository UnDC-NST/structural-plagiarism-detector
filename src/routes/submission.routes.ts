import { Router } from "express";
import { SubmissionController } from "../controllers/SubmissionController";

export function createSubmissionRouter(
  controller: SubmissionController,
): Router {
  const router = Router();
  router.post("/", controller.create); // POST /api/v1/submissions
  router.get("/:id", controller.getById); // GET  /api/v1/submissions/:id
  return router;
}
