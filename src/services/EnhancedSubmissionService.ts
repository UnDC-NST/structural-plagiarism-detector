import {
  ISubmissionService,
  IParserService,
  INormalizerService,
  ISerializerService,
  CorpusEntry,
  SupportedLanguage,
} from "../types";
import { ISubmissionRepository } from "../repositories/SubmissionRepository";
import { ICache, CacheKeyGenerator } from "./CacheService";
import { MetricsService } from "./MetricsService";
import { logger } from "../utils/logger";

/**
 * EnhancedSubmissionService — Submission service with caching and metrics
 *
 * Design Principles:
 * - Caching: Reduce database load
 * - Metrics: Track performance
 * - Repository Pattern: Clean separation of data access
 * - DIP: Depends on abstractions (interfaces)
 *
 * Features:
 * - Cache serialized structures to avoid re-parsing
 * - Track cache hit rates
 * - Graceful degradation if cache fails
 */
export class EnhancedSubmissionService implements ISubmissionService {
  constructor(
    private readonly repository: ISubmissionRepository,
    private readonly parser: IParserService,
    private readonly normalizer: INormalizerService,
    private readonly serializer: ISerializerService,
    private readonly cache?: ICache<string>,
    private readonly metrics?: MetricsService
  ) {}

  /**
   * Save submission with caching
   */
  public async saveSubmission(
    rawCode: string,
    serialized: string,
    language: string,
    organizationId?: string,
  ): Promise<string> {
    try {
      // Save to database via repository
      const id = await this.repository.create({
        rawCode,
        serializedStructure: serialized,
        language,
        organizationId,
      });

      // Cache the serialized structure
      if (this.cache) {
        try {
          const cacheKey = CacheKeyGenerator.forSerialization(rawCode, language);
          await this.cache.set(cacheKey, serialized);
        } catch (error) {
          // Cache failure shouldn't break the operation
          logger.warn("Failed to cache submission", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return id;
    } catch (error) {
      logger.error("Failed to save submission", {
        error: error instanceof Error ? error.message : String(error),
        language,
      });
      throw error;
    }
  }

  /**
   * Get all serialized structures with caching
   */
  public async getAllSerialized(language: string): Promise<CorpusEntry[]> {
    try {
      // Try cache first
      const cacheKey = `corpus:${language}`;
      if (this.cache) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          this.metrics?.recordCacheHit();
          return JSON.parse(cached);
        }
        this.metrics?.recordCacheMiss();
      }

      // Fetch from database
      const submissions = await this.repository.findByLanguage(language);

      const corpus: CorpusEntry[] = submissions.map((sub) => ({
        id: sub._id.toString(),
        serialized: sub.serializedStructure,
      }));

      // Cache the result
      if (this.cache && corpus.length > 0) {
        try {
          await this.cache.set(cacheKey, JSON.stringify(corpus), 300); // 5 min TTL
        } catch (error) {
          logger.warn("Failed to cache corpus", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return corpus;
    } catch (error) {
      logger.error("Failed to get serialized submissions", {
        error: error instanceof Error ? error.message : String(error),
        language,
      });
      throw error;
    }
  }

  /**
   * Get all serialized structures for an organization with caching
   */
  public async getAllSerializedForOrg(
    language: string,
    organizationId: string
  ): Promise<CorpusEntry[]> {
    try {
      // Try cache first
      const cacheKey = `corpus:${language}:${organizationId}`;
      if (this.cache) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          this.metrics?.recordCacheHit();
          return JSON.parse(cached);
        }
        this.metrics?.recordCacheMiss();
      }

      // Fetch from database
      const submissions = await this.repository.findByLanguageAndOrg(language, organizationId);

      const corpus: CorpusEntry[] = submissions.map((sub) => ({
        id: sub._id.toString(),
        serialized: sub.serializedStructure,
      }));

      // Cache the result
      if (this.cache && corpus.length > 0) {
        try {
          await this.cache.set(cacheKey, JSON.stringify(corpus), 300); // 5 min TTL
        } catch (error) {
          logger.warn("Failed to cache organization corpus", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return corpus;
    } catch (error) {
      logger.error("Failed to get serialized submissions for organization", {
        error: error instanceof Error ? error.message : String(error),
        language,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Find submission by ID
   */
  public async findById(
    id: string
  ): Promise<{ _id: string; language: string; createdAt: Date } | null> {
    try {
      const submission = await this.repository.findById(id);

      if (!submission) {
        return null;
      }

      return {
        _id: submission._id.toString(),
        language: submission.language,
        createdAt: submission.createdAt!,
      };
    } catch (error) {
      logger.error("Failed to find submission", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Parse and serialize code with caching
   */
  public async parseAndSerialize(
    code: string,
    language: SupportedLanguage
  ): Promise<string> {
    // Check cache first
    if (this.cache) {
      const cacheKey = CacheKeyGenerator.forSerialization(code, language);
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        this.metrics?.recordCacheHit();
        return cached;
      }
      this.metrics?.recordCacheMiss();
    }

    // Parse and serialize
    const tree = this.parser.parse(code, language);
    const ir = this.normalizer.normalize(tree);
    const serialized = this.serializer.serialize(ir);

    // Cache the result
    if (this.cache) {
      try {
        const cacheKey = CacheKeyGenerator.forSerialization(code, language);
        await this.cache.set(cacheKey, serialized);
      } catch (error) {
        logger.warn("Failed to cache serialization", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return serialized;
  }
}
