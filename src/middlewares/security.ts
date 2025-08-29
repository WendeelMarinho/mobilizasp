import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

export function securityMiddlewares() {
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
  });

  return [
    helmet(),
    cors({ origin: '*', methods: ['GET', 'POST'] }),
    limiter
  ];
}
