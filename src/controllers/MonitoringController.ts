import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { HealthCheckService } from "../services/HealthCheckService";
import { MetricsService } from "../services/MetricsService";
import { CircuitBreakerRegistry } from "../utils/CircuitBreaker";
import { ICache } from "../services/CacheService";

export class MonitoringController {
  constructor(
    private readonly healthService: HealthCheckService,
    private readonly metricsService: MetricsService,
    private readonly cache?: ICache<unknown>
  ) {}

  
  public readonly health = asyncHandler(
    async (_req: Request, res: Response) => {
      const health = await this.healthService.check();
      const statusCode = health.status === "unhealthy" ? 503 : 200;
      res.status(statusCode).json(health);
    }
  );

  
  public readonly liveness = asyncHandler(
    async (_req: Request, res: Response) => {
      const result = await this.healthService.liveness();
      res.status(200).json(result);
    }
  );

  
  public readonly readiness = asyncHandler(
    async (_req: Request, res: Response) => {
      const result = await this.healthService.readiness();
      const statusCode = result.ready ? 200 : 503;
      res.status(statusCode).json(result);
    }
  );

  public readonly metrics = asyncHandler(
    async (_req: Request, res: Response) => {
      const metrics = this.metricsService.getAllMetrics();
      res.status(200).json(metrics);
    }
  );

  
  public readonly prometheusMetrics = asyncHandler(
    async (_req: Request, res: Response) => {
      const metrics = this.metricsService.exportPrometheus();
      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(metrics);
    }
  );

  
  public readonly circuitBreakers = asyncHandler(
    async (_req: Request, res: Response) => {
      const registry = CircuitBreakerRegistry.getInstance();
      const metrics = registry.getAllMetrics();
      res.status(200).json(metrics);
    }
  );

  
  public readonly cacheStats = asyncHandler(
    async (_req: Request, res: Response) => {
      if (!this.cache) {
        res.status(200).json({ enabled: false });
        return;
      }

      
      const stats =
        "getStats" in this.cache
          ? (this.cache as { getStats: () => unknown }).getStats()
          : { size: await this.cache.size() };

      res.status(200).json({
        enabled: true,
        ...(typeof stats === 'object' && stats !== null ? stats : {}),
      });
    }
  );
}
