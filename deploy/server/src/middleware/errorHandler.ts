import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import logger from '../lib/logger';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

const mapPrismaError = (error: Prisma.PrismaClientKnownRequestError) => {
  switch (error.code) {
    case 'P2002':
      return new AppError(409, 'CONFLICT', 'A record with the same unique value already exists', error.meta);
    case 'P2025':
      return new AppError(404, 'NOT_FOUND', 'Requested record was not found', error.meta);
    default:
      return null;
  }
};

const mapZodError = (error: z.ZodError) =>
  new AppError(
    400,
    'VALIDATION_ERROR',
    'Request validation failed',
    error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
  );

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  const mappedError =
    error instanceof z.ZodError
      ? mapZodError(error)
      : isPrismaKnownError(error)
        ? mapPrismaError(error)
        : null;
  const resolvedError = mappedError || error;

  const statusCode = resolvedError instanceof AppError ? resolvedError.statusCode : 500;
  const code = resolvedError instanceof AppError ? resolvedError.code : 'INTERNAL_SERVER_ERROR';
  const message = resolvedError instanceof Error ? resolvedError.message : 'Unexpected server error';
  const details = resolvedError instanceof AppError ? resolvedError.details : undefined;

  logger.error('request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    userId: req.user?.id,
    error: resolvedError instanceof Error ? resolvedError.stack || resolvedError.message : resolvedError,
  });

  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    details,
    requestId: req.requestId,
  });
};
