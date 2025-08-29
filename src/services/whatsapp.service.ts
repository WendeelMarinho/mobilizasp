// src/services/whatsapp.service.ts

import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';

import { config } from '../config.js';
import { logger } from '../logger.js';
import { classifyIntent } from './intent.service.js';
import {
  buscarLinhaPorCodigo,
  posicaoPorCodigoLinha,
  previsaoPorParada,
  previsaoPorParadaELinha,
  resolverCodigoLinha,
  resolverCodigoParada
} from './sptrans.service.js';
import { geocode, directionsTransit } from './google.service.js';
import {
  formatAjuda,
  formatLinha,
  formatPosicao,
  formatPrevisao,
  formatRota
} from './formatters.service.js';

/** Resolve exports do Baileys para funcionar em ESM/CJS/transpilers. */
function resolveBaileys(mod: any) {
  const root = mod?.default ? mod.default : mod;
  const make =
    mod?.makeWASocket ??
    root?.makeWASocket ??
    (typeof root === 'function' ? root : undefined);
  const useMulti =
    mod?.useMultiFileAuthState ??
    root?.useMultiFileAuthState;
  const disconnectReason =
    mod?.DisconnectReason ??
    root?.DisconnectReason;
  const fetchVersion =
    mod?.fetchLatestBaileysVersion ??
    root?.fetchLatestBaileysVersion;
  return { make, useMulti, disconnectReason, fetchVersion };
}

let sock: WASocket | null = null;

export async function startWhatsapp() {
  const baileysMod = await import('@whiskeysockets/baileys');
  const {
    make: makeWASocket,
    useMulti: useMultiFileAuthState,
    disconnectReason: DisconnectReason,
    fetchVersion: fetchLatestBaileysVersion
  } = resolveBaileys(baileysMod);

  if (typeof makeWASocket !== 'function' || typeof useMultiFileAuthState !== 'function') {
    throw new TypeError(
      '[WA] Falha ao carregar Baileys: makeWASocket/useMultiFileAuthState não encontrados.'
    );
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.sessionDir);

  let version: [number, number, number] | undefined;
  try {
    if (typeof fetchLatestBaileysVersion === 'function') {
      const v = await fetchLatestBaileysVersion();
      version = v?.version;
      logger.info({ version }, '[WA] versão do WhatsApp Web (Baileys)');
    }
  } catch (e) {
    logger.warn(e, '[WA] falha ao obter versão mais recente; usando default');
  }

  const s: WASocket = makeWASocket({
    version,
    auth: state,
    syncFullHistory: false
  });

  s.ev.on('creds.update', saveCreds);

  s.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('[WA] QR gerado — escaneie no seu celular');
      qrcode.generate(qr, { small: true });
      logger.info('No WhatsApp: Menu > Dispositivos conectados > Conectar um dispositivo.');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const shouldReconnect = statusCode !== (DisconnectReason?.loggedOut ?? 401);
      logger.warn({ statusCode }, '[WA] conexão fechada; reconectar? ' + shouldReconnect);
      if (shouldReconnect) startWhatsapp().catch((e) => logger.error(e, '[WA] erro ao reconectar'));
    }

    if (connection === 'open') logger.info('[WA] conectado');
  });

  s.ev.on('messages.upsert', async (m: any) => {
    const msg = m.messages?.[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid as string;
    const text =
      (msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '').trim();

    if (!text) return;

    try {
      const intent = await classifyIntent(text);

      let reply = 'Não entendi. ' + formatAjuda();

      if (intent.type === 'ajuda') {
        reply = formatAjuda();

      } else if (intent.type === 'linha') {
        const data = await buscarLinhaPorCodigo(intent.termo);
        reply = formatLinha(intent.termo, data);

      } else if (intent.type === 'posicao') {
        const resolvida = await resolverCodigoLinha(intent.linha);
        reply = resolvida
          ? formatPosicao(intent.linha, await posicaoPorCodigoLinha(String(resolvida.cl)))
          : `Não encontrei a linha "${intent.linha}". Tente, por exemplo: "posição 701U-10" ou "posição 701U".`;

      } else if (intent.type === 'previsao') {
        // 1) resolve parada (aceita número ou texto)
        const parada = await resolverCodigoParada(intent.parada);
        if (!parada) {
          reply = `Não encontrei a parada "${intent.parada}". Envie o código do ponto (ex.: 340015345) ou um termo mais específico.`;
        } else if (intent.linha) {
          // 2) se veio linha, resolve letreiro -> cl
          const resolvida = await resolverCodigoLinha(intent.linha);
          if (!resolvida) {
            reply = `Não encontrei a linha "${intent.linha}" para a parada ${parada.cp}. Tente só a parada: "previsão ${parada.cp}".`;
          } else {
            try {
              const data = await previsaoPorParadaELinha(parada.cp, String(resolvida.cl));
              reply = formatPrevisao(parada.cp, intent.linha, data);
            } catch (err: any) {
              if (err?.response?.status === 404) {
                const onlyStop = await previsaoPorParada(parada.cp);
                reply = `Não achei previsão específica da linha ${intent.linha} nessa parada. ` +
                        `Seguem previsões da parada ${parada.cp}:\n` +
                        formatPrevisao(parada.cp, undefined, onlyStop);
              } else {
                throw err;
              }
            }
          }
        } else {
          const data = await previsaoPorParada(parada.cp);
          reply = formatPrevisao(parada.cp, undefined, data);
        }

      } else if (intent.type === 'rota') {
        // Integração Directions (transit)
        const { origem, destino } = intent;
        const o = await geocode(origem);
        const d = await geocode(destino);
        if (!o || !d) {
          reply = `Não consegui localizar "${!o ? origem : destino}". Tente informar endereços mais específicos (ex.: "Rua X, 123 - Bairro, São Paulo").`;
        } else {
          const data = await directionsTransit(o, d);
          reply = formatRota(origem, destino, data);
        }
      }

      await s.sendMessage(from, { text: reply });

    } catch (e: any) {
      await s.sendMessage(from, { text: 'Erro ao processar sua mensagem. Tente novamente.' });
      logger.error(e, '[WA] erro ao responder');
    }
  });

  sock = s;
  return sock;
}
