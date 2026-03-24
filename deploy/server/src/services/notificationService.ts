import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

export type DueStatus = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING';

const getLookaheadDays = () => Number(process.env.NOTIFICATION_LOOKAHEAD_DAYS || 30);

export const getNotificationSweepCron = () => process.env.NOTIFICATION_SWEEP_CRON || '*/30 * * * *';

export const classifyDueStatus = (dueDate: Date, leadDays = 14, now = new Date()): DueStatus => {
  if (dueDate.getTime() < now.getTime()) {
    return 'OVERDUE';
  }

  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + leadDays);
  if (dueDate.getTime() <= threshold.getTime()) {
    return 'DUE_SOON';
  }

  return 'UPCOMING';
};

const buildSeverity = (status: DueStatus) => {
  if (status === 'OVERDUE') return 'HIGH';
  if (status === 'DUE_SOON') return 'MEDIUM';
  return 'INFO';
};

const upsertSystemNotification = async (input: {
  module: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  entityType?: string;
  entityId?: string;
  scheduledFor?: Date | null;
  metadata?: Record<string, unknown>;
  dedupeKey: string;
}) => {
  const metadata = (input.metadata ?? {}) as Prisma.InputJsonValue;
  await prisma.notification.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {
      title: input.title,
      message: input.message,
      severity: input.severity,
      entityType: input.entityType,
      entityId: input.entityId,
      scheduledFor: input.scheduledFor ?? null,
      metadata,
    },
    create: {
      userId: null,
      username: null,
      role: null,
      module: input.module,
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity,
      entityType: input.entityType,
      entityId: input.entityId,
      status: 'UNREAD',
      dedupeKey: input.dedupeKey,
      metadata,
      scheduledFor: input.scheduledFor ?? null,
    },
  });
};

export const sweepNotifications = async (now = new Date()) => {
  const lookahead = new Date(now);
  lookahead.setDate(lookahead.getDate() + getLookaheadDays());

  const [assignments, calibrationEvents, overdueWorkOrders] = await Promise.all([
    prisma.maintenancePlanAssignment.findMany({
      where: {
        isActive: true,
        nextDueDate: { not: null, lte: lookahead },
      },
      include: {
        functionalLocation: true,
        strategy: true,
      },
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.calibrationEvent.findMany({
      where: {
        nextDueDate: { lte: lookahead },
      },
      include: {
        instrument: true,
      },
      orderBy: { nextDueDate: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        scheduledDate: { not: null, lt: now },
      },
      include: {
        functionalLocation: true,
      },
      orderBy: { scheduledDate: 'asc' },
    }),
  ]);

  let processed = 0;

  for (const assignment of assignments) {
    if (!assignment.nextDueDate) continue;
    const status = classifyDueStatus(assignment.nextDueDate, assignment.alertLeadDays || 14, now);
    if (status === 'UPCOMING') continue;

    await upsertSystemNotification({
      module: 'PMS',
      type: 'PM_DUE',
      title: `${status === 'OVERDUE' ? 'Overdue' : 'Upcoming'} PM: ${assignment.strategy.name}`,
      message: `${assignment.functionalLocation.name} requires ${assignment.strategy.name} on ${assignment.nextDueDate.toISOString().slice(0, 10)}`,
      severity: buildSeverity(status),
      entityType: 'MaintenancePlanAssignment',
      entityId: assignment.id,
      scheduledFor: assignment.nextDueDate,
      metadata: {
        status,
        flId: assignment.flId,
        strategyId: assignment.strategyId,
        strategyName: assignment.strategy.name,
      },
      dedupeKey: `PM_DUE:${assignment.id}:${status}:${assignment.nextDueDate.toISOString().slice(0, 10)}`,
    });
    processed += 1;
  }

  for (const event of calibrationEvents) {
    const status = classifyDueStatus(event.nextDueDate, 14, now);
    if (status === 'UPCOMING') continue;

    await upsertSystemNotification({
      module: 'CALIBRATION',
      type: 'CALIBRATION_DUE',
      title: `${status === 'OVERDUE' ? 'Overdue' : 'Upcoming'} calibration: ${event.instrumentTagId}`,
      message: `${event.instrument.description} is due for calibration on ${event.nextDueDate.toISOString().slice(0, 10)}`,
      severity: buildSeverity(status),
      entityType: 'CalibrationEvent',
      entityId: event.id,
      scheduledFor: event.nextDueDate,
      metadata: {
        status,
        instrumentTagId: event.instrumentTagId,
        certificateNo: event.certificateNo,
      },
      dedupeKey: `CAL_DUE:${event.id}:${status}:${event.nextDueDate.toISOString().slice(0, 10)}`,
    });
    processed += 1;
  }

  for (const workOrder of overdueWorkOrders) {
    if (!workOrder.scheduledDate) continue;

    await upsertSystemNotification({
      module: 'WORKORDER',
      type: 'WORKORDER_OVERDUE',
      title: `Overdue work order: ${workOrder.woNumber}`,
      message: `${workOrder.functionalLocation.name} work order was scheduled for ${workOrder.scheduledDate.toISOString().slice(0, 10)}`,
      severity: 'HIGH',
      entityType: 'WorkOrder',
      entityId: workOrder.id,
      scheduledFor: workOrder.scheduledDate,
      metadata: {
        status: 'OVERDUE',
        woNumber: workOrder.woNumber,
        flId: workOrder.flId,
      },
      dedupeKey: `WO_OVERDUE:${workOrder.id}:${workOrder.scheduledDate.toISOString().slice(0, 10)}`,
    });
    processed += 1;
  }

  logger.info('notification_sweep_completed', {
    processed,
    assignments: assignments.length,
    calibrationEvents: calibrationEvents.length,
    overdueWorkOrders: overdueWorkOrders.length,
  });

  return {
    processed,
    assignments: assignments.length,
    calibrationEvents: calibrationEvents.length,
    overdueWorkOrders: overdueWorkOrders.length,
  };
};
