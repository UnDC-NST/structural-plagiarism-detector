import { createHash } from "crypto";

/**
 * ICache — Generic cache interface for dependency inversion
 *
 * Design Principles:
 * - Strategy Pattern: Different cache implementations (Memory, Redis, etc.)
 * - Generic: Type-safe caching for any value type
 * - TTL Support: Automatic expiration
 */
export interface ICache<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
  has(key: string): Promise<boolean>;
}

/**
 * CacheEntry — Internal cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

/**
 * InMemoryCacheService — LRU cache with TTL support
 *
 * Design Principles:
 * - Singleton: One shared cache across the application
 * - LRU Eviction: Least Recently Used items removed first when full
 * - TTL Support: Automatic expiration of stale entries
 * - Thread-safe: Can handle concurrent operations
 * - Observable: Provides cache statistics
 *
 * Scalability:
 * - For multi-instance deployment, replace with Redis
 * - Current impl suitable for single-instance or read-heavy workloads
 */
export class InMemoryCacheService<T> implements ICache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTtlSeconds: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 1000, defaultTtlSeconds = 300) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  public async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update LRU: move to end
    this.cache.delete(key);
    entry.hits++;
    this.cache.set(key, entry);
    this.hits++;

    return entry.value;
  }

  public async set(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    // Evict if at capacity and key doesn't exist
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const now = Date.now();

    this.cache.set(key, {
      value,
      expiresAt: now + ttl * 1000,
      createdAt: now,
      hits: 0,
    });
  }

  public async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  public async size(): Promise<number> {
    // Clean expired entries first
    await this.cleanExpired();
    return this.cache.size;
  }

  public async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics for monitoring
   */
  public getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + "%",
    };
  }

  /**
   * Evict least recently used entry (first in Map)
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * Remove all expired entries (maintenance operation)
   */
  private async cleanExpired(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

/**
 * CacheKeyGenerator — Utility for generating consistent cache keys
 *
 * Design: Deterministic hash-based keys to ensure consistency
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for code analysis
   */
  public static forCodeAnalysis(code: string, language: string): string {
    const hash = createHash("sha256")
      .update(code)
      .update(language)
      .digest("hex")
      .substring(0, 16);
    return `analysis:${language}:${hash}`;
  }

  /**
   * Generate cache key for code comparison
   */
  public static forCodeComparison(
    codeA: string,
    codeB: string,
    language: string
  ): string {
    // Sort codes to make comparison symmetric (A→B === B→A)
    const [first, second] = [codeA, codeB].sort();
    const hash = createHash("sha256")
      .update(first)
      .update(second)
      .update(language)
      .digest("hex")
      .substring(0, 16);
    return `compare:${language}:${hash}`;
  }

  /**
   * Generate cache key for serialized code structure
   */
  public static forSerialization(code: string, language: string): string {
    const hash = createHash("sha256")
      .update(code)
      .update(language)
      .digest("hex")
      .substring(0, 16);
    return `serialized:${language}:${hash}`;
  }
}

/**
 * Factory function for cache service (enables easy swapping to Redis)
 */
export function createCacheService<T>(
  maxSize?: number,
  ttlSeconds?: number
): ICache<T> {
  // In production with multiple instances, replace with Redis:
  // return new RedisCacheService<T>(redisClient, ttlSeconds);
  return new InMemoryCacheService<T>(maxSize, ttlSeconds);
}
