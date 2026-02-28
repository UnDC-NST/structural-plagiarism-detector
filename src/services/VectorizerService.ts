import { FrequencyVector, IVectorizerService } from "../types";

/**
 * VectorizerService
 *
 * SRP  — Only responsible for converting a serialized string into a term
 *         frequency vector.
 * Pure + Stateless — no side effects, same input always gives same output.
 *
 * Why a frequency vector over a set?
 *   Jaccard on sets ignores repetition: three `if` nodes look identical to one.
 *   Cosine on frequency vectors correctly weights how often each structure
 *   appears, giving a more accurate structural similarity score.
 */
export class VectorizerService implements IVectorizerService {
  public vectorize(serialized: string): FrequencyVector {
    const vector: FrequencyVector = new Map<string, number>();

    if (!serialized.trim()) return vector;

    const tokens = serialized.split(" ");
    for (const token of tokens) {
      if (token) {
        vector.set(token, (vector.get(token) ?? 0) + 1);
      }
    }
    return vector;
  }
}
