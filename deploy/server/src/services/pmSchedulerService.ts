import prisma from '../lib/prisma';
import logger from '../lib/logger';

/**
 * PM Auto-Scheduler
 * Runs daily at 6am (configured in index.ts via node-cron).
 * Finds MaintenancePlanAssignments that are due (nextDueDate <= today + alertLeadDays)
 * and auto-creates a PREVENTIVE WorkOrder if none already exists.
 */
export const runPMAutoScheduler = async (): Promise<void> => {
  const now = new Date();

  try {
    // Find all active assignments where PM is due within alertLeadDays
    const dueAssignments = await prisma.maintenancePlanAssignment.findMany({
      where: {
        isActive: true,
        nextDueDate: { not: null, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }, // 30 day lookahead
      },
      include: {
        functionalLocation: true,
        strategy: { include: { tasks: { orderBy: { sequence: 'asc' } } } },
      },
    });

    let created = 0;
    let skipped = 0;

    for (const assignment of dueAssignments) {
      if (!assignment.nextDueDate) continue;

      // Check if an open/in-progress WO already exists for this assignment
      const existingWO = await prisma.workOrder.findFirst({
        where: {
          assignmentId: assignment.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (existingWO) {
        skipped++;
        continue;
      }

      // Generate WO number
      const prefix = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await prisma.workOrder.count({ where: { woNumber: { startsWith: prefix } } });
      const woNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

      // Create the Work Order
      const wo = await prisma.workOrder.create({
        data: {
          woNumber,
          flId: assignment.flId,
          assignmentId: assignment.id,
          woType: 'PREVENTIVE',
          priority: 'NORMAL',
          status: 'OPEN',
          description: `Auto-generated PM: ${assignment.strategy.name}`,
          scheduledDate: assignment.nextDueDate,
          createdBy: 'PM_SCHEDULER',
          assignedBy: 'System',
        },
      });

      // Create checklist from strategy tasks
      if (assignment.strategy.tasks.length > 0) {
        await prisma.workOrderChecklist.createMany({
          data: assignment.strategy.tasks.map(task => ({
            workOrderId: wo.id,
            taskCode: task.taskCode,
            description: task.description,
            sequence: task.sequence,
            isCompleted: false,
          })),
        });
      }

      // Create notification for the new PM WO
      const daysUntilDue = Math.ceil(
        (assignment.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysUntilDue < 0;

      await prisma.notification.upsert({
        where: {
          dedupeKey: `PM_WO_CREATED:${wo.id}:${now.toISOString().slice(0, 10)}`,
        },
        update: {},
        create: {
          userId: null,
          username: null,
          role: null,
          module: 'PMS',
          type: 'PM_WO_CREATED',
          title: `PM Work Order Created: ${wo.woNumber}`,
          message: `${assignment.functionalLocation.name} — ${assignment.strategy.name} — ${
            isOverdue ? 'OVERDUE' : `due in ${daysUntilDue} days`
          }`,
          severity: isOverdue ? 'HIGH' : daysUntilDue <= 7 ? 'MEDIUM' : 'INFO',
          entityType: 'WorkOrder',
          entityId: wo.id,
          status: 'UNREAD',
          dedupeKey: `PM_WO_CREATED:${wo.id}:${now.toISOString().slice(0, 10)}`,
          scheduledFor: assignment.nextDueDate,
          metadata: {
            woNumber: wo.woNumber,
            strategyName: assignment.strategy.name,
            flName: assignment.functionalLocation.name,
            daysUntilDue,
          },
        },
      }).catch(() => {}); // non-critical if notification fails

      created++;
    }

    logger.info('pm_scheduler_completed', {
      dueAssignments: dueAssignments.length,
      created,
      skipped,
    });

    console.log(`[PM Scheduler] ${now.toISOString()} — Created ${created} WOs, skipped ${skipped} (existing open WO)`);
  } catch (error) {
    logger.error('pm_scheduler_error', { error: (error as Error).message });
    console.error('[PM Scheduler] Error:', error);
  }
};
