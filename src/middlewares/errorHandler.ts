import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { UnsupportedLanguageError } from "../services/ParserService";
import { logger } from "../utils/logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  
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

  
  if (err instanceof UnsupportedLanguageError) {
    res.status(400).json({ error: err.message });
    return;
  }

  
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
}
