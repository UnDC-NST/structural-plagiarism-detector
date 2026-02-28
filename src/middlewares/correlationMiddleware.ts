import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";

/**
 * Request Context — Stores request-scoped data
 *
 * Design: Async Local Storage pattern for request tracing
 */
export interface RequestContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  startTime: number;
  path: string;
  method: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

/**
 * correlationMiddleware — Tracks requests with correlation IDs
 *
 * Design Principles:
 * - Traceability: Track requests across services
 * - Debugging: Easy log correlation
 * - Performance: Track request duration
 *
 * Headers:
 * - X-Correlation-ID: Traces request across multiple services
 * - X-Request-ID: Unique ID for this specific request
 */
export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get or create correlation ID (from upstream service or new)
  const correlationId =
    (req.headers["x-correlation-id"] as string) || randomUUID();

  // Always create new request ID
  const requestId = randomUUID();

  // Create request context
  req.context = {
    correlationId,
    requestId,
    startTime: Date.now(),
    path: req.path,
    method: req.method,
  };

  // Add headers to response for downstream services
  res.setHeader("X-Correlation-ID", correlationId);
  res.setHeader("X-Request-ID", requestId);

  // Log request start
  logger.info("Request started", {
    correlationId,
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // Track response
  res.on("finish", () => {
    const duration = Date.now() - req.context!.startTime;

    logger.info("Request completed", {
      correlationId,
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

/**
 * ContextLogger — Logger with automatic context injection
 *
 * Design: Decorator pattern around base logger
 */
export class ContextLogger {
  /**
   * Log with automatic correlation ID injection
   */
  public static info(
    message: string,
    meta: Record<string, unknown> = {},
    context?: RequestContext
  ): void {
    logger.info(message, {
      ...meta,
      ...(context && {
        correlationId: context.correlationId,
        requestId: context.requestId,
      }),
    });
  }

  public static error(
    message: string,
    meta: Record<string, unknown> = {},
    context?: RequestContext
  ): void {
    logger.error(message, {
      ...meta,
      ...(context && {
        correlationId: context.correlationId,
        requestId: context.requestId,
      }),
    });
  }

  public static warn(
    message: string,
    meta: Record<string, unknown> = {},
    context?: RequestContext
  ): void {
    logger.warn(message, {
      ...meta,
      ...(context && {
        correlationId: context.correlationId,
        requestId: context.requestId,
      }),
    });
  }

  public static debug(
    message: string,
    meta: Record<string, unknown> = {},
    context?: RequestContext
  ): void {
    logger.debug(message, {
      ...meta,
      ...(context && {
        correlationId: context.correlationId,
        requestId: context.requestId,
      }),
    });
  }
}
