import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { UnsupportedLanguageError } from "../services/ParserService";
import { logger } from "../utils/logger";

/**
 * Centralized error handler — must be the LAST middleware registered in app.ts.
 *
 * Priority of handling:
 *   1. AppError               → known operational error → use its statusCode
 *   2. ZodError               → validation failed → 400
 *   3. UnsupportedLanguageError → invalid language → 400
 *   4. Unknown err            → 500 + log full stack (programmer mistake)
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── 1. Operational AppError ─────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Non-operational AppError", {
        message: err.message,
        stack: err.stack,
      });
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // ── 2. Zod validation error ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // ── 3. Unsupported language error ────────────────────────────────────────────
  if (err instanceof UnsupportedLanguageError) {
    res.status(400).json({ error: err.message });
    return;
  }

  // ── 4. Unknown / programmer error ────────────────────────────────────────────
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
}
