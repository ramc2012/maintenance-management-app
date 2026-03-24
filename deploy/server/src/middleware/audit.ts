import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

const EXCLUDED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXCLUDED_PATHS = ['/api/auth/login', '/api/auth/session/heartbeat'];

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.slice(0, 10).map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['password', 'token', 'authorization'].includes(key.toLowerCase()))
      .slice(0, 20)
      .map(([key, entry]) => [key, sanitizeValue(entry)]);
    return Object.fromEntries(entries);
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 497)}...`;
  }

  return value;
};

const inferModule = (path: string) => {
  const segment = path.replace(/^\/api\//, '').split('/')[0];
  return segment ? segment.toUpperCase() : 'API';
};

const inferAction = (method: string, path: string) => {
  if (path.includes('/close')) return 'CLOSE';
  if (path.includes('/approve')) return 'APPROVE';
  if (path.includes('/read')) return 'READ';
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return method;
};

const inferEntityId = (req: Request) => {
  const candidateKeys = ['id', 'tagId', 'equipmentTag', 'flId'];
  for (const key of candidateKeys) {
    const value = req.params[key] ?? req.body?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

export const auditRequests = (req: Request, res: Response, next: NextFunction) => {
  if (EXCLUDED_METHODS.has(req.method) || EXCLUDED_PATHS.includes(req.originalUrl)) {
    return next();
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      return;
    }

    const details = sanitizeValue({ params: req.params, query: req.query, body: req.body });
    const payload = {
      requestId: req.requestId,
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      module: inferModule(req.baseUrl || req.originalUrl),
      action: inferAction(req.method, req.originalUrl),
      method: req.method,
      path: req.originalUrl,
      entityType: inferModule(req.baseUrl || req.originalUrl),
      entityId: inferEntityId(req),
      statusCode: res.statusCode,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || undefined,
      details: details as Prisma.InputJsonValue,
    };

    void prisma.activityAuditLog.create({ data: payload }).catch((error) => {
      logger.error('audit_log_write_failed', {
        requestId: req.requestId,
        path: req.originalUrl,
        error: error instanceof Error ? error.message : error,
      });
    });
  });

  next();
};
