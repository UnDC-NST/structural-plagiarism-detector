import { z } from "zod";
import { Request, Response } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  IVectorizerService,
  ISimilarityService,
  SupportedLanguage,
  FrequencyVector,
} from "../types";
import { IOrganizationService } from "../services/OrganizationService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { toConfidence } from "../services/SimilarityService";
import { FLAG_THRESHOLD } from "../utils/constants";

// ── Constants ─────────────────────────────────────────────────────────────────
const BULK_MAX_FILES = 50;
const BULK_MAX_PAIRS = 3000; // 78 files × 77 = ~6006, so 50 files (2450) is within this

// ── Validation schemas ────────────────────────────────────────────────────────
const CompareSchema = z.object({
  codeA: z
    .string()
    .min(1, "codeA is required")
    .max(100_000, "codeA exceeds 100KB"),
  codeB: z
    .string()
    .min(1, "codeB is required")
    .max(100_000, "codeB exceeds 100KB"),
  language: z.enum(["python"]),
});

const BulkAnalyzeSchema = z.object({
  submissions: z
    .array(
      z.object({
        code: z
          .string()
          .min(1, "code is required")
          .max(50_000, "code exceeds 50KB per file"),
        label: z.string().max(200).optional(),
      }),
    )
    .min(2, "Provide at least 2 submissions")
    .max(BULK_MAX_FILES, `Maximum ${BULK_MAX_FILES} submissions per request`),
  language: z.enum(["python"]),
});

/**
 * CompareController
 *
 * DIP  — Constructor-injected interface dependencies only.
 * SRP  — Direct comparisons only; no DB access.
 *
 * Endpoints:
 *   POST /api/v1/compare        — 1v1 direct comparison with metadata
 *   POST /api/v1/compare/bulk   — pairwise matrix + suspicious pairs
 *
 * Safety guardrails:
 *   - Max 50 files per bulk request (Zod)
 *   - Max 3000 pairs computed (derived from n*(n-1))
 *   - setImmediate every 5 pairs — non-blocking event loop
 *
 * Observability:
 *   - Parse + vectorize duration
 *   - Similarity compute duration
 *   - Total request duration
 *   - Heap usage (MB)
 */
export class CompareController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly vectorizer: IVectorizerService,
    private readonly similarity: ISimilarityService,
    private readonly organizationService?: IOrganizationService,
  ) {}

  // ── POST /api/v1/compare ──────────────────────────────────────────────────

  public readonly compare = asyncHandler(
    async (req: Request, res: Response) => {
      const org = req.organization;
      
      // Check organization comparison limits (1 comparison)
      if (org && this.organizationService) {
        this.organizationService.checkLimits(org, "comparison");
      }

      const { codeA, codeB, language } = CompareSchema.parse(req.body);

      const vecA = this.pipeline(codeA, language as SupportedLanguage);
      const vecB = this.pipeline(codeB, language as SupportedLanguage);
      const score = this.similarity.computeSimilarity(vecA, vecB);
      const shared = this.similarity.sharedTokenCount(vecA, vecB);

      // Track organization usage (1 comparison)
      if (org && this.organizationService) {
        await this.organizationService.updateUsage(org._id.toString(), "comparison", 1);
      }

      res.status(200).json({
        similarityScore: score,
        confidence: toConfidence(score),
        flagged: score >= FLAG_THRESHOLD,
        metadata: {
          sharedNodes: shared,
          totalNodesA: vecA.size,
          totalNodesB: vecB.size,
        },
      });
    },
  );

  // ── POST /api/v1/compare/bulk ─────────────────────────────────────────────

  public readonly bulkAnalyze = asyncHandler(
    async (req: Request, res: Response) => {
      const org = req.organization;
      const requestStart = Date.now();
      const { submissions, language } = BulkAnalyzeSchema.parse(req.body);

      const n = submissions.length;
      const pairs = n * (n - 1); // directional pairs (i→j and j→i)

      // Hard guardrail: reject before any computation if pair count too high
      if (pairs > BULK_MAX_PAIRS * 2) {
        throw new AppError(
          400,
          `Too many comparisons: ${pairs / 2} pairs from ${n} files. Max allowed: ${BULK_MAX_PAIRS}.`,
        );
      }

      // ── Phase 1: Pre-vectorize all files once (O(n)) ──────────────────────
      const vecStart = Date.now();
      const entries: { label: string; vector: FrequencyVector }[] =
        submissions.map((s, i) => ({
          label: s.label ?? `submission_${i + 1}`,
          vector: this.pipeline(s.code, language as SupportedLanguage),
        }));
      const vecMs = Date.now() - vecStart;

      // ── Phase 2: Pairwise comparison + build matrix (O(n²/2)) ─────────────
      const simStart = Date.now();
      let processed = 0;

      // n×n matrix of similarity scores (diagonal = 1.0)
      const matrix: number[][] = Array.from({ length: n }, () =>
        Array(n).fill(0),
      );
      const suspiciousPairs: Array<{
        labelA: string;
        labelB: string;
        score: number;
        confidence: string;
        sharedNodes: number;
      }> = [];

      for (let i = 0; i < n; i++) {
        matrix[i][i] = 1.0;
        for (let j = i + 1; j < n; j++) {
          const a = entries[i];
          const b = entries[j];
          const score = this.similarity.computeSimilarity(a.vector, b.vector);
          const shared = this.similarity.sharedTokenCount(a.vector, b.vector);

          matrix[i][j] = score;
          matrix[j][i] = score;

          if (score >= FLAG_THRESHOLD) {
            suspiciousPairs.push({
              labelA: a.label,
              labelB: b.label,
              score,
              confidence: toConfidence(score),
              sharedNodes: shared,
            });
          }

          // Yield to event loop every 5 pairs — keeps Node.js non-blocking
          if (++processed % 5 === 0) {
            await new Promise<void>((r) => setImmediate(r));
          }
        }
      }

      const simMs = Date.now() - simStart;
      const totalMs = Date.now() - requestStart;
      const heapMb = Math.round(process.memoryUsage().heapUsed / 1_048_576);

      // Sort suspicious pairs high→low
      suspiciousPairs.sort((a, b) => b.score - a.score);

      // Track organization usage (n*(n-1)/2 comparisons)
      if (org && this.organizationService) {
        const numComparisons = (n * (n - 1)) / 2;
        await this.organizationService.updateUsage(org._id.toString(), "comparison", numComparisons);
      }

      // ── Observability log ──────────────────────────────────────────────────
      logger.info("bulk_analyze", {
        files: n,
        pairs: processed,
        vectorize_ms: vecMs,
        similarity_ms: simMs,
        total_ms: totalMs,
        heap_mb: heapMb,
        flagged: suspiciousPairs.length,
      });

      res.status(200).json({
        labels: entries.map((e) => e.label),
        matrix,
        suspiciousPairs,
        metadata: {
          files: n,
          pairs: processed,
          totalMs,
          heapMb,
          flagThreshold: FLAG_THRESHOLD,
        },
      });
    },
  );

  // ── Private pipeline helper ───────────────────────────────────────────────

  private pipeline(code: string, language: SupportedLanguage): FrequencyVector {
    const tree = this.parser.parse(code, language);
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);
    return this.vectorizer.vectorize(serialized);
  }
}
