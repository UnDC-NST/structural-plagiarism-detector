import { z } from "zod";
import { Request, Response } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  ISubmissionService,
  SupportedLanguage,
} from "../types";
import { IOrganizationService } from "../services/OrganizationService";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

const CreateSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.enum(["python"]),
});

export class SubmissionController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly submissions: ISubmissionService,
    private readonly organizationService?: IOrganizationService,
  ) {}

  
  public readonly create = asyncHandler(async (req: Request, res: Response) => {
    const org = req.organization;
    
    
    if (org && this.organizationService) {
      this.organizationService.checkLimits(org, "submission");
    }

    const { code, language } = CreateSchema.parse(req.body);

    const tree = this.parser.parse(code, language as SupportedLanguage);
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);

    const submissionId = await this.submissions.saveSubmission(
      code,
      serialized,
      language,
      org?._id?.toString(),
    );

    
    if (org && this.organizationService) {
      await this.organizationService.updateUsage(org._id.toString(), "submission");
    }

    res.status(201).json({ submissionId });
  });

  
  public readonly getById = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const doc = await this.submissions.findById(id);

      if (!doc) throw new AppError(404, `Submission not found: ${id}`);

      res.status(200).json(doc);
    },
  );
}
