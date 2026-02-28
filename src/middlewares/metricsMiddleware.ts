import { Request, Response, NextFunction } from "express";
import { MetricsService } from "../services/MetricsService";

/**
 * metricsMiddleware — Automatically track request metrics
 *
 * Design Principles:
 * - Transparent: No impact on application logic
 * - Low Overhead: Minimal performance cost
 * - Comprehensive: Track all requests
 */
export function createMetricsMiddleware(
  metricsService: MetricsService
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Track response
    res.on("finish", () => {
      const duration = Date.now() - startTime;

      metricsService.recordRequest(
        req.method,
        req.path,
        res.statusCode,
        duration
      );
    });

    next();
  };
}
