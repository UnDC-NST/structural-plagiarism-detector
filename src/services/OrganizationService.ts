import { Organization, IOrganization } from "../models/Organization";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import crypto from "crypto";

export interface IOrganizationService {
  findByApiKey(apiKey: string): Promise<IOrganization | null>;
  create(data: CreateOrganizationDto): Promise<IOrganization>;
  updateUsage(orgId: string, type: "submission" | "comparison", count?: number): Promise<void>;
  checkLimits(org: IOrganization, type: "submission" | "comparison"): void;
  getUsageStats(orgId: string): Promise<UsageStats>;
}

export interface CreateOrganizationDto {
  name: string;
  email: string;
  plan?: "free" | "basic" | "pro" | "enterprise";
}

export interface UsageStats {
  organization: {
    id: string;
    name: string;
    plan: string;
  };
  currentUsage: {
    submissions: number;
    comparisons: number;
  };
  limits: {
    submissions: number;
    comparisons: number;
  };
  percentageUsed: {
    submissions: number;
    comparisons: number;
  };
  resetDate: Date;
}

const PLAN_LIMITS = {
  free: {
    maxSubmissionsPerMonth: 100,
    maxComparisonsPerMonth: 500,
    maxFileSizeBytes: 1048576, 
    maxBulkFiles: 10,
  },
  basic: {
    maxSubmissionsPerMonth: 1000,
    maxComparisonsPerMonth: 5000,
    maxFileSizeBytes: 5242880, 
    maxBulkFiles: 25,
  },
  pro: {
    maxSubmissionsPerMonth: 10000,
    maxComparisonsPerMonth: 50000,
    maxFileSizeBytes: 10485760, 
    maxBulkFiles: 50,
  },
  enterprise: {
    maxSubmissionsPerMonth: -1, 
    maxComparisonsPerMonth: -1, 
    maxFileSizeBytes: 52428800, 
    maxBulkFiles: 100,
  },
};

export class OrganizationService implements IOrganizationService {
  
  async findByApiKey(apiKey: string): Promise<IOrganization | null> {
    try {
      const org = await Organization.findOne({ apiKey, isActive: true });
      
      if (org) {
        
        (org as any).resetUsageIfNeeded();
        if (org.isModified()) {
          await org.save();
        }
      }
      
      return org;
    } catch (error) {
      logger.error("Error finding organization by API key", { error });
      throw new AppError(500, "Failed to authenticate organization");
    }
  }

  
  async create(data: CreateOrganizationDto): Promise<IOrganization> {
    try {
      
      const existing = await Organization.findOne({ email: data.email });
      if (existing) {
        throw new AppError(409, "Organization with this email already exists");
      }

      
      const apiKey = this.generateApiKey();

      
      const plan = data.plan || "free";
      const limits = PLAN_LIMITS[plan];

      const org = new Organization({
        name: data.name,
        email: data.email,
        apiKey,
        plan,
        limits,
        isActive: true,
        usage: {
          submissionsThisMonth: 0,
          comparisonsThisMonth: 0,
          lastResetDate: new Date(),
        },
      });

      await org.save();

      logger.info("Organization created", {
        orgId: org._id,
        name: org.name,
        plan: org.plan,
      });

      return org;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error creating organization", { error, data });
      throw new AppError(500, "Failed to create organization");
    }
  }

  
  async updateUsage(
    orgId: string,
    type: "submission" | "comparison",
    count: number = 1
  ): Promise<void> {
    try {
      const org = await Organization.findById(orgId);
      if (!org) {
        throw new AppError(404, "Organization not found");
      }

      
      (org as any).resetUsageIfNeeded();

      
      if (type === "submission") {
        await (org as any).incrementSubmissionUsage();
      } else {
        await (org as any).incrementComparisonUsage(count);
      }

      logger.debug("Organization usage updated", {
        orgId,
        type,
        count,
        newUsage: org.usage,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error updating organization usage", { error, orgId, type });
      
    }
  }

  
  checkLimits(org: IOrganization, type: "submission" | "comparison"): void {
    
    if (org.plan === "enterprise") {
      return;
    }

    if (type === "submission" && (org as any).hasExceededSubmissionLimit()) {
      throw new AppError(
        429,
        `Monthly submission limit exceeded (${org.limits.maxSubmissionsPerMonth}). Upgrade your plan or wait for next month.`
      );
    }

    if (type === "comparison" && (org as any).hasExceededComparisonLimit()) {
      throw new AppError(
        429,
        `Monthly comparison limit exceeded (${org.limits.maxComparisonsPerMonth}). Upgrade your plan or wait for next month.`
      );
    }
  }

  
  async getUsageStats(orgId: string): Promise<UsageStats> {
    try {
      const org = await Organization.findById(orgId);
      if (!org) {
        throw new AppError(404, "Organization not found");
      }

      
      (org as any).resetUsageIfNeeded();

      const submissionLimit = org.limits.maxSubmissionsPerMonth;
      const comparisonLimit = org.limits.maxComparisonsPerMonth;

      return {
        organization: {
          id: org._id.toString(),
          name: org.name,
          plan: org.plan,
        },
        currentUsage: {
          submissions: org.usage.submissionsThisMonth,
          comparisons: org.usage.comparisonsThisMonth,
        },
        limits: {
          submissions: submissionLimit,
          comparisons: comparisonLimit,
        },
        percentageUsed: {
          submissions:
            submissionLimit > 0
              ? Math.round((org.usage.submissionsThisMonth / submissionLimit) * 100)
              : 0,
          comparisons:
            comparisonLimit > 0
              ? Math.round((org.usage.comparisonsThisMonth / comparisonLimit) * 100)
              : 0,
        },
        resetDate: org.usage.lastResetDate,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error getting usage stats", { error, orgId });
      throw new AppError(500, "Failed to get usage statistics");
    }
  }

  
  private generateApiKey(): string {
    return `spd_${crypto.randomBytes(32).toString("hex")}`;
  }
}
