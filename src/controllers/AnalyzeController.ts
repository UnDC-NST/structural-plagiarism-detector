import { z } from "zod";
import { Request, Response } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  IVectorizerService,
  ISimilarityService,
  ISubmissionService,
  SupportedLanguage,
} from "../types";
import { IOrganizationService } from "../services/OrganizationService";
import { asyncHandler } from "../utils/asyncHandler";
import { toConfidence } from "../services/SimilarityService";
import { FLAG_THRESHOLD } from "../utils/constants";

const AnalyzeSchema = z.object({
  code: z.string().min(1, "code must not be empty").max(50_000),
  language: z.enum(["python"]),
});

export class AnalyzeController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly vectorizer: IVectorizerService,
    private readonly similarity: ISimilarityService,
    private readonly submissions: ISubmissionService,
    private readonly organizationService?: IOrganizationService,
  ) {}

  public readonly handle = asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization;
    
    
    if (org && this.organizationService) {
      this.organizationService.checkLimits(org, "comparison");
    }

    const { code, language } = AnalyzeSchema.parse(req.body); 

    
    const tree = this.parser.parse(code, language as SupportedLanguage); 
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);
    const targetVec = this.vectorizer.vectorize(serialized);

    
    const corpus = org
      ? await this.submissions.getAllSerializedForOrg(language, org._id.toString())
      : await this.submissions.getAllSerialized(language);
      
    const match = this.similarity.findMostSimilar(targetVec, corpus);

    
    if (org && this.organizationService) {
      await this.organizationService.updateUsage(org._id.toString(), "comparison", 1);
    }

    res.status(200).json({
      similarityScore: match.score,
      confidence: toConfidence(match.score),
      matchedSubmissionId: match.matchedId,
      flagged: match.score >= FLAG_THRESHOLD,
      metadata: {
        sharedNodes: match.sharedNodes,
        totalNodesInput: match.totalNodesTarget,
        totalNodesMatched: match.totalNodesMatch,
      },
    });
  });
}
