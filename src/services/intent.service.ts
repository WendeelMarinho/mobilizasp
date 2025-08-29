import { generate } from './gemini.service.js';
import { normalizeText } from '../utils/text.js';

type Intent =
  | { type: 'previsao'; parada: string; linha?: string }
  | { type: 'posicao'; linha: string }
  | { type: 'linha'; termo: string }
  | { type: 'ajuda' }
  | { type: 'desconhecido' };

const SYSTEM_PROMPT = `
Você é um classificador de intenções para um bot de ônibus de São Paulo.
Responda apenas com JSON válido (uma única linha), sem comentários.

INTENÇÕES:
- previsao: previsão em uma parada. Campos: parada (obrigatório), linha (opcional).
- posicao: posição da frota de uma linha. Campos: linha (obrigatório).
- linha: buscar linhas por termo/código. Campos: termo (obrigatório).
- ajuda: quando pedirem ajuda.
- desconhecido: se não der para decidir.

Exemplos:
"quando chega 701U-10 no ponto 340015345?" ->
{"type":"previsao","parada":"340015345","linha":"701U-10"}

"onde estao os onibus 477P?" ->
{"type":"posicao","linha":"477P"}

"qual onibus passa na paulista?" ->
{"type":"linha","termo":"paulista"}
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
    if (parsed?.type === 'ajuda') return { type: 'ajuda' };
  } catch {
    // continua abaixo
  }
  return { type: 'desconhecido' };
}
