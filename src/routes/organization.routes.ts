import { Router } from "express";
import { OrganizationController } from "../controllers/OrganizationController";
import { asyncHandler } from "../utils/asyncHandler";
import { IOrganizationService } from "../services/OrganizationService";

/**
 * Create organization routes
 */
export function createOrganizationRouter(
  organizationController: OrganizationController,
  authMiddleware: any
): Router {
  const router = Router();

  // Public route - create new organization (self-registration)
  router.post(
    "/",
    asyncHandler(organizationController.create.bind(organizationController))
  );

  // Protected routes - require authentication
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
