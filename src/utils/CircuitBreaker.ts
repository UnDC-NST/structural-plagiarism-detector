import { logger } from "../utils/logger";

export enum CircuitBreakerState {
  CLOSED = "CLOSED", 
  OPEN = "OPEN", 
  HALF_OPEN = "HALF_OPEN", 
}

export class CircuitBreakerError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker is OPEN for ${serviceName}. Service temporarily unavailable.`);
    this.name = "CircuitBreakerError";
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number; 
  successThreshold: number; 
  timeout: number; 
  monitoringPeriod: number; 
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  private readonly serviceName: string;
  private readonly options: CircuitBreakerOptions;

  
  private static readonly DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, 
    monitoringPeriod: 120000, 
  };

  constructor(serviceName: string, options?: Partial<CircuitBreakerOptions>) {
    this.serviceName = serviceName;
    this.options = { ...CircuitBreaker.DEFAULT_OPTIONS, ...options };
  }

  
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        logger.warn(`Circuit breaker OPEN for ${this.serviceName}`, {
          failureCount: this.failureCount,
          nextAttemptTime: this.nextAttemptTime,
        });
        throw new CircuitBreakerError(this.serviceName);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.options.failureThreshold
    ) {
      this.transitionToOpen();
    }
  }

  
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return false;
    return Date.now() >= this.nextAttemptTime;
  }

  
  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.timeout;
    this.successCount = 0;

    logger.error(`Circuit breaker opened for ${this.serviceName}`, {
      failureCount: this.failureCount,
      nextAttemptTime: new Date(this.nextAttemptTime).toISOString(),
    });
  }

  
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;

    logger.info(`Circuit breaker half-open for ${this.serviceName}`, {
      message: "Testing if service recovered",
    });
  }

  
  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;

    logger.info(`Circuit breaker closed for ${this.serviceName}`, {
      message: "Service recovered, normal operation resumed",
    });
  }

  
  public getState(): CircuitBreakerState {
    return this.state;
  }

  
  public getMetrics() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime).toISOString()
        : null,
      nextAttemptTime: this.nextAttemptTime
        ? new Date(this.nextAttemptTime).toISOString()
        : null,
    };
  }

  
  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    logger.info(`Circuit breaker manually reset for ${this.serviceName}`);
  }
}

export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  
  public getBreaker(
    serviceName: string,
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    let breaker = this.breakers.get(serviceName);

    if (!breaker) {
      breaker = new CircuitBreaker(serviceName, options);
      this.breakers.set(serviceName, breaker);
    }

    return breaker;
  }

  
  public getAllMetrics() {
    const metrics: Record<string, ReturnType<CircuitBreaker["getMetrics"]>> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }

    return metrics;
  }

  
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
