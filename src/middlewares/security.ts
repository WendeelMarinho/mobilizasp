import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

export function securityMiddlewares() {
  const limiter = rateLimit({
    windowMs: 60_000, // 1 minute
    max: config.rateLimit.rps * 60, // Convert RPS to max requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: 'Too many requests, please try again later.'
    }
  });

  return [
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        }
      }
    }),
    cors({ origin: '*', methods: ['GET', 'POST'] }),
    limiter
  ];
}
