import http from 'http';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';
import { app } from './app.js';
import { startWhatsApp } from './services/whatsapp.service.js';
import { handleIncomingText } from './services/intent.service.js';

let httpServer: http.Server | undefined;

async function safeStartWhatsApp() {
  let delay = 2000; // 2s
  const maxDelay = 60000; // 60s
  for (;;) {
    try {
      await startWhatsApp(async (from, text) => {
        logger.debug({ from, text }, 'Mensagem recebida');
        const reply = await handleIncomingText(from, text);
        return reply;
      });
      logger.info('WhatsApp inicializado (listener ativo).');
      return; // ok, para o loop
    } catch (err) {
      logger.error({ err }, 'Falha ao iniciar WhatsApp — novo retry em breve');
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, maxDelay); // backoff exponencial
    }
  }
}

async function bootstrap() {
  // Garante diretório da sessão WA
  const waDir = path.resolve(process.cwd(), config.whatsapp.sessionDir);
  try {
    fs.mkdirSync(waDir, { recursive: true });
  } catch (e) {
    logger.error({ waDir, e }, 'Não consegui criar a pasta da sessão do WhatsApp');
    process.exit(1);
  }

  // Sobe HTTP
  httpServer = http.createServer(app);
  httpServer.listen(config.port, () => {
    logger.info('API rodando em http://localhost:%d', config.port);
    logger.info('Health check: http://localhost:%d/healthz', config.port);
    if (config.maps.enabled) {
      logger.info('Google Maps habilitado');
    } else {
      logger.info('Google Maps disabled (no API key ou chave inválida/igual ao Gemini)');
    }
  });

  // Sobe WhatsApp com retry resiliente
  safeStartWhatsApp().catch((err) => 
    logger.error({ err }, 'Erro inesperado no safeStartWhatsApp')
  );
}

logger.info(
  { config: { port: config.port, mapsEnabled: config.mapsEnabled } },
  'Starting MobilizaSP server'
);

bootstrap().catch((err) => {
  logger.error({ err }, 'Falha fatal na inicialização');
  process.exit(1);
});

// Encerramento gracioso
async function shutdown(signal: string) {
  try {
    logger.warn({ signal }, 'Encerrando serviço...');
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
      logger.info('HTTP server fechado');
    }
    // TODO: encerrar conexões do WhatsApp quando expusermos um stopWhatsApp()
  } catch (e) {
    logger.error({ e }, 'Erro no shutdown');
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandledRejection');
  process.exit(1);
});
