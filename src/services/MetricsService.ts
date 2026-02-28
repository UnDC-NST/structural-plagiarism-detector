
export class MetricsService {
  private static instance: MetricsService;

  
  private requestCounts: Map<string, number> = new Map();
  private requestDurations: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();

  
  private cacheHits = 0;
  private cacheMisses = 0;
  private dbQueryCount = 0;
  private dbQueryDurations: number[] = [];

  
  private startTime = Date.now();

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  
  public recordRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    const key = `${method} ${path}`;

    
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    
    if (!this.requestDurations.has(key)) {
      this.requestDurations.set(key, []);
    }
    this.requestDurations.get(key)!.push(duration);

    
    if (statusCode >= 400) {
      const errorKey = `${method} ${path} ${statusCode}`;
      this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }

    
    const durations = this.requestDurations.get(key)!;
    if (durations.length > 1000) {
      durations.shift();
    }
  }

  
  public recordCacheHit(): void {
    this.cacheHits++;
  }

  
  public recordCacheMiss(): void {
    this.cacheMisses++;
  }

  
  public recordDbQuery(duration: number): void {
    this.dbQueryCount++;
    this.dbQueryDurations.push(duration);

    
    if (this.dbQueryDurations.length > 1000) {
      this.dbQueryDurations.shift();
    }
  }

  
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  
  public getEndpointMetrics(method: string, path: string) {
    const key = `${method} ${path}`;
    const durations = this.requestDurations.get(key) || [];

    return {
      totalRequests: this.requestCounts.get(key) || 0,
      avgDuration: durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      p50: Math.round(this.calculatePercentile(durations, 50)),
      p95: Math.round(this.calculatePercentile(durations, 95)),
      p99: Math.round(this.calculatePercentile(durations, 99)),
    };
  }

  
  public getAllMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const totalRequests = Array.from(this.requestCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate =
      totalCacheRequests > 0
        ? ((this.cacheHits / totalCacheRequests) * 100).toFixed(2)
        : "0.00";

    
    const avgDbQueryTime =
      this.dbQueryDurations.length > 0
        ? Math.round(
            this.dbQueryDurations.reduce((a, b) => a + b, 0) /
              this.dbQueryDurations.length
          )
        : 0;

    
    const endpoints: Record<string, unknown> = {};
    for (const [key] of this.requestCounts) {
      const [method, ...pathParts] = key.split(" ");
      const path = pathParts.join(" ");
      endpoints[key] = this.getEndpointMetrics(method, path);
    }

    return {
      uptime: `${uptime}s`,
      requests: {
        total: totalRequests,
        errors: totalErrors,
        errorRate:
          totalRequests > 0
            ? ((totalErrors / totalRequests) * 100).toFixed(2) + "%"
            : "0.00%",
        byEndpoint: endpoints,
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: cacheHitRate + "%",
      },
      database: {
        queries: this.dbQueryCount,
        avgQueryTime: avgDbQueryTime + "ms",
        p95QueryTime:
          Math.round(this.calculatePercentile(this.dbQueryDurations, 95)) + "ms",
      },
      memory: {
        heapUsed:
          Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        heapTotal:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
        external:
          Math.round(process.memoryUsage().external / 1024 / 1024) + " MB",
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
      },
    };
  }

  
  public reset(): void {
    this.requestCounts.clear();
    this.requestDurations.clear();
    this.errorCounts.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.dbQueryCount = 0;
    this.dbQueryDurations = [];
  }

  
  public exportPrometheus(): string {
    const lines: string[] = [];

    
    lines.push("# HELP http_requests_total Total HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    for (const [key, count] of this.requestCounts) {
      const [method, ...pathParts] = key.split(" ");
      const path = pathParts.join(" ");
      lines.push(
        `http_requests_total{method="${method}",path="${path}"} ${count}`
      );
    }

    
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const hitRate =
      totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0;
    lines.push("# HELP cache_hit_rate Cache hit rate");
    lines.push("# TYPE cache_hit_rate gauge");
    lines.push(`cache_hit_rate ${hitRate.toFixed(4)}`);

    return lines.join("\n");
  }
}

export function createMetricsService(): MetricsService {
  return MetricsService.getInstance();
}
