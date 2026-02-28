import { z } from "zod";
import { Request, Response } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  IVectorizerService,
  ISimilarityService,
  ISubmissionService,
  SupportedLanguage,
} from "../types";
import { IOrganizationService } from "../services/OrganizationService";
import { asyncHandler } from "../utils/asyncHandler";
import { toConfidence } from "../services/SimilarityService";
import { FLAG_THRESHOLD } from "../utils/constants";

// ── Validation schema ─────────────────────────────────────────────────────────
const AnalyzeSchema = z.object({
  code: z.string().min(1, "code must not be empty").max(50_000),
  language: z.enum(["python"]),
});

/**
 * AnalyzeController
 *
 * DIP — Depends on service interfaces only (constructor injection).
 * SRP — Orchestrates the analyze pipeline. Zero business logic.
 *
 * All error handling is delegated to:
 *   • asyncHandler   — forwards any thrown error to next(err)
 *   • errorHandler   — maps ZodError→400, AppError→statusCode, unknown→500
 *   • UnsupportedLanguageError extends AppError(400) — auto-handled
 */
export class AnalyzeController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly vectorizer: IVectorizerService,
    private readonly similarity: ISimilarityService,
    private readonly submissions: ISubmissionService,
    private readonly organizationService?: IOrganizationService,
  ) {}

  public readonly handle = asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization;
    
    // Check organization comparison limits
    if (org && this.organizationService) {
      this.organizationService.checkLimits(org, "comparison");
    }

    const { code, language } = AnalyzeSchema.parse(req.body); // ZodError → 400

    // Pipeline: parse → normalize → serialize → vectorize
    const tree = this.parser.parse(code, language as SupportedLanguage); // AppError(400) if unsupported
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);
    const targetVec = this.vectorizer.vectorize(serialized);

    // Find best match in corpus (optionally filtered by organization)
    const corpus = org
      ? await this.submissions.getAllSerializedForOrg(language, org._id.toString())
      : await this.submissions.getAllSerialized(language);
      
    const match = this.similarity.findMostSimilar(targetVec, corpus);

    // Track organization usage (1 comparison)
    if (org && this.organizationService) {
      await this.organizationService.updateUsage(org._id.toString(), "comparison", 1);
    }

    res.status(200).json({
      similarityScore: match.score,
      confidence: toConfidence(match.score),
      matchedSubmissionId: match.matchedId,
      flagged: match.score >= FLAG_THRESHOLD,
      metadata: {
        sharedNodes: match.sharedNodes,
        totalNodesInput: match.totalNodesTarget,
        totalNodesMatched: match.totalNodesMatch,
      },
    });
  });
}
