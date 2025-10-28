import { generate } from './gemini.service.js';
import { normalizeText } from '../utils/text.js';
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
import { config } from '../config.js';

export type Intent =
  | { type: 'previsao'; parada: string; linha?: string }
  | { type: 'posicao'; linha: string }
  | { type: 'linha'; termo: string }
  | { type: 'ajuda' }
  | { type: 'rota'; origem: string; destino: string }
  | { type: 'desconhecido' };

const SYSTEM_PROMPT = `
Você é um classificador de intenções para um bot de ônibus de São Paulo.
Responda apenas com JSON válido (uma única linha), sem comentários.

INTENÇÕES:
- previsao: previsão em uma parada. Campos: parada (obrigatório), linha (opcional).
- posicao: posição da frota de uma linha. Campos: linha (obrigatório).
- linha: buscar linhas por termo/código. Campos: termo (obrigatório).
- rota: calcular rota de transporte público. Campos: origem (obrigatório), destino (obrigatório).
- ajuda: quando pedirem ajuda.
- desconhecido: se não der para decidir.

Exemplos:
"quando chega 701U-10 no ponto 340015345?" ->
{"type":"previsao","parada":"340015345","linha":"701U-10"}

"onde estao os onibus 477P?" ->
{"type":"posicao","linha":"477P"}

"qual onibus passa na paulista?" ->
{"type":"linha","termo":"paulista"}

"rota Av Paulista 1000 até Terminal Jabaquara" ->
{"type":"rota","origem":"Av Paulista 1000","destino":"Terminal Jabaquara"}
`;

export async function classifyIntent(message: string): Promise<Intent> {
  const input = normalizeText(message).trim();
  const text = await generate('gemini-1.5-pro', `${SYSTEM_PROMPT}\n\nUsuario: ${input}`);
  try {
    const parsed = JSON.parse(text);
    if (parsed?.type === 'previsao' && parsed.parada) {
      return { type: 'previsao', parada: String(parsed.parada), linha: parsed.linha ? String(parsed.linha) : undefined };
    }
    if (parsed?.type === 'posicao' && parsed.linha) {
      return { type: 'posicao', linha: String(parsed.linha) };
    }
    if (parsed?.type === 'linha' && parsed.termo) {
      return { type: 'linha', termo: String(parsed.termo) };
    }
    if (parsed?.type === 'rota' && parsed.origem && parsed.destino) {
      return { type: 'rota', origem: String(parsed.origem), destino: String(parsed.destino) };
    }
    if (parsed?.type === 'ajuda') return { type: 'ajuda' };
  } catch {
    // continua abaixo
  }
  return { type: 'desconhecido' };
}

/**
 * Processa mensagem de texto recebida do WhatsApp e retorna resposta
 */
export async function handleIncomingText(_from: string, text: string): Promise<string> {
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
      const parada = await resolverCodigoParada(intent.parada);
      if (!parada) {
        reply = `Não encontrei a parada "${intent.parada}". Envie o código do ponto (ex.: 340015345) ou um termo mais específico.`;
      } else if (intent.linha) {
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
      if (!config.mapsEnabled) {
        reply = 'Recursos de mapas indisponíveis no momento.';
      } else {
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
    }

    return reply;

  } catch (err) {
    throw err;
  }
}
