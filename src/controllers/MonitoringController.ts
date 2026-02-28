import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { HealthCheckService } from "../services/HealthCheckService";
import { MetricsService } from "../services/MetricsService";
import { CircuitBreakerRegistry } from "../utils/CircuitBreaker";
import { ICache } from "../services/CacheService";

/**
 * MonitoringController — Provides observability endpoints
 *
 * Design Principles:
 * - Observable: Expose health, metrics, and status
 * - Secure: Should be behind authentication in production
 * - Lightweight: Minimal overhead for health checks
 *
 * Endpoints:
 * - GET /health - Detailed health check
 * - GET /health/liveness - Kubernetes liveness probe
 * - GET /health/readiness - Kubernetes readiness probe
 * - GET /metrics - Application metrics
 * - GET /metrics/prometheus - Prometheus format metrics
 * - GET /circuit-breakers - Circuit breaker states
 * - GET /cache/stats - Cache statistics
 */
export class MonitoringController {
  constructor(
    private readonly healthService: HealthCheckService,
    private readonly metricsService: MetricsService,
    private readonly cache?: ICache<unknown>
  ) {}

  /**
   * GET /health - Comprehensive health check
   */
  public readonly health = asyncHandler(
    async (_req: Request, res: Response) => {
      const health = await this.healthService.check();
      const statusCode = health.status === "unhealthy" ? 503 : 200;
      res.status(statusCode).json(health);
    }
  );

  /**
   * GET /health/liveness - Kubernetes liveness probe
   */
  public readonly liveness = asyncHandler(
    async (_req: Request, res: Response) => {
      const result = await this.healthService.liveness();
      res.status(200).json(result);
    }
  );

  /**
   * GET /health/readiness - Kubernetes readiness probe
   */
  public readonly readiness = asyncHandler(
    async (_req: Request, res: Response) => {
      const result = await this.healthService.readiness();
      const statusCode = result.ready ? 200 : 503;
      res.status(statusCode).json(result);
    }
  );

/**
   * GET /metrics - Application metrics
   */
  public readonly metrics = asyncHandler(
    async (_req: Request, res: Response) => {
      const metrics = this.metricsService.getAllMetrics();
      res.status(200).json(metrics);
    }
  );

  /**
   * GET /metrics/prometheus - Prometheus format
   */
  public readonly prometheusMetrics = asyncHandler(
    async (_req: Request, res: Response) => {
      const metrics = this.metricsService.exportPrometheus();
      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(metrics);
    }
  );

  /**
   * GET /circuit-breakers - Circuit breaker states
   */
  public readonly circuitBreakers = asyncHandler(
    async (_req: Request, res: Response) => {
      const registry = CircuitBreakerRegistry.getInstance();
      const metrics = registry.getAllMetrics();
      res.status(200).json(metrics);
    }
  );

  /**
   * GET /cache/stats - Cache statistics
   */
  public readonly cacheStats = asyncHandler(
    async (_req: Request, res: Response) => {
      if (!this.cache) {
        res.status(200).json({ enabled: false });
        return;
      }

      // Type guard for InMemoryCacheService
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
