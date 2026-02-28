import { Server } from "http";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

export class ShutdownHandler {
  private isShuttingDown = false;
  private readonly shutdownTimeout: number;
  private readonly cleanupTasks: Array<() => Promise<void>> = [];

  constructor(shutdownTimeout = 30000) {
    
    this.shutdownTimeout = shutdownTimeout;
  }

  
  public registerServer(server: Server): void {
    this.addCleanupTask(async () => {
      logger.info("Closing HTTP server");

      return new Promise<void>((resolve, reject) => {
        
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

  
  public registerDatabase(): void {
    this.addCleanupTask(async () => {
      if (mongoose.connection.readyState !== 0) {
        logger.info("Closing database connection");

        await mongoose.connection.close();
        logger.info("Database connection closed");
      }
    });
  }

  
  public addCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  
  public setupSignalHandlers(): void {
    
    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM signal");
      this.shutdown();
    });

    
    process.on("SIGINT", () => {
      logger.info("Received SIGINT signal");
      this.shutdown();
    });

    
    process.once("SIGUSR2", () => {
      logger.info("Received SIGUSR2 signal (nodemon restart)");
      this.shutdown().then(() => {
        process.kill(process.pid, "SIGUSR2");
      });
    });

    
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Promise Rejection", {
        reason: String(reason),
        promise: String(promise),
      });
      
      
    });

    
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        message: error.message,
        stack: error.stack,
      });
      
      this.shutdown(1);
    });
  }

  
  public async shutdown(exitCode = 0): Promise<void> {
    
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    logger.info("Starting graceful shutdown", {
      timeout: `${this.shutdownTimeout}ms`,
    });

    
    const forceExitTimer = setTimeout(() => {
      logger.error("Graceful shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      
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

  
  public isShutdown(): boolean {
    return this.isShuttingDown;
  }
}

export function createShutdownHandler(
  server: Server,
  useInMemoryDb = false
): ShutdownHandler {
  const handler = new ShutdownHandler(30000);

  
  handler.registerServer(server);

  
  if (!useInMemoryDb) {
    handler.registerDatabase();
  }

  
  handler.setupSignalHandlers();

  return handler;
}
