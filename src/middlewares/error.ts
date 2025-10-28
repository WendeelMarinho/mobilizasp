// src/middlewares/error.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { config } from '../config.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = (err as AppError).statusCode || 500;
  const isOperational = (err as AppError).isOperational ?? false;

  const errorMessage = err.message || 'Internal Server Error';
  const shouldLogError = !isOperational || statusCode >= 500;

  if (shouldLogError) {
    logger.error(
      {
        error: {
          message: errorMessage,
          stack: config.isProduction ? undefined : err.stack,
          statusCode,
          path: req.path,
          method: req.method
        }
      },
      'Request error'
    );
  }

  res.status(statusCode).json({
    ok: false,
    error: errorMessage,
    ...(config.isProduction ? {} : { stack: err.stack })
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    ok: false,
    error: `Route ${req.method} ${req.path} not found`
  });
}

export function createAppError(
  message: string,
  statusCode: number = 500,
  isOperational: boolean = true
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  return error;
}

