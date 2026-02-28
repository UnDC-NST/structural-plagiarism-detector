import { ISubmissionService, CorpusEntry } from "../types";
import { randomUUID } from "crypto";

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
    organizationId?: string,
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

  
  public async getAllSerializedForOrg(
    language: string,
    organizationId: string
  ): Promise<CorpusEntry[]> {
    
    return this.getAllSerialized(language);
  }

  public async findById(
    id: string,
  ): Promise<{ _id: string; language: string; createdAt: Date } | null> {
    const doc = this.store.get(id);
    if (!doc) return null;
    return { _id: doc.id, language: doc.language, createdAt: doc.createdAt };
  }

  
  public size(): number {
    return this.store.size;
  }
}
