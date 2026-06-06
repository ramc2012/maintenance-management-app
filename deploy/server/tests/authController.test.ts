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
    department: {
      findUnique: vi.fn(),
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

import { getUsers, login, register, updateUserPermissions } from '../src/controllers/authController';

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
      phone: null,
      jobTitle: null,
      departmentId: null,
      department: null,
      managerId: null,
      manager: null,
      disciplineAccesses: [],
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
      user: expect.objectContaining({
        id: 'user-1',
        username: 'alex',
        role: 'USER',
        persona: 'FIELD',
        defaultDiscipline: 'MECHANICAL',
        canCreateWorkOrder: true,
        canCloseWorkOrder: false,
      }),
    });
  });

  it('returns permission columns when listing users', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        username: 'alex',
        role: 'USER',
        phone: null,
        jobTitle: null,
        departmentId: null,
        department: null,
        managerId: null,
        manager: null,
        disciplineAccesses: [],
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
      select: expect.objectContaining({
        id: true,
        username: true,
        role: true,
        phone: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        managerId: true,
        manager: {
          select: expect.objectContaining({
            id: true,
            username: true,
            role: true,
            jobTitle: true,
          }),
        },
        disciplineAccesses: expect.objectContaining({
          select: expect.objectContaining({
            discipline: true,
            accessLevel: true,
            isDefault: true,
            canViewProcurement: true,
            canUpdateProcurement: true,
            canRaiseRequirements: true,
          }),
        }),
        lastLogin: true,
        createdAt: true,
        canCreateWorkOrder: true,
        canCloseWorkOrder: true,
      }),
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

  it('creates users with department and manager assignments', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'manager-1',
        username: 'maintenance.hod',
        role: 'HOD',
        departmentId: 'dept-1',
        disciplineAccesses: [
          {
            discipline: 'MECHANICAL',
            accessLevel: 'MANAGE',
            isDefault: true,
            canViewProcurement: true,
            canUpdateProcurement: true,
            canRaiseRequirements: true,
          },
        ],
      });
    prismaMock.department.findUnique.mockResolvedValue({
      id: 'dept-1',
      name: 'Mechanical',
    });
    bcryptMock.hash.mockResolvedValue('hashed-password');
    prismaMock.user.create.mockResolvedValue({
      id: 'user-2',
      username: 'tech.01',
      role: 'TECHNICIAN',
      phone: '9999999999',
      jobTitle: 'Field Technician',
      departmentId: 'dept-1',
      department: { id: 'dept-1', name: 'Mechanical' },
      managerId: 'manager-1',
      manager: { id: 'manager-1', username: 'maintenance.hod', role: 'HOD', jobTitle: 'Maintenance Head' },
      disciplineAccesses: [
        {
          discipline: 'MECHANICAL',
          accessLevel: 'EXECUTE',
          isDefault: true,
          canViewProcurement: true,
          canUpdateProcurement: false,
          canRaiseRequirements: true,
        },
      ],
      canCreateWorkOrder: true,
      canCloseWorkOrder: false,
      createdAt: '2026-04-22T00:00:00.000Z',
      lastLogin: null,
    });

    const req: any = {
      user: { role: 'ADMIN' },
      body: {
        username: 'tech.01',
        password: 'secret',
        role: 'TECHNICIAN',
        departmentId: 'dept-1',
        managerId: 'manager-1',
        phone: '9999999999',
        jobTitle: 'Field Technician',
        canCreateWorkOrder: true,
      },
    };
    const res = createResponse();

    await register(req, res);

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: 'tech.01',
        role: 'TECHNICIAN',
        departmentId: 'dept-1',
        managerId: 'manager-1',
        phone: '9999999999',
        jobTitle: 'Field Technician',
        canCreateWorkOrder: true,
        canCloseWorkOrder: false,
        disciplineAccesses: {
          create: [
            expect.objectContaining({
              discipline: 'MECHANICAL',
              accessLevel: 'EXECUTE',
              isDefault: true,
            }),
          ],
        },
      }),
      select: expect.objectContaining({
        departmentId: true,
        managerId: true,
        manager: expect.any(Object),
        department: expect.any(Object),
      }),
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 'dept-1',
        managerId: 'manager-1',
        manager: expect.objectContaining({ username: 'maintenance.hod' }),
      }),
    );
  });

  it('updates user permissions instead of returning a stub response', async () => {
    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      username: 'alex',
      role: 'USER',
      phone: null,
      jobTitle: null,
      departmentId: null,
      department: null,
      managerId: null,
      manager: null,
      disciplineAccesses: [],
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
      select: expect.objectContaining({
        id: true,
        username: true,
        role: true,
        phone: true,
        jobTitle: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        managerId: true,
        manager: expect.any(Object),
        disciplineAccesses: expect.any(Object),
        canCreateWorkOrder: true,
        canCloseWorkOrder: true,
      }),
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
