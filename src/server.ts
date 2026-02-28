import "dotenv/config";
import app from "./app";
import { config } from "./config/Config";
import { logger } from "./utils/logger";
import { createShutdownHandler } from "./utils/ShutdownHandler";

/**
 * Server Bootstrap
 *
 * System Design Features:
 * - Graceful Shutdown: Properly cleanup on termination signals
 * - Connection Pooling: MongoDB with optimal pool settings
 * - Error Recovery: Startup failure handling
 * - Health Monitoring: Automatic health checks
 */

const PORT = config.port;
const USE_INMEM = config.useInMemoryDb;

async function bootstrap() {
  try {
    // ── Database Connection ─────────────────────────────────────────────────
    if (!USE_INMEM) {
      const mongoose = await import("mongoose");

      // Configure connection options for production
      await mongoose.default.connect(config.mongoUri, {
        maxPoolSize: config.mongoPoolSize,
        minPoolSize: Math.floor(config.mongoPoolSize / 2),
        connectTimeoutMS: config.mongoConnectTimeoutMs,
        serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
        // Automatically reconnect on connection loss
        retryWrites: true,
        retryReads: true,
      });

      logger.info("MongoDB connected", { 
        uri: config.mongoUri,
        poolSize: config.mongoPoolSize 
      });

      // Monitor MongoDB connection events
      mongoose.connection.on("error", (err) => {
        logger.error("MongoDB connection error", { error: err.message });
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
      });
    }

    // ── Start HTTP Server ───────────────────────────────────────────────────
    const server = app.listen(PORT, () => {
      logger.info("Server running", {
        port: PORT,
        url: `http://localhost:${PORT}`,
        mode: USE_INMEM ? "in-memory" : "MongoDB",
        environment: config.nodeEnv,
      });

      logger.info("API Endpoints:", {
        analyze: `http://localhost:${PORT}/api/v1/analyze`,
        submissions: `http://localhost:${PORT}/api/v1/submissions`,
        compare: `http://localhost:${PORT}/api/v1/compare`,
        health: `http://localhost:${PORT}/health`,
        metrics: `http://localhost:${PORT}/metrics`,
      });
    });

    // ── Setup Graceful Shutdown ─────────────────────────────────────────────
    const shutdownHandler = createShutdownHandler(server, USE_INMEM);

    // Add custom cleanup tasks if needed
    // shutdownHandler.addCleanupTask(async () => {
    //   logger.info("Performing custom cleanup...");
    // });

    logger.info("Graceful shutdown handler configured");

  } catch (err) {
    logger.error("Failed to start server", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  }
}

// ── Start Application ─────────────────────────────────────────────────────────
bootstrap().catch((err) => {
  logger.error("Bootstrap failed", { 
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
  process.exit(1);
});
