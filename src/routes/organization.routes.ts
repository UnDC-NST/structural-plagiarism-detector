import { Router } from "express";
import { OrganizationController } from "../controllers/OrganizationController";
import { asyncHandler } from "../utils/asyncHandler";
import { IOrganizationService } from "../services/OrganizationService";

export function createOrganizationRouter(
  organizationController: OrganizationController,
  authMiddleware: any
): Router {
  const router = Router();

  
  router.post(
    "/",
    asyncHandler(organizationController.create.bind(organizationController))
  );

  
  router.get(
    "/me",
    authMiddleware,
    asyncHandler(organizationController.getCurrent.bind(organizationController))
  );

  router.get(
    "/usage",
    authMiddleware,
    asyncHandler(organizationController.getUsage.bind(organizationController))
  );

  return router;
}
