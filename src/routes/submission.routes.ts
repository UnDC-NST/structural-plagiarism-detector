import { Router } from "express";
import { SubmissionController } from "../controllers/SubmissionController";

export function createSubmissionRouter(
  controller: SubmissionController,
): Router {
  const router = Router();
  router.post("/", (req, res, next) => controller.create(req, res, next));
  router.get("/:id", (req, res, next) => controller.getById(req, res, next));
  return router;
}
