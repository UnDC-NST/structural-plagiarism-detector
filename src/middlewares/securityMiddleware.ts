import helmet from "helmet";
import { Express } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";

export function configureSecurity(app: Express): void {
  logger.info("Configuring security middleware");

  
  app.use(
    helmet({
      
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

      
      hsts: {
        maxAge: 31536000, 
        includeSubDomains: true,
        preload: true,
      },

      
      frameguard: {
        action: "deny",
      },

      
      noSniff: true,

      
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },

      
      hidePoweredBy: true,

      
      dnsPrefetchControl: {
        allow: false,
      },

      
      ieNoOpen: true,

      
      ...(config.nodeEnv === 'production' && {
        permittedCrossDomainPolicies: {
          permittedPolicies: "none",
        },
      }),
    })
  );

  
  app.use((_req, res, next) => {
    
    res.removeHeader("X-Powered-By");

    
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );

    
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
