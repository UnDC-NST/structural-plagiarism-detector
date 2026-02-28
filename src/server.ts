import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 3000;
const USE_INMEM = process.env.USE_IN_MEMORY_DB === "true";

async function bootstrap() {
  if (!USE_INMEM) {
    // Only import + connect Mongoose when NOT in in-memory mode
    const mongoose = await import("mongoose");
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/plagiarism-detector";
    await mongoose.default.connect(MONGO_URI);
    console.log("✅ MongoDB connected:", MONGO_URI);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`   Mode: ${USE_INMEM ? "in-memory (no MongoDB)" : "MongoDB"}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
