/**
 * container.ts — Enhanced Dependency Injection Container
 *
 * System Design Features:
 * - Configuration Management: Type-safe config with validation
 * - Caching Layer: LRU cache with TTL for performance
 * - Health Monitoring: Comprehensive health checks
 * - Metrics Collection: Performance tracking
 * - Repository Pattern: Clean data access layer
 * - Circuit Breakers: Resiliency against failures
 *
 * Scalability:
 * - Stateless services: Can run multiple instances
 * - Caching: Reduces database load
 * - Connection pooling: via MongoDB driver
 * - For horizontal scaling: Replace in-memory cache with Redis
 */
import { config } from "./config/Config";
import { logger } from "./utils/logger";

// ── Core Services ─────────────────────────────────────────────────────────────
import { ParserService } from "./services/ParserService";
import { NormalizerService } from "./services/NormalizerService";
import { SerializerService } from "./services/SerializerService";
import { VectorizerService } from "./services/VectorizerService";
import { SimilarityService } from "./services/SimilarityService";

// ── Data Layer ────────────────────────────────────────────────────────────────
import { createSubmissionRepository } from "./repositories/SubmissionRepository";
import { SubmissionService } from "./services/SubmissionService";
import { EnhancedSubmissionService } from "./services/EnhancedSubmissionService";

// ── Infrastructure ────────────────────────────────────────────────────────────
import { createCacheService } from "./services/CacheService";
import { MetricsService } from "./services/MetricsService";
import {
  HealthCheckService,
  DatabaseHealthIndicator,
  MemoryHealthIndicator,
} from "./services/HealthCheckService";

// ── Controllers ───────────────────────────────────────────────────────────────
import { AnalyzeController } from "./controllers/AnalyzeController";
import { SubmissionController } from "./controllers/SubmissionController";
import { CompareController } from "./controllers/CompareController";
import { MonitoringController } from "./controllers/MonitoringController";
import { OrganizationController } from "./controllers/OrganizationController";

// ── Services ──────────────────────────────────────────────────────────────────
import { OrganizationService } from "./services/OrganizationService";

import { ISubmissionService } from "./types";

// ── Configuration ─────────────────────────────────────────────────────────────
const useInMemory = config.useInMemoryDb;

if (useInMemory) {
  logger.info("Running with in-memory store (no MongoDB required)");
} else {
  logger.info("Running with MongoDB", { uri: config.mongoUri });
}

// ── Core Service Singletons ───────────────────────────────────────────────────
const parser = ParserService.getInstance(); // Singleton Tree-sitter parser
const normalizer = new NormalizerService();
const serializer = new SerializerService();
const vectorizer = new VectorizerService();
const similarity = new SimilarityService();

// ── Infrastructure Services ───────────────────────────────────────────────────
export const metricsService = MetricsService.getInstance();

// Cache (LRU with TTL)
const cache = config.cacheEnabled
  ? createCacheService<string>(config.cacheMaxSize, config.cacheTtlSeconds)
  : undefined;

if (cache) {
  logger.info("Cache enabled", {
    maxSize: config.cacheMaxSize,
    ttl: config.cacheTtlSeconds + "s",
  });
}

// Repository Pattern for Data Access
const repository = createSubmissionRepository(useInMemory);

// Enhanced Submission Service with caching
const submissions: ISubmissionService = new EnhancedSubmissionService(
  repository,
  parser,
  normalizer,
  serializer,
  cache,
  metricsService
);

// Legacy submission service for backward compatibility
// Can be removed once all code uses EnhancedSubmissionService
// export const legacySubmissions: ISubmissionService = useInMemory
//   ? new InMemorySubmissionService()
//   : new SubmissionService();

// ── Health Check Service ──────────────────────────────────────────────────────
export const healthCheckService = new HealthCheckService();

// Register health indicators
healthCheckService.registerIndicator(new DatabaseHealthIndicator(useInMemory));
healthCheckService.registerIndicator(new MemoryHealthIndicator(90));

logger.info("Health check service initialized");

// ── Organization Service ──────────────────────────────────────────────────────
export const organizationService = new OrganizationService();

// ── API Controllers (depend on interfaces only) ───────────────────────────────
export const analyzeController = new AnalyzeController(
  parser,
  normalizer,
  serializer,
  vectorizer,
  similarity,
  submissions,
  organizationService
);

export const submissionController = new SubmissionController(
  parser,
  normalizer,
  serializer,
  submissions,
  organizationService
);

export const compareController = new CompareController(
  parser,
  normalizer,
  serializer,
  vectorizer,
  similarity,
  organizationService
);

// ── Monitoring Controller ─────────────────────────────────────────────────────
export const monitoringController = new MonitoringController(
  healthCheckService,
  metricsService,
  cache
);

// ── Organization Controller ───────────────────────────────────────────────────
export const organizationController = new OrganizationController(
  organizationService
);

logger.info("Dependency injection container initialized");
