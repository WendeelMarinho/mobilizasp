import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { securityMiddlewares } from './middlewares/security.js';
import { sptransRouter } from './routes/sptrans.routes.js';
import { whatsappRouter } from './routes/whatsapp.routes.js';
import { startWhatsapp } from './services/whatsapp.service.js';

async function bootstrap() {
  const app = express();
  app.use(express.json());
  app.use(securityMiddlewares());

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'MobilizaSP' }));

  app.use('/api/v1/sptrans', sptransRouter);
  app.use('/api/v1/whatsapp', whatsappRouter);

  app.listen(config.port, () => {
    logger.info(`API rodando em http://localhost:${config.port}`);
  });

  startWhatsapp().catch((e) => {
    logger.error(e, 'Erro ao iniciar WhatsApp');
    process.exit(1);
  });
}

bootstrap();
