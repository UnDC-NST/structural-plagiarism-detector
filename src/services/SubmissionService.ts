import { ISubmissionService, CorpusEntry } from "../types";
import { Submission } from "../models/Submission";

export class SubmissionService implements ISubmissionService {
  
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
