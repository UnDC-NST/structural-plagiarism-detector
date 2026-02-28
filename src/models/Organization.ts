import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  apiKey: string;
  email: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  isActive: boolean;
  
  
  limits: {
    maxSubmissionsPerMonth: number;
    maxComparisonsPerMonth: number;
    maxFileSizeBytes: number;
    maxBulkFiles: number;
  };
  
  
  usage: {
    submissionsThisMonth: number;
    comparisonsThisMonth: number;
    lastResetDate: Date;
  };
  
  
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
        default: 100, 
      },
      maxComparisonsPerMonth: {
        type: Number,
        default: 500, 
      },
      maxFileSizeBytes: {
        type: Number,
        default: 1048576, 
      },
      maxBulkFiles: {
        type: Number,
        default: 10, 
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

OrganizationSchema.index({ apiKey: 1 });
OrganizationSchema.index({ email: 1 });
OrganizationSchema.index({ isActive: 1 });

OrganizationSchema.methods.hasExceededSubmissionLimit = function (): boolean {
  return this.usage.submissionsThisMonth >= this.limits.maxSubmissionsPerMonth;
};

OrganizationSchema.methods.hasExceededComparisonLimit = function (): boolean {
  return this.usage.comparisonsThisMonth >= this.limits.maxComparisonsPerMonth;
};

OrganizationSchema.methods.resetUsageIfNeeded = function (): void {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);
  
  
  if (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    this.usage.submissionsThisMonth = 0;
    this.usage.comparisonsThisMonth = 0;
    this.usage.lastResetDate = now;
  }
};

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
