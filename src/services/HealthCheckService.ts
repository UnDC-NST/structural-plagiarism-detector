import mongoose from "mongoose";
import { logger } from "../utils/logger";

/**
 * HealthStatus — Overall health status
 */
export enum HealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
}

/**
 * ComponentHealth — Health status of individual component
 */
export interface ComponentHealth {
  status: HealthStatus;
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

/**
 * HealthCheckResult — Complete health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  components: Record<string, ComponentHealth>;
  metadata: {
    version: string;
    environment: string;
    hostname: string;
  };
}

/**
 * IHealthIndicator — Interface for health check components
 *
 * Strategy Pattern: Each component implements its own health check
 */
export interface IHealthIndicator {
  getName(): string;
  check(): Promise<ComponentHealth>;
}

/**
 * DatabaseHealthIndicator — Check MongoDB connection health
 */
export class DatabaseHealthIndicator implements IHealthIndicator {
  private readonly useInMemory: boolean;

  constructor(useInMemory = false) {
    this.useInMemory = useInMemory;
  }

  getName(): string {
    return "database";
  }

  async check(): Promise<ComponentHealth> {
    if (this.useInMemory) {
      return {
        status: HealthStatus.HEALTHY,
        message: "Using in-memory storage",
      };
    }

    const startTime = Date.now();

    try {
      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: "Database not connected",
          responseTime: Date.now() - startTime,
        };
      }

      // Ping database
      if (!mongoose.connection.db) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: "Database not initialized",
          responseTime: Date.now() - startTime,
        };
      }
      await mongoose.connection.db.admin().ping();

      return {
        status: HealthStatus.HEALTHY,
        message: "Database connection active",
        responseTime: Date.now() - startTime,
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name,
        },
      };
    } catch (error) {
      logger.error("Database health check failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: HealthStatus.UNHEALTHY,
        message: error instanceof Error ? error.message : "Database check failed",
        responseTime: Date.now() - startTime,
      };
    }
  }
}

/**
 * MemoryHealthIndicator — Check memory usage
 */
export class MemoryHealthIndicator implements IHealthIndicator {
  private readonly thresholdPercent: number;

  constructor(thresholdPercent = 90) {
    this.thresholdPercent = thresholdPercent;
  }

  getName(): string {
    return "memory";
  }

  async check(): Promise<ComponentHealth> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const usagePercent = (usedMem / totalMem) * 100;

    const status =
      usagePercent >= this.thresholdPercent
        ? HealthStatus.UNHEALTHY
        : usagePercent >= 75
        ? HealthStatus.DEGRADED
        : HealthStatus.HEALTHY;

    return {
      status,
      message: `Memory usage at ${usagePercent.toFixed(2)}%`,
      details: {
        heapUsed: Math.round(usedMem / 1024 / 1024) + " MB",
        heapTotal: Math.round(totalMem / 1024 / 1024) + " MB",
        external: Math.round(memUsage.external / 1024 / 1024) + " MB",
        rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
        usagePercent: usagePercent.toFixed(2) + "%",
      },
    };
  }
}

/**
 * DiskHealthIndicator — Check available disk space
 */
export class DiskHealthIndicator implements IHealthIndicator {
  getName(): string {
    return "disk";
  }

  async check(): Promise<ComponentHealth> {
    // Note: In production, use a library like 'diskusage' or 'node-df'
    // For now, return a basic check
    return {
      status: HealthStatus.HEALTHY,
      message: "Disk space check not implemented (requires native bindings)",
    };
  }
}

/**
 * HealthCheckService — Aggregates all health indicators
 *
 * Design Principles:
 * - Composite Pattern: Aggregates multiple health indicators
 * - Async/Parallel: Runs all checks concurrently for speed
 * - Observable: Provides detailed health information
 */
export class HealthCheckService {
  private readonly indicators: IHealthIndicator[] = [];
  private readonly startTime = Date.now();

  constructor() {
    // Register default indicators
    // Will be initialized with proper config in container
  }

  /**
   * Register a health indicator
   */
  public registerIndicator(indicator: IHealthIndicator): void {
    this.indicators.push(indicator);
  }

  /**
   * Perform health check on all components
   */
  public async check(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Run all health checks in parallel
    const checks = await Promise.all(
      this.indicators.map(async (indicator) => {
        try {
          const result = await indicator.check();
          return { name: indicator.getName(), result };
        } catch (error) {
          logger.error("Health indicator failed", {
            indicator: indicator.getName(),
            error: error instanceof Error ? error.message : String(error),
          });

          return {
            name: indicator.getName(),
            result: {
              status: HealthStatus.UNHEALTHY,
              message: "Health check threw exception",
            } as ComponentHealth,
          };
        }
      })
    );

    // Aggregate results
    const components: Record<string, ComponentHealth> = {};
    let overallStatus = HealthStatus.HEALTHY;

    for (const { name, result } of checks) {
      components[name] = result;

      // Downgrade overall status if any component is unhealthy
      if (result.status === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (
        result.status === HealthStatus.DEGRADED &&
        overallStatus !== HealthStatus.UNHEALTHY
      ) {
        overallStatus = HealthStatus.DEGRADED;
      }
    }

    return {
      status: overallStatus,
      timestamp,
      uptime,
      components,
      metadata: {
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        hostname: require("os").hostname(),
      },
    };
  }

  /**
   * Quick liveness check (lightweight)
   */
  public async liveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: "alive",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness check (can accept traffic)
   */
  public async readiness(): Promise<{ status: string; ready: boolean }> {
    const health = await this.check();
    const ready = health.status !== HealthStatus.UNHEALTHY;

    return {
      status: health.status,
      ready,
    };
  }
}
