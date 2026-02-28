import { Schema, model, Document, Types } from "mongoose";

export interface ISubmission extends Document {
  rawCode: string;
  serializedStructure: string;
  language: string;
  organizationId?: Types.ObjectId | string; 
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    rawCode: { type: String, required: true },
    serializedStructure: { type: String, required: true },
    language: { type: String, required: true, index: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      required: false, 
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SubmissionSchema.index({ organizationId: 1, language: 1 });
SubmissionSchema.index({ createdAt: -1 });

export const Submission = model<ISubmission>("Submission", SubmissionSchema);
