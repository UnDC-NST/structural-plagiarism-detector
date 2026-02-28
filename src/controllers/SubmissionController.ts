import { z } from "zod";
import { Request, Response } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  ISubmissionService,
  SupportedLanguage,
} from "../types";
import { IOrganizationService } from "../services/OrganizationService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ── Validation schema ─────────────────────────────────────────────────────────
const CreateSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.enum(["python"]),
});

/**
 * SubmissionController
 *
 * DIP — All services injected via constructor (interfaces only).
 * SRP — Handles submission creation and retrieval. No similarity logic.
 *
 * Error handling via asyncHandler + centralised errorHandler:
 *   ZodError          → 400 (validation failed)
 *   AppError(400)     → 400 (unsupported language)
 *   AppError(404)     → 404 (submission not found)
 *   AppError(429)     → 429 (usage limit exceeded)
 *   Unknown errors    → 500
 */
export class SubmissionController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly submissions: ISubmissionService,
    private readonly organizationService?: IOrganizationService,
  ) {}

  /** POST /api/v1/submissions — parse + store */
  public readonly create = asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization;
    
    // Check organization submission limits
    if (org && this.organizationService) {
      this.organizationService.checkLimits(org, "submission");
    }

    const { code, language } = CreateSchema.parse(req.body);

    const tree = this.parser.parse(code, language as SupportedLanguage);
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);

    const submissionId = await this.submissions.saveSubmission(
      code,
      serialized,
      language,
      org?._id?.toString(),
    );

    // Track organization usage
    if (org && this.organizationService) {
      await this.organizationService.updateUsage(org._id.toString(), "submission");
    }

    res.status(201).json({ submissionId });
  });

  /** GET /api/v1/submissions/:id — fetch by ID */
  public readonly getById = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const doc = await this.submissions.findById(id);

      if (!doc) throw new AppError(404, `Submission not found: ${id}`);

      res.status(200).json(doc);
    },
  );
}
