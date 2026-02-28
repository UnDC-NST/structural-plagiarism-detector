import { Submission, ISubmission } from "../models/Submission";
import { CircuitBreaker, CircuitBreakerRegistry } from "../utils/CircuitBreaker";
import { MetricsService } from "../services/MetricsService";
import { logger } from "../utils/logger";

export interface ISubmissionRepository {
  create(data: {
    rawCode: string;
    serializedStructure: string;
    language: string;
    organizationId?: string;
  }): Promise<string>;

  findById(id: string): Promise<ISubmission | null>;

  findByLanguage(
    language: string,
    options?: { limit?: number; skip?: number }
  ): Promise<ISubmission[]>;

  findByLanguageAndOrg(
    language: string,
    organizationId: string,
    options?: { limit?: number; skip?: number }
  ): Promise<ISubmission[]>;

  count(language?: string): Promise<number>;

  delete(id: string): Promise<boolean>;

  exists(id: string): Promise<boolean>;
}

export class MongoSubmissionRepository implements ISubmissionRepository {
  private readonly circuitBreaker: CircuitBreaker;
  private readonly metrics: MetricsService;

  constructor() {
    const registry = CircuitBreakerRegistry.getInstance();
    this.circuitBreaker = registry.getBreaker("mongodb", {
      failureThreshold: 5,
      timeout: 60000,
    });
    this.metrics = MetricsService.getInstance();
  }

  
  public async create(data: {
    rawCode: string;
    serializedStructure: string;
    language: string;
    organizationId?: string;
  }): Promise<string> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const doc = await Submission.create(data);
        return doc._id.toString();
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to create submission", {
        error: error instanceof Error ? error.message : String(error),
        language: data.language,
      });
      throw error;
    }
  }

  
  public async findById(id: string): Promise<ISubmission | null> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await Submission.findById(id).lean<ISubmission>();
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to find submission", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  
  public async findByLanguage(
    language: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<ISubmission[]> {
    const startTime = Date.now();
    const { limit = 100, skip = 0 } = options;

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await Submission.find({ language })
          .limit(limit)
          .skip(skip)
          .sort({ createdAt: -1 })
          .lean<ISubmission[]>();
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to find submissions by language", {
        error: error instanceof Error ? error.message : String(error),
        language,
      });
      throw error;
    }
  }

  
  public async findByLanguageAndOrg(
    language: string,
    organizationId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<ISubmission[]> {
    const startTime = Date.now();
    const { limit = 100, skip = 0 } = options;

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await Submission.find({ language, organizationId })
          .limit(limit)
          .skip(skip)
          .sort({ createdAt: -1 })
          .lean<ISubmission[]>();
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to find submissions by language and organization", {
        error: error instanceof Error ? error.message : String(error),
        language,
        organizationId,
      });
      throw error;
    }
  }

  
  public async count(language?: string): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const filter = language ? { language } : {};
        return await Submission.countDocuments(filter);
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to count submissions", {
        error: error instanceof Error ? error.message : String(error),
        language,
      });
      throw error;
    }
  }

  
  public async delete(id: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const deleteResult = await Submission.deleteOne({ _id: id });
        return deleteResult.deletedCount > 0;
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to delete submission", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  
  public async exists(id: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        const count = await Submission.countDocuments({ _id: id });
        return count > 0;
      });

      this.metrics.recordDbQuery(Date.now() - startTime);
      return result;
    } catch (error) {
      logger.error("Failed to check submission existence", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }
}

export class InMemorySubmissionRepository implements ISubmissionRepository {
  private store = new Map<
    string,
    {
      _id: string;
      rawCode: string;
      serializedStructure: string;
      language: string;
      createdAt: Date;
    }
  >();
  private idCounter = 1;

  public async create(data: {
    rawCode: string;
    serializedStructure: string;
    language: string;
    organizationId?: string;
  }): Promise<string> {
    const id = `submission_${this.idCounter++}`;
    const { organizationId, ...restData } = data;
    this.store.set(id, {
      _id: id,
      ...restData,
      createdAt: new Date(),
    });
    return id;
  }

  public async findById(id: string): Promise<ISubmission | null> {
    const doc = this.store.get(id);
    return doc ? (doc as unknown as ISubmission) : null;
  }

  public async findByLanguage(
    language: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<ISubmission[]> {
    const { limit = 100, skip = 0 } = options;
    const results: ISubmission[] = [];

    let index = 0;
    for (const doc of this.store.values()) {
      if (doc.language === language) {
        if (index >= skip && results.length < limit) {
          results.push(doc as unknown as ISubmission);
        }
        index++;
      }
    }

    return results;
  }

  
  public async findByLanguageAndOrg(
    language: string,
    organizationId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<ISubmission[]> {
    
    return this.findByLanguage(language, options);
  }

  public async count(language?: string): Promise<number> {
    if (!language) {
      return this.store.size;
    }

    let count = 0;
    for (const doc of this.store.values()) {
      if (doc.language === language) {
        count++;
      }
    }
    return count;
  }

  public async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  public async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  
  public clear(): void {
    this.store.clear();
    this.idCounter = 1;
  }
}

export function createSubmissionRepository(
  useInMemory = false
): ISubmissionRepository {
  return useInMemory
    ? new InMemorySubmissionRepository()
    : new MongoSubmissionRepository();
}
