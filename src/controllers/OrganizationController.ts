import { Request, Response } from "express";
import { IOrganizationService, CreateOrganizationDto } from "../services/OrganizationService";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

export class OrganizationController {
  constructor(private organizationService: IOrganizationService) {}

  
  async create(req: Request, res: Response): Promise<void> {
    const { name, email, plan } = req.body;

    if (!name || !email) {
      throw new AppError(400,"Name and email are required");
    }

    const data: CreateOrganizationDto = {
      name,
      email,
      plan: plan || "free",
    };

    const organization = await this.organizationService.create(data);

    logger.info("Organization created via API", {
      orgId: organization._id,
      name: organization.name,
      plan: organization.plan,
    });

    res.status(201).json({
      organization: {
        id: organization._id,
        name: organization.name,
        email: organization.email,
        plan: organization.plan,
        apiKey: organization.apiKey,
        limits: organization.limits,
      },
      message: "Organization created successfully. Keep your API key secure!",
    });
  }

  
  async getCurrent(req: Request, res: Response): Promise<void> {
    const org = req.organization;

    if (!org) {
      throw new AppError(401, "Organization not found in request");
    }

    res.json({
      organization: {
        id: org._id,
        name: org.name,
        email: org.email,
        plan: org.plan,
        isActive: org.isActive,
        limits: org.limits,
        createdAt: org.createdAt,
      },
    });
  }

  
  async getUsage(req: Request, res: Response): Promise<void> {
    const org = req.organization;

    if (!org) {
      throw new AppError(401, "Organization not found in request");
    }

    const stats = await this.organizationService.getUsageStats(org._id.toString());

    res.json({
      usage: stats,
    });
  }
}
