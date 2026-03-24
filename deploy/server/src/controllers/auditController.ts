import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// Generate unique observation number
const generateObservationNo = async (): Promise<string> => {
  const today = new Date();
  const prefix = `AUD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.auditObservation.count({
    where: { observationNo: { startsWith: prefix } }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

// GET all observations with filters
export const getObservations = async (req: Request, res: Response) => {
  try {
    const { agency, status, installationId, service, severity, page = '1', pageSize = '25' } = req.query;
    const where: any = {};
    if (agency) where.agency = String(agency);
    if (status) where.status = String(status);
    if (installationId) where.installationId = String(installationId);
    if (service) where.service = String(service);
    if (severity) where.severity = String(severity);

    const pageNum = Math.max(1, parseInt(String(page)));
    const size = Math.min(100, Math.max(1, parseInt(String(pageSize))));

    const [total, observations] = await Promise.all([
      prisma.auditObservation.count({ where }),
      prisma.auditObservation.findMany({
        where,
        include: { actions: { orderBy: { actionNo: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size
      })
    ]);

    res.json({
      data: observations,
      pagination: { page: pageNum, pageSize: size, total, totalPages: Math.ceil(total / size) }
    });
  } catch (error) {
    console.error('Get observations error:', error);
    res.status(500).json({ error: 'Failed to fetch observations' });
  }
};

// GET single observation by ID
export const getObservationById = async (req: Request, res: Response) => {
  try {
    const observation = await prisma.auditObservation.findUnique({
      where: { id: req.params.id },
      include: { actions: { orderBy: { actionNo: 'asc' } } }
    });
    if (!observation) return res.status(404).json({ error: 'Observation not found' });
    res.json(observation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch observation' });
  }
};

// CREATE observation
export const createObservation = async (req: Request, res: Response) => {
  try {
    const observationNo = await generateObservationNo();
    const observation = await prisma.auditObservation.create({
      data: {
        ...req.body,
        observationNo,
        auditDate: new Date(req.body.auditDate),
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null
      },
      include: { actions: true }
    });
    res.status(201).json(observation);
  } catch (error) {
    console.error('Create observation error:', error);
    res.status(500).json({ error: 'Failed to create observation' });
  }
};

// UPDATE observation
export const updateObservation = async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.auditDate) data.auditDate = new Date(data.auditDate);
    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    if (data.closedDate) data.closedDate = new Date(data.closedDate);
    delete data.observationNo; // Never allow changing the observation number
    delete data.actions; // Don't update nested relations here

    const observation = await prisma.auditObservation.update({
      where: { id: req.params.id },
      data,
      include: { actions: { orderBy: { actionNo: 'asc' } } }
    });
    res.json(observation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update observation' });
  }
};

// DELETE observation
export const deleteObservation = async (req: Request, res: Response) => {
  try {
    await prisma.auditObservation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Observation deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete observation' });
  }
};

// ADD action to observation
export const addAction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // observation ID
    // Get next action number
    const lastAction = await prisma.auditAction.findFirst({
      where: { observationId: id },
      orderBy: { actionNo: 'desc' }
    });
    const actionNo = (lastAction?.actionNo || 0) + 1;

    const action = await prisma.auditAction.create({
      data: {
        ...req.body,
        observationId: id,
        actionNo,
        targetDate: new Date(req.body.targetDate),
        completedDate: req.body.completedDate ? new Date(req.body.completedDate) : null
      }
    });
    res.status(201).json(action);
  } catch (error) {
    console.error('Add action error:', error);
    res.status(500).json({ error: 'Failed to add action' });
  }
};

// UPDATE action
export const updateAction = async (req: Request, res: Response) => {
  try {
    const data: any = { ...req.body };
    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    if (data.completedDate) data.completedDate = new Date(data.completedDate);
    if (data.verifiedAt) data.verifiedAt = new Date(data.verifiedAt);
    delete data.observationId;
    delete data.actionNo;

    const action = await prisma.auditAction.update({
      where: { id: req.params.actionId },
      data
    });

    // Check if all actions are completed - auto-close observation
    const observation = await prisma.auditObservation.findUnique({
      where: { id: req.params.id },
      include: { actions: true }
    });
    if (observation && observation.actions.length > 0) {
      const allCompleted = observation.actions.every(a => a.status === 'COMPLETED');
      if (allCompleted && observation.status !== 'CLOSED') {
        await prisma.auditObservation.update({
          where: { id: req.params.id },
          data: { status: 'CLOSED', closedDate: new Date() }
        });
      }
    }

    res.json(action);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update action' });
  }
};

// DELETE action
export const deleteAction = async (req: Request, res: Response) => {
  try {
    await prisma.auditAction.delete({ where: { id: req.params.actionId } });
    res.json({ message: 'Action deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete action' });
  }
};

// DASHBOARD - Summary stats
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);

    // Counts by status
    const [total, open, inProgress, closed, overdue] = await Promise.all([
      prisma.auditObservation.count({ where }),
      prisma.auditObservation.count({ where: { ...where, status: 'OPEN' } }),
      prisma.auditObservation.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.auditObservation.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.auditObservation.count({ where: { ...where, status: 'OVERDUE' } })
    ]);

    // By agency
    const byAgency = await prisma.auditObservation.groupBy({
      by: ['agency'],
      where: { ...where, status: { not: 'CLOSED' } },
      _count: true
    });

    // By service
    const byService = await prisma.auditObservation.groupBy({
      by: ['service'],
      where: { ...where, status: { not: 'CLOSED' } },
      _count: true
    });

    // By severity
    const bySeverity = await prisma.auditObservation.groupBy({
      by: ['severity'],
      where: { ...where, status: { not: 'CLOSED' } },
      _count: true
    });

    // Pending actions
    const pendingActions = await prisma.auditAction.count({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
    });

    // Overdue actions
    const overdueActions = await prisma.auditAction.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        targetDate: { lt: new Date() }
      }
    });

    res.json({
      total, open, inProgress, closed, overdue,
      overdueActions,
      pendingByAgency: byAgency.map(a => ({ agency: a.agency, count: typeof a._count === 'number' ? a._count : (a._count as any)?._all || 0 })),
      pendingByService: byService.map(s => ({ service: s.service || 'Unassigned', count: typeof s._count === 'number' ? s._count : (s._count as any)?._all || 0 })),
      pendingBySeverity: bySeverity.map(s => ({ severity: s.severity, count: typeof s._count === 'number' ? s._count : (s._count as any)?._all || 0 })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

// GET Activity Audit Logs (system-wide)
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { module, action, userId, page = '1', pageSize = '25' } = req.query;
    const where: any = {};
    if (module) where.module = String(module);
    if (action) where.action = String(action);
    if (userId) where.userId = String(userId);

    const pageNum = Math.max(1, parseInt(String(page)));
    const size = Math.min(100, Math.max(1, parseInt(String(pageSize))));

    const [total, logs] = await Promise.all([
      prisma.activityAuditLog.count({ where }),
      prisma.activityAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * size,
        take: size
      })
    ]);

    res.json({
      data: logs,
      pagination: { page: pageNum, pageSize: size, total, totalPages: Math.ceil(total / size) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
