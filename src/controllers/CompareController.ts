import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  IVectorizerService,
  ISimilarityService,
  SupportedLanguage,
  FrequencyVector,
} from "../types";
import { UnsupportedLanguageError } from "../services/ParserService";

const CompareSchema = z.object({
  codeA: z.string().min(1).max(50_000),
  codeB: z.string().min(1).max(50_000),
  language: z.enum(["python"]),
});

const BulkAnalyzeSchema = z.object({
  submissions: z
    .array(
      z.object({
        code: z.string().min(1).max(50_000),
        label: z.string().optional(),
      }),
    )
    .min(2, "Provide at least 2 submissions"),
  language: z.enum(["python"]),
});

const FLAG_THRESHOLD = 0.75;

/**
 * CompareController
 *
 * DIP — Constructor-injected interface dependencies only.
 * SRP — Direct comparisons only; no DB access.
 *
 * Bulk analysis: vectors pre-computed once (not O(n²) re-parsing).
 * Event loop: `setImmediate` yields between batches to avoid blocking Node.js.
 */
export class CompareController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly vectorizer: IVectorizerService,
    private readonly similarity: ISimilarityService,
  ) {}

  // ── POST /api/v1/compare ──────────────────────────────────────────────────

  public async compare(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { codeA, codeB, language } = CompareSchema.parse(req.body);

      const vecA = this.pipeline(codeA, language as SupportedLanguage);
      const vecB = this.pipeline(codeB, language as SupportedLanguage);
      const score = this.similarity.computeSimilarity(vecA, vecB);
      const shared = this.similarity.sharedTokenCount(vecA, vecB);

      res.status(200).json({
        similarityScore: score,
        metadata: {
          sharedNodes: shared,
          totalNodesA: vecA.size,
          totalNodesB: vecB.size,
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

  // ── POST /api/v1/compare/bulk ─────────────────────────────────────────────

  public async bulkAnalyze(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { submissions, language } = BulkAnalyzeSchema.parse(req.body);

      // Pre-vectorize all entries once — O(n) not O(n²) re-parsing
      const entries: { label: string; vector: FrequencyVector }[] =
        submissions.map((s, i) => ({
          label: s.label ?? `submission_${i + 1}`,
          vector: this.pipeline(s.code, language as SupportedLanguage),
        }));

      // Pairwise comparison — yield to event loop every 5 pairs to stay non-blocking
      const results: object[] = [];
      let pairsProcessed = 0;

      for (let i = 0; i < entries.length; i++) {
        const a = entries[i];
        const matches: object[] = [];

        for (let j = 0; j < entries.length; j++) {
          if (j === i) continue;
          const b = entries[j];
          const score = this.similarity.computeSimilarity(a.vector, b.vector);
          const shared = this.similarity.sharedTokenCount(a.vector, b.vector);

          matches.push({
            againstLabel: b.label,
            similarityScore: score,
            flagged: score >= FLAG_THRESHOLD,
            sharedNodes: shared,
          });

          // Yield to event loop every 5 pair-comparisons to avoid blocking
          pairsProcessed++;
          if (pairsProcessed % 5 === 0) {
            await new Promise<void>((r) => setImmediate(r));
          }
        }

        results.push({ label: a.label, matches });
      }

      res.status(200).json({ results });
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

  // ── Private pipeline helper ───────────────────────────────────────────────

  /** parse → normalize → serialize → vectorize */
  private pipeline(code: string, language: SupportedLanguage): FrequencyVector {
    const tree = this.parser.parse(code, language);
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);
    return this.vectorizer.vectorize(serialized);
  }
}
