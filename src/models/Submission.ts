import { Schema, model, Document } from "mongoose";

export interface ISubmission extends Document {
  rawCode: string;
  serializedStructure: string;
  language: string;
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    rawCode: { type: String, required: true },
    serializedStructure: { type: String, required: true },
    language: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SubmissionSchema.index({ createdAt: -1 });

export const Submission = model<ISubmission>("Submission", SubmissionSchema);
