// ─── Domain Types ─────────────────────────────────────────────────────────────

export type SupportedLanguage = "python";

/**
 * Intermediate Representation node.
 * Carries only structural type info — no identifiers, literals or comments.
 */
export interface IRNode {
  type: string;
  children: IRNode[];
}

/** Frequency map of AST node types, used for cosine similarity. */
export type FrequencyVector = Map<string, number>;

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface AnalyzeRequest {
  code: string;
  language: SupportedLanguage;
}

export interface AnalyzeResponse {
  similarityScore: number;
  confidence: "high" | "medium" | "low" | "none";
  matchedSubmissionId: string | null;
  flagged: boolean;
  metadata: {
    sharedNodes: number;
    totalNodesInput: number;
    totalNodesMatched: number | null;
  };
}

export interface SubmissionRequest {
  code: string;
  language: SupportedLanguage;
}

export interface SubmissionResponse {
  submissionId: string;
}

export interface CompareRequest {
  codeA: string;
  codeB: string;
  language: SupportedLanguage;
}

export interface CompareResponse {
  similarityScore: number;
}

export interface BulkAnalyzeRequest {
  submissions: Array<{ code: string; label?: string }>;
  language: SupportedLanguage;
}

export interface BulkAnalyzeEntry {
  label: string;
  matches: Array<{
    againstLabel: string;
    similarityScore: number;
    flagged: boolean;
  }>;
}

export interface BulkAnalyzeResponse {
  results: BulkAnalyzeEntry[];
}

export interface SimilarityMatch {
  score: number;
  matchedId: string | null;
  /** Number of node-type tokens shared between target and best match. */
  sharedNodes: number;
  /** Total distinct tokens in the target vector. */
  totalNodesTarget: number;
  /** Total distinct tokens in the best-matched corpus entry (null if no match). */
  totalNodesMatch: number | null;
}

export interface CorpusEntry {
  id: string;
  serialized: string;
}

// ─── Service Interfaces (Dependency Inversion Principle) ──────────────────────

/**
 * IParserService — S: only responsible for turning raw code into an AST.
 * Open for extension: new languages implemented by new classes, not modifications.
 */
export interface IParserService {
  parse(code: string, language: SupportedLanguage): unknown;
}

/**
 * INormalizerService — S: only responsible for stripping surface details from
 * an AST and returning a structural IRNode tree. Stateless.
 */
export interface INormalizerService {
  normalize(tree: unknown): IRNode;
}

/**
 * ISerializerService — S: deterministically converts IRNode → canonical string.
 * Pre-order DFS traversal. Stateless.
 */
export interface ISerializerService {
  serialize(ir: IRNode): string;
}

/**
 * IVectorizerService — S: converts a serialized string into a frequency vector.
 * Separated from serializer so similarity metric can be swapped independently.
 */
export interface IVectorizerService {
  vectorize(serialized: string): FrequencyVector;
}

/**
 * ISimilarityService — Strategy pattern: algorithm (cosine) is encapsulated
 * here. Swap to MinHash by providing a different implementation.
 */
export interface ISimilarityService {
  computeSimilarity(a: FrequencyVector, b: FrequencyVector): number;
  findMostSimilar(
    target: FrequencyVector,
    corpus: CorpusEntry[],
  ): SimilarityMatch;
  /** Utility: count of shared token types between two vectors. */
  sharedTokenCount(a: FrequencyVector, b: FrequencyVector): number;
}

/**
 * ISubmissionService — S: only responsible for persistence of submissions.
 * All business logic lives in services above.
 */
export interface ISubmissionService {
  saveSubmission(
    rawCode: string,
    serialized: string,
    language: string,
  ): Promise<string>;
  getAllSerialized(language: string): Promise<CorpusEntry[]>;
  findById(
    id: string,
  ): Promise<{ _id: string; language: string; createdAt: Date } | null>;
}
