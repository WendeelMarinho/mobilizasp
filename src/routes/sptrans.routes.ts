import { Router } from 'express';
import { ok, badRequest, serverError } from '../utils/http.js';
import {
  buscarLinhaPorCodigo, posicaoPorCodigoLinha,
  previsaoPorParada, previsaoPorParadaELinha
} from '../services/sptrans.service.js';

export const sptransRouter = Router();

sptransRouter.get('/linha/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo) return badRequest(res, 'codigo obrigatório');
    return ok(res, await buscarLinhaPorCodigo(codigo));
  } catch (e) { return serverError(res, e); }
});

sptransRouter.get('/posicao/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo) return badRequest(res, 'codigo obrigatório');
    return ok(res, await posicaoPorCodigoLinha(codigo));
  } catch (e) { return serverError(res, e); }
});

sptransRouter.get('/previsao/:parada', async (req, res) => {
  try {
    const { parada } = req.params;
    const { linha } = req.query as { linha?: string };
    const data = linha
      ? await previsaoPorParadaELinha(parada, linha)
      : await previsaoPorParada(parada);
    return ok(res, data);
  } catch (e) { return serverError(res, e); }
});
