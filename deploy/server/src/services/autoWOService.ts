import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Generate unique WO number
const generateWONumber = async (): Promise<string> => {
  const today = new Date();
  const prefix = `WO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.workOrder.count({
    where: { woNumber: { startsWith: prefix } }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Check TIME-based PMS triggers and create WOs for overdue assignments
 */
const checkTimeBasedTriggers = async (now: Date): Promise<number> => {
  let created = 0;

  const dueAssignments = await prisma.maintenancePlanAssignment.findMany({
    where: {
      isActive: true,
      triggerType: 'TIME',
      nextDueDate: { not: null, lte: now }
    },
    include: {
      functionalLocation: true,
      strategy: { include: { tasks: true } },
      workOrders: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
      }
    }
  });

  for (const assignment of dueAssignments) {
    // Skip if there's already an open/in-progress WO for this assignment
    if (assignment.workOrders.length > 0) continue;

    try {
      const woNumber = await generateWONumber();
      const taskDescriptions = assignment.strategy.tasks
        .map(t => `${t.taskCode || ''}: ${t.description}`)
        .join('; ');

      await prisma.workOrder.create({
        data: {
          woNumber,
          flId: assignment.flId,
          assignmentId: assignment.id,
          woType: 'PREVENTIVE',
          priority: 'NORMAL',
          status: 'OPEN',
          description: `Auto-generated PM: ${assignment.strategy.name}. Tasks: ${taskDescriptions || assignment.strategy.description || 'See strategy'}`,
          scheduledDate: assignment.nextDueDate,
          createdBy: 'AUTO-PMS'
        }
      });
      created++;
    } catch (err) {
      logger.error('auto_wo_time_trigger_failed', { assignmentId: assignment.id, error: String(err) });
    }
  }

  return created;
};

/**
 * Check USAGE-based PMS triggers by comparing logbook readings
 */
const checkUsageBasedTriggers = async (): Promise<number> => {
  let created = 0;

  const usageAssignments = await prisma.maintenancePlanAssignment.findMany({
    where: {
      isActive: true,
      triggerType: 'USAGE',
      nextDueReading: { not: null }
    },
    include: {
      functionalLocation: {
        include: { assetAssignments: true }
      },
      strategy: { include: { tasks: true } },
      workOrders: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
      }
    }
  });

  for (const assignment of usageAssignments) {
    if (assignment.workOrders.length > 0) continue;
    if (!assignment.nextDueReading) continue;

    // Find the equipment tag linked to this FL
    const assetAssignment = assignment.functionalLocation.assetAssignments?.find(
      a => a.assetType === 'RUNNING_EQUIPMENT' && a.isActive
    );
    if (!assetAssignment) continue;

    // Get latest logbook reading for this equipment
    const latestLog = await prisma.equipmentLog.findFirst({
      where: { equipmentTag: assetAssignment.assetTag },
      orderBy: { date: 'desc' }
    });

    if (!latestLog?.cumulativeMeterReading) continue;

    // Check if meter reading exceeds next due reading
    if (latestLog.cumulativeMeterReading >= assignment.nextDueReading) {
      try {
        const woNumber = await generateWONumber();
        const taskDescriptions = assignment.strategy.tasks
          .map(t => `${t.taskCode || ''}: ${t.description}`)
          .join('; ');

        await prisma.workOrder.create({
          data: {
            woNumber,
            flId: assignment.flId,
            assignmentId: assignment.id,
            woType: 'PREVENTIVE',
            priority: 'NORMAL',
            status: 'OPEN',
            description: `Auto-generated PM (Usage): ${assignment.strategy.name} at ${latestLog.cumulativeMeterReading} ${assignment.intervalUnit}. Tasks: ${taskDescriptions || 'See strategy'}`,
            scheduledDate: new Date(),
            meterReading: latestLog.cumulativeMeterReading,
            createdBy: 'AUTO-PMS'
          }
        });
        created++;
      } catch (err) {
        logger.error('auto_wo_usage_trigger_failed', { assignmentId: assignment.id, error: String(err) });
      }
    }
  }

  return created;
};

/**
 * Check PMS schedule-based triggers (B-check, C-check, D-check by hours)
 * Maps PMSchedule frequency to equipment running hours from logbook
 */
const checkPMScheduleHoursTriggers = async (): Promise<number> => {
  let created = 0;

  // Get all PMS initial states (these track PM schedules for specific equipment)
  const initialStates = await prisma.pMSInitialState.findMany({
    include: {
      equipment: true,
      pmsSchedule: {
        include: { equipmentType: true, instrumentType: true }
      }
    }
  });

  for (const state of initialStates) {
    // Get latest cumulative meter reading from logbook
    const latestLog = await prisma.equipmentLog.findFirst({
      where: { equipmentTag: state.equipmentTag },
      orderBy: { date: 'desc' }
    });

    if (!latestLog?.cumulativeMeterReading) continue;

    // Parse frequency to determine interval in hours
    const freq = state.pmsSchedule.frequency.toUpperCase();
    let intervalHours = 0;

    // Common patterns: "500 HRS", "B-CHECK 500 HRS", "1000 HOURS", "EVERY 500 HRS"
    const hoursMatch = freq.match(/(\d+)\s*(?:HRS?|HOURS?)/i);
    if (hoursMatch) {
      intervalHours = parseInt(hoursMatch[1]);
    }

    if (intervalHours <= 0) continue;

    // Calculate hours since last done
    const hoursSinceLastDone = latestLog.cumulativeMeterReading - state.initialLastDoneHours;

    // Check if it's time for PM
    if (hoursSinceLastDone >= intervalHours) {
      // Check if WO already exists for this equipment + schedule
      const existingWO = await prisma.workOrder.findFirst({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          description: { contains: state.pmsSchedule.taskDescription },
          createdBy: 'AUTO-PMS'
        }
      });

      if (existingWO) continue;

      try {
        // Need a functional location for the WO - try to find one
        const flAssignment = await prisma.fLAssetAssignment.findFirst({
          where: { assetTag: state.equipmentTag, isActive: true }
        });

        if (!flAssignment) continue;

        const woNumber = await generateWONumber();
        await prisma.workOrder.create({
          data: {
            woNumber,
            flId: flAssignment.flId,
            woType: 'PREVENTIVE',
            priority: 'NORMAL',
            status: 'OPEN',
            description: `Auto-generated from PMS: ${state.pmsSchedule.taskDescription} (${state.pmsSchedule.frequency}) for ${state.equipmentTag}. Current reading: ${latestLog.cumulativeMeterReading} hrs, Last done: ${state.initialLastDoneHours} hrs`,
            scheduledDate: new Date(),
            meterReading: latestLog.cumulativeMeterReading,
            createdBy: 'AUTO-PMS'
          }
        });
        created++;
      } catch (err) {
        logger.error('auto_wo_pms_hours_failed', { equipmentTag: state.equipmentTag, error: String(err) });
      }
    }
  }

  return created;
};

/**
 * Main entry point: Run all auto-WO checks
 */
export const runAutoWOGeneration = async () => {
  const now = new Date();
  logger.info('auto_wo_generation_started', { timestamp: now.toISOString() });

  const timeWOs = await checkTimeBasedTriggers(now);
  const usageWOs = await checkUsageBasedTriggers();
  const pmsHoursWOs = await checkPMScheduleHoursTriggers();

  const result = {
    timestamp: now.toISOString(),
    created: {
      timeBased: timeWOs,
      usageBased: usageWOs,
      pmsHoursBased: pmsHoursWOs,
      total: timeWOs + usageWOs + pmsHoursWOs
    }
  };

  logger.info('auto_wo_generation_completed', result);
  return result;
};
