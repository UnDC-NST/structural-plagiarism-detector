import { ISubmissionService, CorpusEntry } from "../types";
import { Submission } from "../models/Submission";

/**
 * SubmissionService
 *
 * SRP — Only responsible for CRUD operations on Submission documents.
 *        No parsing, no similarity logic lives here.
 * DIP — Controllers depend on ISubmissionService, not this concrete class.
 *        Swap to a different DB adapter by implementing ISubmissionService.
 */
export class SubmissionService implements ISubmissionService {
  /**
   * Persist rawCode + serialized structure.
   * @returns The new document's MongoDB _id as string.
   */
  public async saveSubmission(
    rawCode: string,
    serialized: string,
    language: string,
    organizationId?: string,
  ): Promise<string> {
    const doc = await Submission.create({
      rawCode,
      serializedStructure: serialized,
      language,
      organizationId,
    });
    return doc._id.toString();
  }

  /**
   * Retrieve all serialized structures for a language.
   * Used by AnalyzeController when scanning the corpus.
   */
  public async getAllSerialized(language: string): Promise<CorpusEntry[]> {
    const docs = await Submission.find(
      { language },
      { _id: 1, serializedStructure: 1 },
    ).lean();

    return docs.map((d) => ({
      id: (d._id as object).toString(),
      serialized: d.serializedStructure,
    }));
  }

  /**
   * Retrieve all serialized structures for a language and organization.
   */
  public async getAllSerializedForOrg(
    language: string,
    organizationId: string
  ): Promise<CorpusEntry[]> {
    const docs = await Submission.find(
      { language, organizationId },
      { _id: 1, serializedStructure: 1 },
    ).lean();

    return docs.map((d) => ({
      id: (d._id as object).toString(),
      serialized: d.serializedStructure,
    }));
  }

  /**
   * Fetch a single submission for the GET /submissions/:id endpoint.
   * Returns null when not found — caller maps to 404.
   */
  public async findById(
    id: string,
  ): Promise<{ _id: string; language: string; createdAt: Date } | null> {
    const doc = await Submission.findById(id, {
      _id: 1,
      language: 1,
      createdAt: 1,
    }).lean();
    if (!doc) return null;
    return {
      _id: (doc._id as object).toString(),
      language: doc.language,
      createdAt: doc.createdAt!,
    };
  }
}
