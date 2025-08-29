import { Router } from 'express';
import { ok, badRequest, serverError, TypedRequestBody } from '../utils/http.js';
import { classifyIntent } from '../services/intent.service.js';
import {
  buscarLinhaPorCodigo, posicaoPorCodigoLinha,
  previsaoPorParada, previsaoPorParadaELinha
} from '../services/sptrans.service.js';

export const whatsappRouter = Router();

type Body = { numero?: string; mensagem: string };

whatsappRouter.post('/', async (req: TypedRequestBody<Body>, res) => {
  try {
    const { mensagem } = req.body || {};
    if (!mensagem) return badRequest(res, 'mensagem é obrigatória');

    const intent = await classifyIntent(mensagem);
    let data: any;

    if (intent.type === 'linha') data = await buscarLinhaPorCodigo(intent.termo);
    else if (intent.type === 'posicao') data = await posicaoPorCodigoLinha(intent.linha);
    else if (intent.type === 'previsao') {
      data = intent.linha
        ? await previsaoPorParadaELinha(intent.parada, intent.linha)
        : await previsaoPorParada(intent.parada);
    } else if (intent.type === 'ajuda') data = { exemplos: ['quando chega 701U-10 no ponto 340015345?', 'posicao 477P'] };
    else data = { info: 'intenção desconhecida' };

    return ok(res, { intent, data });
  } catch (e) { return serverError(res, e); }
});
