import helmet from "helmet";
import { Express } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";

/**
 * configureSecurity — Apply security middleware and headers
 *
 * Security Features:
 * - Helmet: Sets secure HTTP headers
 * - CSP: Content Security Policy
 * - HSTS: HTTP Strict Transport Security
 * - X-Frame-Options: Prevent clickjacking
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - Referrer-Policy: Control referrer information
 *
 * Production Best Practices Applied:
 * - All security headers enabled
 * - CSP configured for API (no inline scripts)
 * - HSTS with long max-age
 * - DNS prefetch control disabled
 * - Hide X-Powered-By header
 */
export function configureSecurity(app: Express): void {
  logger.info("Configuring security middleware");

  // Apply Helmet with strict defaults
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // HTTP Strict Transport Security (HTTPS only)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // Prevent clickjacking
      frameguard: {
        action: "deny",
      },

      // Prevent MIME type sniffing
      noSniff: true,

      // Referrer policy
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // Disable DNS prefetch control
      dnsPrefetchControl: {
        allow: false,
      },

      // Don't allow IE to execute downloads in site's context
      ieNoOpen: true,

      // Prevent caching of sensitive data
      ...(config.nodeEnv === 'production' && {
        permittedCrossDomainPolicies: {
          permittedPolicies: "none",
        },
      }),
    })
  );

  // Additional security headers
  app.use((_req, res, next) => {
    // Prevent information disclosure
    res.removeHeader("X-Powered-By");

    // Additional security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );

    // Don't cache sensitive responses
    if (config.nodeEnv === 'production') {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    next();
  });

  logger.info("Security middleware configured", {
    environment: config.nodeEnv,
    hstsEnabled: true,
    cspEnabled: true,
  });
}
