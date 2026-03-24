import { describe, expect, it, vi } from 'vitest';
import { enforceWriteAccess, authorizeRole } from '../src/middleware/auth';

const createResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('enforceWriteAccess', () => {
  it('allows read methods for viewer accounts', () => {
    const req: any = { method: 'GET', user: { id: '1', username: 'viewer', role: 'VIEWER' } };
    const res = createResponse();
    const next = vi.fn();

    enforceWriteAccess(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks write methods for viewer accounts', () => {
    const req: any = { method: 'POST', user: { id: '1', username: 'viewer', role: 'VIEWER' } };
    const res = createResponse();
    const next = vi.fn();

    enforceWriteAccess(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('authorizeRole', () => {
  it('allows matching roles', () => {
    const req: any = { user: { id: '1', username: 'admin', role: 'ADMIN' } };
    const res = createResponse();
    const next = vi.fn();

    authorizeRole(['ADMIN'])(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('blocks non-matching roles', () => {
    const req: any = { user: { id: '1', username: 'viewer', role: 'VIEWER' } };
    const res = createResponse();
    const next = vi.fn();

    authorizeRole(['ADMIN'])(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
