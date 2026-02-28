

export type SupportedLanguage = "python";

export interface IRNode {
  type: string;
  children: IRNode[];
}

export type FrequencyVector = Map<string, number>;

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
  
  sharedNodes: number;
  
  totalNodesTarget: number;
  
  totalNodesMatch: number | null;
}

export interface CorpusEntry {
  id: string;
  serialized: string;
}

export interface IParserService {
  parse(code: string, language: SupportedLanguage): unknown;
}

export interface INormalizerService {
  normalize(tree: unknown): IRNode;
}

export interface ISerializerService {
  serialize(ir: IRNode): string;
}

export interface IVectorizerService {
  vectorize(serialized: string): FrequencyVector;
}

export interface ISimilarityService {
  computeSimilarity(a: FrequencyVector, b: FrequencyVector): number;
  findMostSimilar(
    target: FrequencyVector,
    corpus: CorpusEntry[],
  ): SimilarityMatch;
  
  sharedTokenCount(a: FrequencyVector, b: FrequencyVector): number;
}

export interface ISubmissionService {
  saveSubmission(
    rawCode: string,
    serialized: string,
    language: string,
    organizationId?: string,
  ): Promise<string>;
  getAllSerialized(language: string): Promise<CorpusEntry[]>;
  getAllSerializedForOrg(language: string, organizationId: string): Promise<CorpusEntry[]>;
  findById(
    id: string,
  ): Promise<{ _id: string; language: string; createdAt: Date } | null>;
}
