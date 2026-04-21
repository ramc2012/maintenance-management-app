import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, bcryptMock, jwtMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
  bcryptMock: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  jwtMock: {
    sign: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

vi.mock('bcryptjs', () => ({
  default: bcryptMock,
}));

vi.mock('jsonwebtoken', () => ({
  default: jwtMock,
}));

import { getUsers, login, updateUserPermissions } from '../src/controllers/authController';

const createResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('authController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns work-order permissions in the login payload', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'alex',
      password: 'hashed-password',
      role: 'USER',
      canCreateWorkOrder: true,
      canCloseWorkOrder: false,
    });
    prismaMock.user.update.mockResolvedValue({});
    bcryptMock.compare.mockResolvedValue(true);
    jwtMock.sign.mockReturnValue('jwt-token');

    const req: any = { body: { username: 'alex', password: 'secret' } };
    const res = createResponse();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      token: 'jwt-token',
      user: {
        id: 'user-1',
        username: 'alex',
        role: 'USER',
        canCreateWorkOrder: true,
        canCloseWorkOrder: false,
      },
    });
  });

  it('returns permission columns when listing users', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        username: 'alex',
        role: 'USER',
        createdAt: '2026-04-20T00:00:00.000Z',
        lastLogin: null,
        canCreateWorkOrder: true,
        canCloseWorkOrder: false,
      },
    ]);

    const req: any = {};
    const res = createResponse();

    await getUsers(req, res);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        username: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        canCreateWorkOrder: true,
        canCloseWorkOrder: true,
      },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          canCreateWorkOrder: true,
          canCloseWorkOrder: false,
        }),
      ]),
    );
  });

  it('updates user permissions instead of returning a stub response', async () => {
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      username: 'alex',
      role: 'USER',
      canCreateWorkOrder: false,
      canCloseWorkOrder: true,
    });

    const req: any = {
      params: { id: 'user-1' },
      body: { canCreateWorkOrder: 0, canCloseWorkOrder: 1 },
    };
    const res = createResponse();

    await updateUserPermissions(req, res);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        canCreateWorkOrder: false,
        canCloseWorkOrder: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        canCreateWorkOrder: true,
        canCloseWorkOrder: true,
      },
    });
    expect(res.status).not.toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        canCreateWorkOrder: false,
        canCloseWorkOrder: true,
      }),
    );
  });
});
