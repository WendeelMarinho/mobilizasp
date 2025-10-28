// src/routes/maps.routes.ts

import { Router } from 'express';
import { z } from 'zod';
import { ok, badRequest } from '../utils/http.js';
import { geocode, placesBusStopsNearby, directionsTransit } from '../services/google.service.js';

export const mapsRouter = Router();

const rotaQuerySchema = z.object({
  origem: z.string().min(1, 'origem parameter is required'),
  destino: z.string().min(1, 'destino parameter is required')
});

mapsRouter.get('/rota', async (req, res, next) => {
  try {
    const parseResult = rotaQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return badRequest(res, `Invalid query parameters: ${parseResult.error.message}`);
    }

    const { origem, destino } = parseResult.data;
    const data = await directionsTransit(origem, destino);
    return ok(res, data);
  } catch (e: any) {
    next(e);
  }
});

const paradasProximasQuerySchema = z.object({
  endereco: z.string().min(1, 'endereco parameter is required'),
  raio: z.string().optional().transform((val) => {
    const radius = val ? Number.parseInt(val, 10) : 500;
    return radius > 5000 ? 5000 : radius < 100 ? 100 : radius;
  })
});

mapsRouter.get('/paradas-proximas', async (req, res, next) => {
  try {
    const parseResult = paradasProximasQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return badRequest(res, `Invalid query parameters: ${parseResult.error.message}`);
    }

    const { endereco, raio } = parseResult.data;
    const coord = await geocode(endereco);

    if (!coord) {
      return badRequest(res, `Could not geocode address: ${endereco}`);
    }

    const data = await placesBusStopsNearby(coord, raio);
    return ok(res, { location: coord, stops: data });
  } catch (e: any) {
    next(e);
  }
});

