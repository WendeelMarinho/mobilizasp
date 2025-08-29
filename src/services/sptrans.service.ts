// src/services/sptrans.service.ts

import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import { config } from '../config.js';
import { logger } from '../logger.js';

const BASE = 'http://api.olhovivo.sptrans.com.br/v2.1';

// Cliente Axios com suporte a cookies (sessão SPTrans)
const jar = new CookieJar();
const client: AxiosInstance = wrapper(axios.create({
  baseURL: BASE,
  jar,
  withCredentials: true,
  timeout: 10_000
}));

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) =>
    axiosRetry.isNetworkOrIdempotentRequestError(e) ||
    e.response?.status === 429
});

let authed = false;

async function ensureAuth() {
  if (authed) return;
  if (!config.sptrans.token) throw new Error('SPTRANS_TOKEN ausente');

  const url = `/Login/Autenticar?token=${encodeURIComponent(config.sptrans.token)}`;
  const { data } = await client.post(url);

  if (data === true) {
    authed = true;
    logger.info('[SPTrans] Autenticado com sucesso');
  } else {
    throw new Error('Falha ao autenticar na SPTrans');
  }
}

/** Buscar linhas por termo/código (usa o endpoint Linha/Buscar). */
export async function buscarLinhaPorCodigo(termos: string) {
  await ensureAuth();
  const { data } = await client.get(`/Linha/Buscar?termosBusca=${encodeURIComponent(termos)}`);
  return data; // array de linhas
}

/** Posição da frota por código numérico da linha (cl). */
export async function posicaoPorCodigoLinha(codigoLinha: string) {
  await ensureAuth();
  const { data } = await client.get(`/Posicao/Linha?codigoLinha=${encodeURIComponent(codigoLinha)}`);
  return data;
}

/** Previsão por código de parada. */
export async function previsaoPorParada(codigoParada: string) {
  await ensureAuth();
  const { data } = await client.get(`/Previsao/Parada?codigoParada=${encodeURIComponent(codigoParada)}`);
  return data;
}

/** Previsão por parada + código numérico da linha (cl). */
export async function previsaoPorParadaELinha(codigoParada: string, codigoLinha: string) {
  await ensureAuth();
  const { data } = await client.get(
    `/Previsao/ParadaLinha?codigoParada=${encodeURIComponent(codigoParada)}&codigoLinha=${encodeURIComponent(codigoLinha)}`
  );
  return data;
}

/** Buscar paradas por termo/lugar/rua. */
export async function buscarParadaPorTermo(termos: string) {
  await ensureAuth();
  const { data } = await client.get(`/Parada/Buscar?termosBusca=${encodeURIComponent(termos)}`);
  return data; // array de paradas
}

/** (Opcional) Paradas atendidas por uma linha (cl). */
export async function buscarParadasPorLinha(codigoLinha: string) {
  await ensureAuth();
  const { data } = await client.get(`/Parada/BuscarParadasPorLinha?codigoLinha=${encodeURIComponent(codigoLinha)}`);
  return data;
}

/** Checa se string é um ID numérico (parada). */
function isNumericId(s: string) {
  return /^\d+$/.test(String(s || '').trim());
}

/* --------------------- Resolvedores de entrada do usuário ------------------ */

/** Normaliza a query de linha do usuário (ex.: "701U-10" / "701U10"). */
function normalizeLineQuery(input: string) {
  const s = String(input || '').toUpperCase().replace(/\s+/g, '');
  // aceita "701U10" como "701U-10"
  const m = s.match(/^([A-Z0-9]+)[\-\s_]?([A-Z0-9]+)?$/);
  return {
    raw: s,
    lt: m?.[1] || s,  // letreiro principal (ex.: 701U)
    tl: m?.[2] || ''  // sufixo (ex.: 10)
  };
}

/**
 * Resolve um letreiro textual (ex.: "701U-10" ou "701U") para o código numérico da linha (cl).
 * Estratégia:
 *  1) tenta match exato lt+tl (se houver tl)
 *  2) tenta match por lt
 *  3) fallback: primeiro item retornado
 */
export async function resolverCodigoLinha(termo: string): Promise<{ cl: number, match: any } | null> {
  const q = normalizeLineQuery(termo);
  const lista = await buscarLinhaPorCodigo(q.lt);

  if (!Array.isArray(lista) || lista.length === 0) return null;

  const norm = (v: any) => String(v ?? '').toUpperCase().replace(/\s+/g, '');

  if (q.tl) {
    const candidato = lista.find((l: any) => norm(l.lt) === norm(q.lt) && norm(l.tl) === norm(q.tl));
    if (candidato?.cl) return { cl: candidato.cl, match: candidato };
  }

  const porLt = lista.find((l: any) => norm(l.lt) === norm(q.lt));
  if (porLt?.cl) return { cl: porLt.cl, match: porLt };

  const primeiro = lista[0];
  if (primeiro?.cl) return { cl: primeiro.cl, match: primeiro };

  return null;
}

/**
 * Resolve uma parada informada pelo usuário:
 * - se já for numérico, retorna como string;
 * - se for texto (ex.: "Av Aclimação"), consulta /Parada/Buscar e escolhe a melhor.
 *
 * Retorna { cp, match } onde cp é o código da parada (string).
 */
export async function resolverCodigoParada(input: string): Promise<{ cp: string, match: any } | null> {
  const raw = String(input || '').trim();
  if (!raw) return null;

  if (isNumericId(raw)) {
    return { cp: raw, match: { cp: raw } };
  }

  const lista = await buscarParadaPorTermo(raw);
  if (!Array.isArray(lista) || lista.length === 0) return null;

  // Heurística simples: tenta match que contém tokens do termo no nome/logradouro/bairro
  const norm = (v: any) => String(v ?? '')
    .toUpperCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');

  const tokens = norm(raw).split(/\s+/).filter(Boolean);

  const scored = lista
    .map((p: any) => {
      const hay = norm(`${p.np ?? ''} ${p.ed ?? ''} ${p.lda ?? ''} ${p.lg ?? ''} ${p.b ?? ''} ${p.c ?? ''}`);
      const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .sort((a: any, b: any) => b.score - a.score);

  const best = scored[0]?.p ?? lista[0];
  const cp = best?.cp ?? best?.CodigoParada ?? best?.Codigo ?? best?.CodigoParada ?? best?.codigoParada;

  if (!cp) return null;
  return { cp: String(cp), match: best };
}
