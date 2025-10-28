import { Router } from 'express';
import { z } from 'zod';
import { ok, badRequest, serverError } from '../utils/http.js';
import {
  buscarLinhaPorCodigo,
  posicaoPorCodigoLinha,
  previsaoPorParada,
  previsaoPorParadaELinha
} from '../services/sptrans.service.js';
import { createAppError } from '../middlewares/error.js';

export const sptransRouter = Router();

const linhaQuerySchema = z.object({
  q: z.string().min(1, 'Query parameter q is required')
});

sptransRouter.get('/linha', async (req, res, next) => {
  try {
    const parseResult = linhaQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return badRequest(res, `Invalid query parameters: ${parseResult.error.message}`);
    }

    const { q } = parseResult.data;
    const data = await buscarLinhaPorCodigo(q);
    return ok(res, data);
  } catch (e: any) {
    next(e);
  }
});

const posicaoQuerySchema = z.object({
  linha: z.string().min(1, 'linha parameter is required')
});

sptransRouter.get('/posicao', async (req, res, next) => {
  try {
    const parseResult = posicaoQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return badRequest(res, `Invalid query parameters: ${parseResult.error.message}`);
    }

    const { linha } = parseResult.data;
    const data = await posicaoPorCodigoLinha(linha);
    return ok(res, data);
  } catch (e: any) {
    next(e);
  }
});

const previsaoQuerySchema = z.object({
  parada: z.string().min(1, 'parada parameter is required'),
  linha: z.string().optional()
});

sptransRouter.get('/previsao', async (req, res, next) => {
  try {
    const parseResult = previsaoQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return badRequest(res, `Invalid query parameters: ${parseResult.error.message}`);
    }

    const { parada, linha } = parseResult.data;
    const data = linha
      ? await previsaoPorParadaELinha(parada, linha)
      : await previsaoPorParada(parada);
    return ok(res, data);
  } catch (e: any) {
    next(e);
  }
});
