import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  IVectorizerService,
  ISimilarityService,
  ISubmissionService,
  SupportedLanguage,
} from "../types";
import { UnsupportedLanguageError } from "../services/ParserService";
import { toConfidence } from "../services/SimilarityService";

const AnalyzeSchema = z.object({
  code: z.string().min(1, "code must not be empty").max(50_000),
  language: z.enum(["python"]),
});

const FLAG_THRESHOLD = 0.75;

/**
 * AnalyzeController
 *
 * DIP — Depends on service interfaces only, injected via constructor.
 * SRP — Orchestrates the analyze pipeline and formats the response.
 *        Zero business logic lives here.
 */
export class AnalyzeController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly vectorizer: IVectorizerService,
    private readonly similarity: ISimilarityService,
    private readonly submissions: ISubmissionService,
  ) {}

  public async handle(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { code, language } = AnalyzeSchema.parse(req.body);

      // Pipeline: parse → normalize → serialize → vectorize
      const tree = this.parser.parse(code, language as SupportedLanguage);
      const ir = this.normalizer.normalize(tree);
      const serialized = this.serializer.serialize(ir);
      const targetVec = this.vectorizer.vectorize(serialized);

      // Corpus comparison
      const corpus = await this.submissions.getAllSerialized(language);
      const match = this.similarity.findMostSimilar(targetVec, corpus);

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
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      if (err instanceof UnsupportedLanguageError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  }
}
