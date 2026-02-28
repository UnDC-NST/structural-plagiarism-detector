import "dotenv/config";
import app from "./app";
import { config } from "./config/Config";
import { logger } from "./utils/logger";
import { createShutdownHandler } from "./utils/ShutdownHandler";

const PORT = config.port;
const USE_INMEM = config.useInMemoryDb;

async function bootstrap() {
  try {
    
    if (!USE_INMEM) {
      const mongoose = await import("mongoose");

      
      await mongoose.default.connect(config.mongoUri, {
        maxPoolSize: config.mongoPoolSize,
        minPoolSize: Math.floor(config.mongoPoolSize / 2),
        connectTimeoutMS: config.mongoConnectTimeoutMs,
        serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
        
        retryWrites: true,
        retryReads: true,
      });

      logger.info("MongoDB connected", { 
        uri: config.mongoUri,
        poolSize: config.mongoPoolSize 
      });

      
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

    
    const shutdownHandler = createShutdownHandler(server, USE_INMEM);

    
    
    
    

    logger.info("Graceful shutdown handler configured");

  } catch (err) {
    logger.error("Failed to start server", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  logger.error("Bootstrap failed", { 
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
  process.exit(1);
});
