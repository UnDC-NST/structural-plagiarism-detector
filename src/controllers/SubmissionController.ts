import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import {
  IParserService,
  INormalizerService,
  ISerializerService,
  ISubmissionService,
  SupportedLanguage,
} from "../types";
import { UnsupportedLanguageError } from "../services/ParserService";

// ── Zod schemas ───────────────────────────────────────────────────────────────
const CreateSchema = z.object({
  code: z.string().min(1).max(50_000),
  language: z.enum(["python"]),
});

/**
 * SubmissionController
 *
 * DIP  — All services injected via constructor (interfaces only).
 * SRP  — Handles only submission creation and retrieval; no similarity logic.
 */
export class SubmissionController {
  constructor(
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly submissions: ISubmissionService,
  ) {}

  /** POST /api/v1/submissions */
  public async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { code, language } = CreateSchema.parse(req.body);

      const tree = this.parser.parse(code, language as SupportedLanguage);
      const ir = this.normalizer.normalize(tree);
      const serialized = this.serializer.serialize(ir);

      const submissionId = await this.submissions.saveSubmission(
        code,
        serialized,
        language,
      );

      res.status(201).json({ submissionId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.errors });
        return;
      }
      if (err instanceof UnsupportedLanguageError) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  }

  /** GET /api/v1/submissions/:id */
  public async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const doc = await this.submissions.findById(id);

      if (!doc) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  }
}
