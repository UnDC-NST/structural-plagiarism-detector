import { FrequencyVector, IVectorizerService } from "../types";

export class VectorizerService implements IVectorizerService {
  public vectorize(serialized: string): FrequencyVector {
    const vector: FrequencyVector = new Map<string, number>();

    if (!serialized.trim()) return vector;

    for (const token of serialized.split(" ")) {
      if (!token) continue;

      const colonIdx = token.lastIndexOf(":");
      if (colonIdx === -1) {
        
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
