
import { config } from "./config/Config";
import { logger } from "./utils/logger";

import { ParserService } from "./services/ParserService";
import { NormalizerService } from "./services/NormalizerService";
import { SerializerService } from "./services/SerializerService";
import { VectorizerService } from "./services/VectorizerService";
import { SimilarityService } from "./services/SimilarityService";

import { createSubmissionRepository } from "./repositories/SubmissionRepository";
import { SubmissionService } from "./services/SubmissionService";
import { EnhancedSubmissionService } from "./services/EnhancedSubmissionService";

import { createCacheService } from "./services/CacheService";
import { MetricsService } from "./services/MetricsService";
import {
  HealthCheckService,
  DatabaseHealthIndicator,
  MemoryHealthIndicator,
} from "./services/HealthCheckService";

import { AnalyzeController } from "./controllers/AnalyzeController";
import { SubmissionController } from "./controllers/SubmissionController";
import { CompareController } from "./controllers/CompareController";
import { MonitoringController } from "./controllers/MonitoringController";
import { OrganizationController } from "./controllers/OrganizationController";

import { OrganizationService } from "./services/OrganizationService";

import { ISubmissionService } from "./types";

const useInMemory = config.useInMemoryDb;

if (useInMemory) {
  logger.info("Running with in-memory store (no MongoDB required)");
} else {
  logger.info("Running with MongoDB", { uri: config.mongoUri });
}

const parser = ParserService.getInstance(); 
const normalizer = new NormalizerService();
const serializer = new SerializerService();
const vectorizer = new VectorizerService();
const similarity = new SimilarityService();

export const metricsService = MetricsService.getInstance();

const cache = config.cacheEnabled
  ? createCacheService<string>(config.cacheMaxSize, config.cacheTtlSeconds)
  : undefined;

if (cache) {
  logger.info("Cache enabled", {
    maxSize: config.cacheMaxSize,
    ttl: config.cacheTtlSeconds + "s",
  });
}

const repository = createSubmissionRepository(useInMemory);

const submissions: ISubmissionService = new EnhancedSubmissionService(
  repository,
  parser,
  normalizer,
  serializer,
  cache,
  metricsService
);

export const healthCheckService = new HealthCheckService();

healthCheckService.registerIndicator(new DatabaseHealthIndicator(useInMemory));
healthCheckService.registerIndicator(new MemoryHealthIndicator(90));

logger.info("Health check service initialized");

export const organizationService = new OrganizationService();

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

export const monitoringController = new MonitoringController(
  healthCheckService,
  metricsService,
  cache
);

export const organizationController = new OrganizationController(
  organizationService
);

logger.info("Dependency injection container initialized");
