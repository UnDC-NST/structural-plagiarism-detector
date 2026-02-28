import { Request, Response, NextFunction } from "express";
import { MetricsService } from "../services/MetricsService";

export function createMetricsMiddleware(
  metricsService: MetricsService
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    
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
