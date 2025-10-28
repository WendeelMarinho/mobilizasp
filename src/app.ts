// src/app.ts

import express, { Express, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { logger } from './logger.js';
import { config } from './config.js';
import { securityMiddlewares } from './middlewares/security.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import { sptransRouter } from './routes/sptrans.routes.js';
import { whatsappRouter } from './routes/whatsapp.routes.js';
import { swaggerSpec } from './docs/openapi.js';
import { metrics } from './utils/metrics.js';

let mapsRouter: any;

// Conditionally load Google Maps routes
if (config.mapsEnabled) {
  try {
    const mapsModule = await import('./routes/maps.routes.js');
    mapsRouter = mapsModule.mapsRouter;
  } catch (err) {
    logger.warn({ err }, 'Failed to load Google Maps routes');
  }
}

export function createApp(): Express {
  return createAppInstance();
}

function createAppInstance(): Express {
  const app = express();

  // Trust proxy (for accurate IP addresses behind reverse proxy)
  app.set('trust proxy', 1);

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // HTTP logging with request ID
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existingId = (req as any).id || (req.headers['x-request-id'] as string | undefined);
        const id = existingId || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      }
    })
  );

  // Security middlewares
  app.use(securityMiddlewares());

  // Swagger documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MobilizaSP API Docs'
  }));

  // Health check
  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      service: 'MobilizaSP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'MobilizaSP' }));

  // API routes
  app.use('/api/v1/sptrans', sptransRouter);
  app.use('/api/v1/whatsapp', whatsappRouter);

  // Conditionally add Google Maps routes
  if (mapsRouter && config.mapsEnabled) {
    app.use('/api/v1/maps', mapsRouter);
    logger.info('Google Maps routes enabled');
  }

  // Metrics tracking middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const routeKey = `${req.method} ${req.path}`;
    
    res.on('finish', () => {
      const key = `${routeKey} ${res.statusCode}`;
      metrics.increment(key);
      metrics.increment(`total_requests`);
    });
    
    next();
  });

  // Expose metrics (deve vir antes do 404/error handler)
  app.get('/metrics', (_req, res) => {
    res.json(metrics.getAll());
  });

  // 404 handler (sempre antes do error handler)
  app.use(notFoundHandler);

  // Error handler (sempre por último)
  app.use(errorHandler);

  return app;
}

export const app = createAppInstance();

