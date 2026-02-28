import { logger } from "../utils/logger";

/**
 * CircuitBreakerState — FSM states for circuit breaker
 */
export enum CircuitBreakerState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Failing, reject requests immediately
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * CircuitBreakerError — Thrown when circuit is open
 */
export class CircuitBreakerError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker is OPEN for ${serviceName}. Service temporarily unavailable.`);
    this.name = "CircuitBreakerError";
  }
}

/**
 * CircuitBreakerOptions — Configuration for circuit breaker
 */
export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Successful calls in HALF_OPEN before closing
  timeout: number; // Time in ms before trying HALF_OPEN
  monitoringPeriod: number; // Time window for counting failures (ms)
}

/**
 * CircuitBreaker — Implements Circuit Breaker pattern
 *
 * Design Principles:
 * - Fail Fast: Don't wait for timeout when service is down
 * - Self-Healing: Automatically retry after timeout period
 * - Observable: Provides state and metrics
 *
 * State Transitions:
 * CLOSED → OPEN: When failure threshold reached
 * OPEN → HALF_OPEN: After timeout period
 * HALF_OPEN → CLOSED: After success threshold met
 * HALF_OPEN → OPEN: On any failure
 *
 * Use Cases:
 * - Database connection failures
 * - External API calls
 * - Any operation that might hang or fail repeatedly
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  private readonly serviceName: string;
  private readonly options: CircuitBreakerOptions;

  // Default configuration
  private static readonly DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
  };

  constructor(serviceName: string, options?: Partial<CircuitBreakerOptions>) {
    this.serviceName = serviceName;
    this.options = { ...CircuitBreaker.DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt the call
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

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handle failed execution
   */
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

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) return false;
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.timeout;
    this.successCount = 0;

    logger.error(`Circuit breaker opened for ${this.serviceName}`, {
      failureCount: this.failureCount,
      nextAttemptTime: new Date(this.nextAttemptTime).toISOString(),
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;

    logger.info(`Circuit breaker half-open for ${this.serviceName}`, {
      message: "Testing if service recovered",
    });
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;

    logger.info(`Circuit breaker closed for ${this.serviceName}`, {
      message: "Service recovered, normal operation resumed",
    });
  }

  /**
   * Get current state (for monitoring)
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get metrics (for monitoring)
   */
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

  /**
   * Manually reset circuit breaker (for admin operations)
   */
  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    logger.info(`Circuit breaker manually reset for ${this.serviceName}`);
  }
}

/**
 * CircuitBreakerRegistry — Manages multiple circuit breakers
 *
 * Singleton pattern for centralized circuit breaker management
 */
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

  /**
   * Get or create circuit breaker for a service
   */
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

  /**
   * Get all circuit breakers (for monitoring dashboard)
   */
  public getAllMetrics() {
    const metrics: Record<string, ReturnType<CircuitBreaker["getMetrics"]>> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }

    return metrics;
  }

  /**
   * Reset all circuit breakers (for admin operations)
   */
  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
