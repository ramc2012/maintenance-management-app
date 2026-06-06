import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    case: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => prismaMock),
}));

import { getDashboardAnalytics } from '../src/controllers/caseController';

const createResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('caseController.getDashboardAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the breakdown arrays expected by the procurement dashboard', async () => {
    prismaMock.case.findMany.mockResolvedValue([
      {
        type: 'STORES',
        currentStage: 'Approval',
        prValue: 1000,
        poValue: null,
        value: null,
        departmentId: 'dept-1',
        department: { id: 'dept-1', name: 'Mechanical' },
        equipmentTag: 'EQ-01',
        tag: null,
      },
      {
        type: 'SERVICES',
        currentStage: 'PO Released',
        prValue: 2000,
        poValue: 2400,
        value: null,
        departmentId: 'dept-1',
        department: { id: 'dept-1', name: 'Mechanical' },
        equipmentTag: 'EQ-01',
        tag: null,
      },
      {
        type: 'PETTY',
        currentStage: 'Closed',
        prValue: null,
        poValue: null,
        value: 300,
        departmentId: null,
        department: null,
        equipmentTag: null,
        tag: 'TAG-22',
      },
    ]);

    const req: any = { query: { departmentId: 'dept-1' } };
    const res = createResponse();

    await getDashboardAnalytics(req, res);

    expect(prismaMock.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          departmentId: 'dept-1',
          createdAt: expect.any(Object),
        }),
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCount: 2,
        closedCount: 1,
        valueBreakdown: expect.objectContaining({
          STORES: 1000,
          SERVICES: 2400,
          PETTY: 300,
        }),
        departmentBreakdown: expect.arrayContaining([
          expect.objectContaining({
            id: 'dept-1',
            name: 'Mechanical',
            countByType: expect.objectContaining({ STORES: 1, SERVICES: 1 }),
            valueByType: expect.objectContaining({ STORES: 1000, SERVICES: 2400 }),
          }),
          expect.objectContaining({
            id: '__UNASSIGNED__',
            name: 'Unassigned',
            countByType: expect.objectContaining({ PETTY: 1 }),
            valueByType: expect.objectContaining({ PETTY: 300 }),
          }),
        ]),
        assetBreakdown: expect.arrayContaining([
          expect.objectContaining({
            tag: 'EQ-01',
            countByType: expect.objectContaining({ STORES: 1, SERVICES: 1 }),
            valueByType: expect.objectContaining({ STORES: 1000, SERVICES: 2400 }),
          }),
          expect.objectContaining({
            tag: 'TAG-22',
            countByType: expect.objectContaining({ PETTY: 1 }),
            valueByType: expect.objectContaining({ PETTY: 300 }),
          }),
        ]),
      }),
    );
  });
});
