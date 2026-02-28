/**
 * logger.ts — centralised structured logging utility.
 *
 * Uses the native console API so no extra dependencies are required.
 * In production, replace with Winston or Pino for JSON output + log aggregation
 * by swapping the implementations below without touching call sites.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const IS_PROD = process.env.NODE_ENV === "production";

function formatMessage(
  level: LogLevel,
  message: string,
  meta?: object,
): string {
  const ts = new Date().toISOString();
  if (IS_PROD) {
    // Structured JSON in production — works with Datadog, Papertrail, etc.
    return JSON.stringify({ level, message, timestamp: ts, ...meta });
  }
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  return `${prefix} ${message}${suffix}`;
}

export const logger = {
  debug(message: string, meta?: object): void {
    if (!IS_PROD) console.debug(formatMessage("debug", message, meta));
  },
  info(message: string, meta?: object): void {
    console.info(formatMessage("info", message, meta));
  },
  warn(message: string, meta?: object): void {
    console.warn(formatMessage("warn", message, meta));
  },
  error(message: string, meta?: object): void {
    console.error(formatMessage("error", message, meta));
  },
};
