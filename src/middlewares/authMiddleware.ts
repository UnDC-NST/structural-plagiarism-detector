import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { IOrganization } from "../models/Organization";
import { IOrganizationService } from "../services/OrganizationService";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      organization?: IOrganization;
    }
  }
}

export function createAuthMiddleware(organizationService: IOrganizationService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers["x-api-key"] as string;

      if (!apiKey) {
        res.status(401).json({ error: "Missing API key" });
        return;
      }

      
      if (config.useInMemoryDb) {
        if (apiKey !== config.apiKey) {
          res.status(401).json({ error: "Invalid API key" });
          return;
        }
        
        req.organization = {
          _id: "dev-org",
          name: "Development Organization",
          plan: "enterprise",
          isActive: true,
        } as any;
        next();
        return;
      }

      
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
