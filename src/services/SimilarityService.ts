import {
  FrequencyVector,
  ISimilarityService,
  SimilarityMatch,
  CorpusEntry,
} from "../types";

/**
 * SimilarityService
 *
 * SRP      — Only responsible for computing structural similarity.
 * Strategy — Cosine on frequency vectors; swap to MinHash by implementing
 *            ISimilarityService in a new class and updating container.ts only.
 *
 * Cosine similarity: cos(A,B) = (A·B) / (|A| × |B|)
 * Beats Jaccard because it weights token frequency, not just presence.
 * A file with 100 `if` nodes vs one with 1 `if` node → Jaccard=1, Cosine<1 ✓
 */
export class SimilarityService implements ISimilarityService {
  // ── ISimilarityService ──────────────────────────────────────────────────────

  public computeSimilarity(a: FrequencyVector, b: FrequencyVector): number {
    if (a.size === 0 || b.size === 0) return 0;

    const dotProduct = this.dot(a, b);
    const magA = this.magnitude(a);
    const magB = this.magnitude(b);

    if (magA === 0 || magB === 0) return 0;

    const score = dotProduct / (magA * magB);
    return Math.min(1, Math.max(0, parseFloat(score.toFixed(4))));
  }

  /**
   * Find the most structurally similar corpus entry.
   * Returns full metadata for interpretability.
   * O(n) — acceptable up to ~10k; upgrade to MinHash+LSH beyond that.
   */
  public findMostSimilar(
    target: FrequencyVector,
    corpus: CorpusEntry[],
  ): SimilarityMatch {
    let bestScore = 0;
    let bestId: string | null = null;
    let bestVector: FrequencyVector | null = null;

    for (const entry of corpus) {
      const candidateVec = this.buildVector(entry.serialized);
      const score = this.computeSimilarity(target, candidateVec);
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.id;
        bestVector = candidateVec;
      }
    }

    const sharedNodes = bestVector
      ? this.sharedTokenCount(target, bestVector)
      : 0;
    const totalNodesMatch = bestVector ? bestVector.size : null;

    return {
      score: bestScore,
      matchedId: bestId,
      sharedNodes,
      totalNodesTarget: target.size,
      totalNodesMatch,
    };
  }

  /** Count of distinct token types present in both vectors. */
  public sharedTokenCount(a: FrequencyVector, b: FrequencyVector): number {
    let count = 0;
    for (const key of a.keys()) {
      if (b.has(key)) count++;
    }
    return count;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Σ(a[k] * b[k]) for all keys in a */
  private dot(a: FrequencyVector, b: FrequencyVector): number {
    let sum = 0;
    for (const [token, countA] of a) {
      sum += countA * (b.get(token) ?? 0);
    }
    return sum;
  }

  /** √(Σ v² ) */
  private magnitude(v: FrequencyVector): number {
    let sum = 0;
    for (const count of v.values()) sum += count * count;
    return Math.sqrt(sum);
  }

  private buildVector(serialized: string): FrequencyVector {
    const vec: FrequencyVector = new Map();
    for (const token of serialized.split(" ")) {
      if (token) vec.set(token, (vec.get(token) ?? 0) + 1);
    }
    return vec;
  }
}

/** Map cosine score to human-readable confidence label. */
export function toConfidence(
  score: number,
): "high" | "medium" | "low" | "none" {
  if (score >= 0.85) return "high";
  if (score >= 0.65) return "medium";
  if (score >= 0.4) return "low";
  return "none";
}
