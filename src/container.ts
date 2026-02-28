/**
 * container.ts — Dependency Injection Container
 *
 * One place to swap implementations:
 *   - Set USE_IN_MEMORY_DB=true in .env → no MongoDB required (dev/test)
 *   - Unset or false → uses MongoDB (production)
 *
 * Controllers import nothing concrete; they only know interfaces.
 */
import { ParserService } from "./services/ParserService";
import { NormalizerService } from "./services/NormalizerService";
import { SerializerService } from "./services/SerializerService";
import { VectorizerService } from "./services/VectorizerService";
import { SimilarityService } from "./services/SimilarityService";
import { SubmissionService } from "./services/SubmissionService";
import { InMemorySubmissionService } from "./services/InMemorySubmissionService";

import { AnalyzeController } from "./controllers/AnalyzeController";
import { SubmissionController } from "./controllers/SubmissionController";
import { CompareController } from "./controllers/CompareController";

import { ISubmissionService } from "./types";

// ── Service singletons ────────────────────────────────────────────────────────
const parser = ParserService.getInstance(); // Singleton — one shared Tree-sitter parser
const normalizer = new NormalizerService();
const serializer = new SerializerService();
const vectorizer = new VectorizerService();
const similarity = new SimilarityService();

// ── DB layer — toggled by env var ─────────────────────────────────────────────
const useInMemory = process.env.USE_IN_MEMORY_DB === "true";
const submissions: ISubmissionService = useInMemory
  ? new InMemorySubmissionService()
  : new SubmissionService();

if (useInMemory) {
  console.log("⚡ Running with in-memory store (no MongoDB required)");
}

// ── Controllers (depend on interfaces only) ───────────────────────────────────
export const analyzeController = new AnalyzeController(
  parser,
  normalizer,
  serializer,
  vectorizer,
  similarity,
  submissions,
);

export const submissionController = new SubmissionController(
  parser,
  normalizer,
  serializer,
  submissions,
);

export const compareController = new CompareController(
  parser,
  normalizer,
  serializer,
  vectorizer,
  similarity,
);
