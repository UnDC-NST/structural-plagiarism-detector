import { FrequencyVector, IVectorizerService } from "../types";

/**
 * VectorizerService
 *
 * SRP  — Only responsible for converting a serialized string into a
 *         depth-weighted term-frequency vector.
 * Pure + Stateless — same input always produces the same output.
 *
 * ── Input format ──────────────────────────────────────────────────────────────
 * Expects tokens in "type:depth" format as produced by SerializerService:
 *   "module:0 function_definition:1 if_statement:2 return_statement:3 ..."
 *
 * ── Depth-weighted frequency ──────────────────────────────────────────────────
 * Instead of freq[type] += 1 (flat count), we accumulate:
 *
 *   freq[type] += 1 / (depth + 1)
 *
 * Effect:
 *   depth 0 → weight 1.000   (module root — structural anchor)
 *   depth 1 → weight 0.500   (function / class )
 *   depth 2 → weight 0.333   (if / for / while bodies)
 *   depth 3 → weight 0.250   (nested blocks)
 *   depth 6 → weight 0.143   (deeply embedded nodes)
 *
 * Why this is better than flat counting:
 *   - High-level structure (file/function shape) drives similarity more than
 *     deeply nested details.
 *   - Two files with same top-level shape but different inner loops still score
 *     close; two files with completely different top-level structure always
 *     score low.
 *
 * Why this is better than node|depth token mutation:
 *   - Vocabulary stays stable → dense vectors → stable cosine scores.
 *   - No feature-space explosion from unlimited depth integers.
 *   - Works correctly on very short snippets (≤ 5 nodes).
 *
 * ── Depth buckets (optional future upgrade) ───────────────────────────────────
 * If you ever need discrete depth bands instead of continuous weighting:
 *   depth 0   → d0
 *   depth 1-2 → d1
 *   depth 3-5 → d2
 *   depth 6+  → d3
 * This could replace `1/(depth+1)` with a bucket multiplier.
 */
export class VectorizerService implements IVectorizerService {
  public vectorize(serialized: string): FrequencyVector {
    const vector: FrequencyVector = new Map<string, number>();

    if (!serialized.trim()) return vector;

    for (const token of serialized.split(" ")) {
      if (!token) continue;

      const colonIdx = token.lastIndexOf(":");
      if (colonIdx === -1) {
        // Fallback: plain token with no depth info → weight 1
        vector.set(token, (vector.get(token) ?? 0) + 1);
        continue;
      }

      const type = token.slice(0, colonIdx);
      const depth = parseInt(token.slice(colonIdx + 1), 10);

      if (!type || isNaN(depth)) continue;

      const weight = 1 / (depth + 1);
      vector.set(type, (vector.get(type) ?? 0) + weight);
    }

    return vector;
  }
}
