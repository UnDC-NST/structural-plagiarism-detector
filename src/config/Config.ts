import { z } from "zod";

const ConfigSchema = z.object({
  
  port: z.coerce.number().int().min(1).max(65535).default(3000),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  
  
  mongoUri: z.string().url().default("mongodb://localhost:27017/plagiarism-detector"),
  useInMemoryDb: z.coerce.boolean().default(false),
  
  
  mongoPoolSize: z.coerce.number().int().min(1).max(100).default(10),
  mongoConnectTimeoutMs: z.coerce.number().int().min(1000).default(10000),
  mongoServerSelectionTimeoutMs: z.coerce.number().int().min(1000).default(5000),
  
  
  apiKey: z.string().min(1, "API_KEY is required in production"),
  
  
  rateLimitWindowMs: z.coerce.number().int().min(1000).default(60_000), 
  rateLimitMaxRequests: z.coerce.number().int().min(1).default(100),
  
  
  allowedOrigins: z.string().transform(val => val.split(",")).default("http://localhost:3000"),
  
  
  cacheEnabled: z.coerce.boolean().default(true),
  cacheTtlSeconds: z.coerce.number().int().min(0).default(300), 
  cacheMaxSize: z.coerce.number().int().min(100).default(1000), 
  
  
  circuitBreakerThreshold: z.coerce.number().int().min(1).default(5), 
  circuitBreakerTimeout: z.coerce.number().int().min(1000).default(60000), 
  
  
  maxCodeSizeBytes: z.coerce.number().int().min(1000).default(50_000),
  
  
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  
  
  healthCheckInterval: z.coerce.number().int().min(5000).default(30000), 
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export class Config {
  private static instance: Config;
  private readonly config: Readonly<AppConfig>;

  private constructor() {
    try {
      
      this.config = Object.freeze(
        ConfigSchema.parse({
          port: process.env.PORT,
          nodeEnv: process.env.NODE_ENV,
          mongoUri: process.env.MONGO_URI,
          useInMemoryDb: process.env.USE_IN_MEMORY_DB,
          mongoPoolSize: process.env.MONGO_POOL_SIZE,
          mongoConnectTimeoutMs: process.env.MONGO_CONNECT_TIMEOUT_MS,
          mongoServerSelectionTimeoutMs: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
          apiKey: process.env.API_KEY,
          rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
          rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
          allowedOrigins: process.env.ALLOWED_ORIGINS,
          cacheEnabled: process.env.CACHE_ENABLED,
          cacheTtlSeconds: process.env.CACHE_TTL_SECONDS,
          cacheMaxSize: process.env.CACHE_MAX_SIZE,
          circuitBreakerThreshold: process.env.CIRCUIT_BREAKER_THRESHOLD,
          circuitBreakerTimeout: process.env.CIRCUIT_BREAKER_TIMEOUT,
          maxCodeSizeBytes: process.env.MAX_CODE_SIZE_BYTES,
          logLevel: process.env.LOG_LEVEL,
          healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL,
        })
      );

      
      if (this.config.nodeEnv === "production") {
        if (!process.env.API_KEY || process.env.API_KEY.length < 32) {
          throw new Error("Production requires API_KEY with at least 32 characters");
        }
        if (this.config.useInMemoryDb) {
          throw new Error("Production cannot use in-memory database");
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("\n");
        throw new Error(`Configuration validation failed:\n${errors}`);
      }
      throw err;
    }
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get(): Readonly<AppConfig> {
    return this.config;
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === "development";
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === "production";
  }

  public isTest(): boolean {
    return this.config.nodeEnv === "test";
  }
}

export const config = Config.getInstance().get();
