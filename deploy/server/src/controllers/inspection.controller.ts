import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// INSPECTION ROUNDS CRUD
// ============================================================================

export const getRounds = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rounds = await prisma.inspectionRound.findMany({
      where,
      include: {
        _count: { select: { executions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rounds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inspection rounds' });
  }
};

export const getRoundById = async (req: Request, res: Response) => {
  try {
    const round = await prisma.inspectionRound.findUnique({
      where: { id: req.params.id },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 10
        }
      }
    });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    res.json(round);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch round' });
  }
};

export const createRound = async (req: Request, res: Response) => {
  try {
    const round = await prisma.inspectionRound.create({
      data: {
        ...req.body,
        createdBy: (req as any).user?.username || req.body.createdBy || 'system'
      }
    });
    res.json(round);
  } catch (error) {
    console.error('Create Round Error:', error);
    res.status(500).json({ error: 'Failed to create inspection round' });
  }
};

export const updateRound = async (req: Request, res: Response) => {
  try {
    const round = await prisma.inspectionRound.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(round);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update round' });
  }
};

export const deleteRound = async (req: Request, res: Response) => {
  try {
    await prisma.inspectionRound.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete round' });
  }
};

// ============================================================================
// INSPECTION EXECUTIONS
// ============================================================================

export const getExecutions = async (req: Request, res: Response) => {
  try {
    const { roundId, status, from, to } = req.query;
    const where: any = {};
    if (roundId) where.roundId = String(roundId);
    if (status) where.status = String(status);
    if (from || to) {
      where.executedAt = {};
      if (from) where.executedAt.gte = new Date(String(from));
      if (to) where.executedAt.lte = new Date(String(to));
    }

    const executions = await prisma.inspectionExecution.findMany({
      where,
      include: { round: { select: { name: true, frequency: true } } },
      orderBy: { executedAt: 'desc' },
      take: 100
    });
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

export const startExecution = async (req: Request, res: Response) => {
  try {
    const { roundId } = req.body;

    const round = await prisma.inspectionRound.findUnique({ where: { id: roundId } });
    if (!round) return res.status(404).json({ error: 'Round not found' });

    // Initialize empty readings for each FL in the round
    const flIds = (round.flIds as any[]);
    const initialReadings = flIds.map((fl: any) => ({
      flId: fl.flId || fl,
      flName: fl.flName || fl.description || fl.flId || fl,
      value: null,
      unit: '',
      status: 'PENDING', // PENDING, OK, WARNING, CRITICAL
      notes: '',
      photoUrl: null,
    }));

    const execution = await prisma.inspectionExecution.create({
      data: {
        roundId,
        executedBy: (req as any).user?.username || req.body.executedBy || 'system',
        status: 'IN_PROGRESS',
        readings: initialReadings,
        flaggedItems: [],
      },
      include: { round: true }
    });

    res.json(execution);
  } catch (error) {
    console.error('Start Execution Error:', error);
    res.status(500).json({ error: 'Failed to start execution' });
  }
};

export const updateExecution = async (req: Request, res: Response) => {
  try {
    const execution = await prisma.inspectionExecution.update({
      where: { id: req.params.id },
      data: {
        readings: req.body.readings,
        flaggedItems: req.body.flaggedItems,
        status: req.body.status || 'IN_PROGRESS',
      }
    });
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update execution' });
  }
};

export const completeExecution = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { readings, flaggedItems } = req.body;

    const execution = await prisma.inspectionExecution.update({
      where: { id },
      data: {
        readings,
        flaggedItems,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: { round: true }
    });

    // Auto-create OperationalReadings for numeric readings
    const numericReadings = (readings as any[]).filter(r => r.value !== null && !isNaN(Number(r.value)));
    for (const reading of numericReadings) {
      if (reading.flId) {
        await prisma.operationalReading.create({
          data: {
            flId: reading.flId,
            metricType: 'INSPECTION',
            value: Number(reading.value),
            unit: reading.unit || '',
            recordedBy: (req as any).user?.username || 'system',
            source: 'MANUAL',
          }
        }).catch(() => {}); // skip if FL doesn't exist
      }
    }

    // Auto-create MaintenanceRequests for CRITICAL flagged items
    const criticalFlags = ((flaggedItems as any[]) || []).filter(f => f.severity === 'CRITICAL');
    for (const flag of criticalFlags) {
      const today = new Date();
      const prefix = `MR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const count = await prisma.maintenanceRequest.count({ where: { reqNumber: { startsWith: prefix } } });
      const reqNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

      await prisma.maintenanceRequest.create({
        data: {
          reqNumber,
          title: `Inspection Flag: ${flag.flName || flag.flId}`,
          description: flag.note || 'Critical condition found during inspection round',
          flId: flag.flId,
          requestType: 'CORRECTIVE',
          priority: 'HIGH',
          status: 'PENDING',
          requestedBy: (req as any).user?.username || 'system',
          remarks: `Auto-created from Inspection Round: ${execution.round.name}`,
        }
      }).catch(() => {});
    }

    res.json({ execution, criticalFlagsRaised: criticalFlags.length });
  } catch (error) {
    console.error('Complete Execution Error:', error);
    res.status(500).json({ error: 'Failed to complete execution' });
  }
};

export const getExecutionById = async (req: Request, res: Response) => {
  try {
    const execution = await prisma.inspectionExecution.findUnique({
      where: { id: req.params.id },
      include: { round: true }
    });
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
};

// ============================================================================
// INSPECTION STATS
// ============================================================================

export const getInspectionStats = async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalRounds, activeRounds, recentExecutions, completedRecent, flaggedRecent] = await Promise.all([
      prisma.inspectionRound.count(),
      prisma.inspectionRound.count({ where: { isActive: true } }),
      prisma.inspectionExecution.count({ where: { executedAt: { gte: thirtyDaysAgo } } }),
      prisma.inspectionExecution.count({ where: { status: 'COMPLETED', executedAt: { gte: thirtyDaysAgo } } }),
      prisma.inspectionExecution.findMany({
        where: { executedAt: { gte: thirtyDaysAgo } },
        select: { flaggedItems: true }
      }),
    ]);

    const totalFlagged = flaggedRecent.reduce((sum, e) => {
      const items = (e.flaggedItems as any[]) || [];
      return sum + items.length;
    }, 0);

    res.json({
      totalRounds,
      activeRounds,
      recentExecutions,
      completedRecent,
      totalFlagged30d: totalFlagged,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inspection stats' });
  }
};
