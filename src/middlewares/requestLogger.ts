import morgan from "morgan";

// Use 'combined' in production for full Apache-style logs, 'dev' for local color output
export const requestLogger = morgan(
  process.env.NODE_ENV === "production" ? "combined" : "dev",
);
