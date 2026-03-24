import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// MAINTENANCE STRATEGIES
// ============================================================================

export const getStrategies = async (req: Request, res: Response) => {
  try {
    const { assetClass } = req.query;
    const where: any = {};
    if (assetClass) where.assetClass = String(assetClass);
    
    const strategies = await prisma.maintenanceStrategy.findMany({
      where,
      include: { tasks: { orderBy: { sequence: 'asc' } } },
      orderBy: { name: 'asc' }
    });
    res.json(strategies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
};

export const getStrategyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const strategy = await prisma.maintenanceStrategy.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { sequence: 'asc' } },
        assignments: { include: { functionalLocation: true } }
      }
    });
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
};

export const createStrategy = async (req: Request, res: Response) => {
  try {
    const strategy = await prisma.maintenanceStrategy.create({ data: req.body });
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create strategy' });
  }
};

export const updateStrategy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const strategy = await prisma.maintenanceStrategy.update({ where: { id }, data: req.body });
    res.json(strategy);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update strategy' });
  }
};

export const deleteStrategy = async (req: Request, res: Response) => {
  try {
    await prisma.maintenanceStrategy.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
};

// ============================================================================
// STRATEGY TASKS
// ============================================================================

export const addTask = async (req: Request, res: Response) => {
  try {
    const task = await prisma.strategyTask.create({ data: req.body });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.strategyTask.update({ where: { id }, data: req.body });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    await prisma.strategyTask.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// ============================================================================
// PLAN ASSIGNMENTS (Strategy -> FL)
// ============================================================================

export const getAssignments = async (req: Request, res: Response) => {
  try {
    const { flId, strategyId } = req.query;
    const where: any = {};
    if (flId) where.flId = String(flId);
    if (strategyId) where.strategyId = String(strategyId);
    
    const assignments = await prisma.maintenancePlanAssignment.findMany({
      where,
      include: {
        functionalLocation: { include: { currentAsset: true } },
        strategy: { include: { tasks: true } }
      },
      orderBy: { nextDueDate: 'asc' }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { flId, strategyId, triggerType, intervalValue, intervalUnit, alertLeadDays } = req.body;
    
    // Calculate initial next due date
    let nextDueDate = new Date();
    if (triggerType === 'TIME') {
      if (intervalUnit === 'DAYS') {
        nextDueDate.setDate(nextDueDate.getDate() + intervalValue);
      } else if (intervalUnit === 'MONTHS') {
        nextDueDate.setMonth(nextDueDate.getMonth() + intervalValue);
      }
    }
    
    const assignment = await prisma.maintenancePlanAssignment.create({
      data: {
        flId,
        strategyId,
        triggerType,
        intervalValue,
        intervalUnit,
        alertLeadDays: alertLeadDays || 14,
        nextDueDate: triggerType === 'TIME' ? nextDueDate : null
      }
    });
    res.json(assignment);
  } catch (error) {
    console.error('Create Assignment Error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    await prisma.maintenancePlanAssignment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
};

// ============================================================================
// DUE / OVERDUE ITEMS
// ============================================================================

export const getDueItems = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const lookahead = new Date();
    lookahead.setDate(today.getDate() + 30); // 30 days lookahead
    
    // Time-based items
    const timeBasedDue = await prisma.maintenancePlanAssignment.findMany({
      where: {
        triggerType: 'TIME',
        isActive: true,
        nextDueDate: { lte: lookahead }
      },
      include: {
        functionalLocation: { include: { currentAsset: true, system: true } },
        strategy: true
      },
      orderBy: { nextDueDate: 'asc' }
    });
    
    // Categorize
    const overdue = timeBasedDue.filter(a => a.nextDueDate && a.nextDueDate < today);
    const dueSoon = timeBasedDue.filter(a => a.nextDueDate && a.nextDueDate >= today);
    
    res.json({
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      items: {
        overdue,
        dueSoon
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch due items' });
  }
};

// Trigger check (for cron job)
export const checkTriggers = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const notifications: any[] = [];
    
    // Check time-based triggers
    const dueAssignments = await prisma.maintenancePlanAssignment.findMany({
      where: {
        triggerType: 'TIME',
        isActive: true,
        nextDueDate: { lte: today }
      },
      include: {
        functionalLocation: true,
        strategy: true
      }
    });
    
    for (const assignment of dueAssignments) {
      // Check if there's already an open WO for this assignment
      const existingWO = await prisma.workOrder.findFirst({
        where: {
          assignmentId: assignment.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      });
      
      if (!existingWO) {
        notifications.push({
          type: 'PM_DUE',
          flId: assignment.flId,
          flName: assignment.functionalLocation.name,
          strategyName: assignment.strategy.name,
          dueDate: assignment.nextDueDate
        });
      }
    }
    
    res.json({ checked: dueAssignments.length, notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check triggers' });
  }
};
