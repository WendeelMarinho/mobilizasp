import { Request, Response } from 'express';

export function ok(res: Response, data: any) {
  return res.status(200).json({ ok: true, data });
}
export function badRequest(res: Response, message: string) {
  return res.status(400).json({ ok: false, error: message });
}
export function serverError(res: Response, error: unknown) {
  const message = (error as any)?.message || 'Internal error';
  return res.status(500).json({ ok: false, error: message });
}

export type TypedRequestBody<T> = Request<unknown, unknown, T>;
