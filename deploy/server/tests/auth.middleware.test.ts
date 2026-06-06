import { describe, expect, it, vi } from 'vitest';
import { authorizeRole } from '../src/middleware/auth';

const createResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.sendStatus = vi.fn().mockReturnValue(res);
  return res;
};

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
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });
});
