import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { IOrganization } from "../models/Organization";
import { IOrganizationService } from "../services/OrganizationService";
import { logger } from "../utils/logger";

// Extend Express Request to include organization
declare global {
  namespace Express {
    interface Request {
      organization?: IOrganization;
    }
  }
}

/**
 * Create auth middleware with organization service
 */
export function createAuthMiddleware(organizationService: IOrganizationService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers["x-api-key"] as string;

      if (!apiKey) {
        res.status(401).json({ error: "Missing API key" });
        return;
      }

      // If using in-memory database, fall back to simple API key check
      if (config.useInMemoryDb) {
        if (apiKey !== config.apiKey) {
          res.status(401).json({ error: "Invalid API key" });
          return;
        }
        // In dev mode, create a mock organization
        req.organization = {
          _id: "dev-org",
          name: "Development Organization",
          plan: "enterprise",
          isActive: true,
        } as any;
        next();
        return;
      }

      // Look up organization by API key
      const organization = await organizationService.findByApiKey(apiKey);

      if (!organization) {
        logger.warn("Invalid API key attempt", { apiKey: apiKey.substring(0, 10) + "..." });
        res.status(401).json({ error: "Invalid API key" });
        return;
      }

      if (!organization.isActive) {
        res.status(403).json({ error: "Organization account is inactive" });
        return;
      }

      // Attach organization to request
      req.organization = organization;

      logger.debug("Organization authenticated", {
        orgId: organization._id,
        orgName: organization.name,
        plan: organization.plan,
      });

      next();
    } catch (error) {
      logger.error("Authentication error", { error });
      res.status(500).json({ error: "Authentication failed" });
    }
  };
}

/**
 * Legacy auth middleware for backward compatibility
 * @deprecated Use createAuthMiddleware instead
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const key = req.headers["x-api-key"];
  if (!key || key !== config.apiKey) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }
  next();
}
