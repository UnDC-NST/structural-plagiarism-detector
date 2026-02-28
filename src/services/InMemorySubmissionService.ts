import { ISubmissionService, CorpusEntry } from "../types";
import { randomUUID } from "crypto";

/**
 * InMemorySubmissionService
 *
 * Implements ISubmissionService using a plain Map — zero external dependencies.
 * Use cases:
 *   - Local development without MongoDB installed
 *   - Unit testing (no DB mocking required)
 *   - CI pipelines
 *
 * DIP — Controllers depend on ISubmissionService only.
 *        Switching from Mongo → in-memory = one-line change in container.ts.
 *
 * Note: data is cleared on process restart. Not suitable for production.
 */
export class InMemorySubmissionService implements ISubmissionService {
  private readonly store = new Map<
    string,
    {
      id: string;
      rawCode: string;
      serializedStructure: string;
      language: string;
      createdAt: Date;
    }
  >();

  public async saveSubmission(
    rawCode: string,
    serialized: string,
    language: string,
  ): Promise<string> {
    const id = randomUUID();
    this.store.set(id, {
      id,
      rawCode,
      serializedStructure: serialized,
      language,
      createdAt: new Date(),
    });
    return id;
  }

  public async getAllSerialized(language: string): Promise<CorpusEntry[]> {
    const results: CorpusEntry[] = [];
    for (const doc of this.store.values()) {
      if (doc.language === language) {
        results.push({ id: doc.id, serialized: doc.serializedStructure });
      }
    }
    return results;
  }

  public async findById(
    id: string,
  ): Promise<{ _id: string; language: string; createdAt: Date } | null> {
    const doc = this.store.get(id);
    if (!doc) return null;
    return { _id: doc.id, language: doc.language, createdAt: doc.createdAt };
  }

  /** Utility for testing — returns current store size. */
  public size(): number {
    return this.store.size;
  }
}
