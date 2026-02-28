import mongoose, { Schema, Document } from "mongoose";

/**
 * Organization/Tenant model
 * Represents an organization using the plagiarism detection service
 */
export interface IOrganization extends Document {
  name: string;
  apiKey: string;
  email: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  isActive: boolean;
  
  // Usage limits based on plan
  limits: {
    maxSubmissionsPerMonth: number;
    maxComparisonsPerMonth: number;
    maxFileSizeBytes: number;
    maxBulkFiles: number;
  };
  
  // Current usage tracking
  usage: {
    submissionsThisMonth: number;
    comparisonsThisMonth: number;
    lastResetDate: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ["free", "basic", "pro", "enterprise"],
      default: "free",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    limits: {
      maxSubmissionsPerMonth: {
        type: Number,
        default: 100, // Free tier default
      },
      maxComparisonsPerMonth: {
        type: Number,
        default: 500, // Free tier default
      },
      maxFileSizeBytes: {
        type: Number,
        default: 1048576, // 1MB default
      },
      maxBulkFiles: {
        type: Number,
        default: 10, // Free tier default
      },
    },
    usage: {
      submissionsThisMonth: {
        type: Number,
        default: 0,
      },
      comparisonsThisMonth: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient API key lookups
OrganizationSchema.index({ apiKey: 1 });
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ isActive: 1 });

// Method to check if organization has exceeded limits
OrganizationSchema.methods.hasExceededSubmissionLimit = function (): boolean {
  return this.usage.submissionsThisMonth >= this.limits.maxSubmissionsPerMonth;
};

OrganizationSchema.methods.hasExceededComparisonLimit = function (): boolean {
  return this.usage.comparisonsThisMonth >= this.limits.maxComparisonsPerMonth;
};

// Method to reset monthly usage if needed
OrganizationSchema.methods.resetUsageIfNeeded = function (): void {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  // Reset if it's a new month
  if (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    this.usage.submissionsThisMonth = 0;
    this.usage.comparisonsThisMonth = 0;
    this.usage.lastResetDate = now;
  }
};

// Method to increment usage
OrganizationSchema.methods.incrementSubmissionUsage = async function (): Promise<void> {
  this.usage.submissionsThisMonth += 1;
  await this.save();
};

OrganizationSchema.methods.incrementComparisonUsage = async function (count: number = 1): Promise<void> {
  this.usage.comparisonsThisMonth += count;
  await this.save();
};

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
