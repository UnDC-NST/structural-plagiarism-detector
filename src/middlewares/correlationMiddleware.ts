import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";

export interface RequestContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  startTime: number;
  path: string;
  method: string;
}

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  
  const correlationId =
    (req.headers["x-correlation-id"] as string) || randomUUID();

  
  const requestId = randomUUID();

  
  req.context = {
    correlationId,
    requestId,
    startTime: Date.now(),
    path: req.path,
    method: req.method,
  };

  
  res.setHeader("X-Correlation-ID", correlationId);
  res.setHeader("X-Request-ID", requestId);

  
  logger.info("Request started", {
    correlationId,
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  
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

export class ContextLogger {
  
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
