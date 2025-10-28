// Baileys import (robusto p/ ESM/CJS)
import baileysDefault, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';

// Normaliza referência da factory (default ou named), evitando "not a function"
const makeWASocket = (typeof baileysDefault === 'function'
  ? baileysDefault
  : (baileysDefault as any)?.makeWASocket) as ReturnType<typeof import('@whiskeysockets/baileys')['default']>;
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { logger } from '../logger.js';

type OnTextMessage = (from: string, text: string) => Promise<string | void>;

/**
 * Inicializa a sessão do WhatsApp com:
 * - Impressão de QR Code no terminal
 * - Reconexão automática (exceto logout)
 * - Persistência em disco (WA_SESSION_DIR)
 */
export async function startWhatsApp(onTextMessage: OnTextMessage) {
  logger.info('[WA] Iniciando startWhatsApp...');
  
  const sessionDir = path.resolve(process.cwd(), config.whatsapp.sessionDir);
  logger.info({ sessionDir }, '[WA] Diretório de sessão');
  
  if (!fs.existsSync(sessionDir)) {
    logger.info('[WA] Criando diretório de sessão...');
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  logger.info('[WA] Carregando estado da sessão...');
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  
  logger.info('[WA] Buscando versão do Baileys...');
  let version: [number, number, number] | undefined;
  let isLatest = false;
  
  try {
    const result = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]) as any;
    version = result?.version;
    isLatest = result?.isLatest || false;
    logger.info({ version, isLatest }, '[WA] Versão obtida');
  } catch (e) {
    logger.warn({ e }, '[WA] Falha ao buscar versão, usando default');
    version = undefined;
  }

  logger.info(
    { version, isLatest, sessionDir },
    'Iniciando WhatsApp (Baileys)...'
  );

  let lastQrPrintedAt = 0;

  logger.info('[WA] Criando socket do WhatsApp...');
  
  // sanity check antes de usar
  if (typeof makeWASocket !== 'function') {
    const keys = Object.keys((baileysDefault as any) || {});
    throw new TypeError(
      `Baileys import inválido: makeWASocket ≠ function. Keys disponíveis: [${keys.join(', ')}]`
    );
  }
  
  const sock = makeWASocket({
    version,
    printQRInTerminal: false, // imprimiremos manualmente
    auth: state,
    browser: ['MobilizaSP', 'Chrome', '1.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    emitOwnEvents: false,
  });

  sock.ev.on('creds.update', saveCreds);

  logger.info('[WA] Registrando event listeners...');
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    logger.info({ connection, hasQR: !!qr, hasLastDisconnect: !!lastDisconnect }, '[WA] connection.update event');

    if (qr) {
      const now = Date.now();
      // evitar flood no watch mode
      if (now - lastQrPrintedAt > 1500) {
        lastQrPrintedAt = now;
        logger.info('QR Code recebido — escaneie com o WhatsApp em ~20s');
        try {
          qrcode.generate(qr, { small: true });
        } catch (e) {
          // fallback simples
          console.log('\n[QR RAW]\n', qr, '\n');
        }
      }
    }

    if (connection === 'open') {
      logger.info('✅ WhatsApp conectado.');
    } else if (connection === 'close') {
      const code =
        (lastDisconnect?.error as any)?.output?.statusCode ??
        (lastDisconnect?.error as any)?.code ??
        'unknown';

      const details = {
        statusCode: (lastDisconnect?.error as any)?.output?.statusCode,
        message: (lastDisconnect?.error as any)?.message,
        data: (lastDisconnect?.error as any)?.data,
      };

      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn({ code, details }, 'Conexão encerrada');

      if (code === DisconnectReason.loggedOut) {
        logger.error(
          'Sessão expirada/deslogada. Apague a pasta .waba-session para reautenticar.'
        );
      } else if (shouldReconnect) {
        logger.info('Tentando reconectar em 2s...');
        setTimeout(() => {
          startWhatsApp(onTextMessage).catch((err) =>
            logger.error({ err }, 'Falha ao reconectar')
          );
        }, 2000);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message) return;

    const from = msg.key.remoteJid || '';
    const isGroup = from.endsWith('@g.us');
    if (isGroup) return; // manter 1:1 no MVP

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.ephemeralMessage?.message?.conversation ||
      '';

    if (!text) return;

    try {
      await sock.sendPresenceUpdate('composing', from);
      const reply = await onTextMessage(from, text.trim());
      if (reply) {
        await sock.sendPresenceUpdate('composing', from);
        await sock.sendMessage(from, { text: reply });
      }
    } catch (err) {
      logger.error({ err }, 'Falha ao processar mensagem');
      await sock.sendMessage(from, {
        text: 'Tive um problema para responder agora. Tente de novo em instantes.',
      });
    } finally {
      await sock.sendPresenceUpdate('paused', from);
    }
  });

  return sock;
}
