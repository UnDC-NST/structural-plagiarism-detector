import { Server } from "http";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

/**
 * ShutdownHandler — Graceful shutdown management
 *
 * Design Principles:
 * - Clean Shutdown: Close all connections properly
 * - No Data Loss: Wait for in-flight requests to complete
 * - Timeout: Don't wait forever, force kill if needed
 * - Observable: Log shutdown progress
 *
 * Handles signals:
 * - SIGTERM: Kubernetes/Docker container stop
 * - SIGINT: Ctrl+C in terminal
 * - SIGUSR2: Nodemon restart
 */
export class ShutdownHandler {
  private isShuttingDown = false;
  private readonly shutdownTimeout: number;
  private readonly cleanupTasks: Array<() => Promise<void>> = [];

  constructor(shutdownTimeout = 30000) {
    // 30 seconds default
    this.shutdownTimeout = shutdownTimeout;
  }

  /**
   * Register HTTP server for graceful shutdown
   */
  public registerServer(server: Server): void {
    this.addCleanupTask(async () => {
      logger.info("Closing HTTP server");

      return new Promise<void>((resolve, reject) => {
        // Stop accepting new connections
        server.close((err) => {
          if (err) {
            logger.error("Error closing HTTP server", { error: err.message });
            reject(err);
          } else {
            logger.info("HTTP server closed");
            resolve();
          }
        });
      });
    });
  }

  /**
   * Register MongoDB connection for cleanup
   */
  public registerDatabase(): void {
    this.addCleanupTask(async () => {
      if (mongoose.connection.readyState !== 0) {
        logger.info("Closing database connection");

        await mongoose.connection.close();
        logger.info("Database connection closed");
      }
    });
  }

  /**
   * Register custom cleanup task
   */
  public addCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Setup signal handlers
   */
  public setupSignalHandlers(): void {
    // Graceful shutdown on SIGTERM (Kubernetes, Docker)
    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM signal");
      this.shutdown();
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      logger.info("Received SIGINT signal");
      this.shutdown();
    });

    // Nodemon restart
    process.once("SIGUSR2", () => {
      logger.info("Received SIGUSR2 signal (nodemon restart)");
      this.shutdown().then(() => {
        process.kill(process.pid, "SIGUSR2");
      });
    });

    // Unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Promise Rejection", {
        reason: String(reason),
        promise: String(promise),
      });
      // In production, you might want to shutdown on unhandled rejections
      // this.shutdown(1);
    });

    // Uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        message: error.message,
        stack: error.stack,
      });
      // Always shutdown on uncaught exceptions
      this.shutdown(1);
    });
  }

  /**
   * Perform graceful shutdown
   */
  public async shutdown(exitCode = 0): Promise<void> {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    logger.info("Starting graceful shutdown", {
      timeout: `${this.shutdownTimeout}ms`,
    });

    // Set timeout to force exit
    const forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Run all cleanup tasks in sequence
      for (const task of this.cleanupTasks) {
        try {
          await task();
        } catch (error) {
          logger.error("Cleanup task failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info("Graceful shutdown completed");
      clearTimeout(forceExitTimer);
      process.exit(exitCode);
    } catch (error) {
      logger.error("Shutdown failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  public isShutdown(): boolean {
    return this.isShuttingDown;
  }
}

/**
 * Factory function to create and setup shutdown handler
 */
export function createShutdownHandler(
  server: Server,
  useInMemoryDb = false
): ShutdownHandler {
  const handler = new ShutdownHandler(30000);

  // Register server
  handler.registerServer(server);

  // Register database if not using in-memory
  if (!useInMemoryDb) {
    handler.registerDatabase();
  }

  // Setup signal handlers
  handler.setupSignalHandlers();

  return handler;
}
