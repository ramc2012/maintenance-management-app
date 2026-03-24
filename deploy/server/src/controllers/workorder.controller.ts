import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// WORK ORDERS CRUD
// ============================================================================

export const getWorkOrders = async (req: Request, res: Response) => {
  try {
    const { flId, status, woType } = req.query;
    const where: any = {};
    if (flId) where.flId = String(flId);
    if (status) where.status = String(status);
    if (woType) where.woType = String(woType);
    
    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        functionalLocation: { include: { currentAsset: true, system: true } },
        assignment: { include: { strategy: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
};

export const getWorkOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        functionalLocation: {
          include: {
            currentAsset: true,
            system: { include: { area: { include: { site: true } } } }
          }
        },
        assignment: { include: { strategy: { include: { tasks: true } } } }
      }
    });
    res.json(wo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
};

// Generate unique WO number
const generateWONumber = async (): Promise<string> => {
  const today = new Date();
  const prefix = `WO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.workOrder.count({
    where: { woNumber: { startsWith: prefix } }
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const createWorkOrder = async (req: Request, res: Response) => {
  try {
    const woNumber = await generateWONumber();
    const wo = await prisma.workOrder.create({
      data: { ...req.body, woNumber }
    });
    res.json(wo);
  } catch (error) {
    console.error('Create WO Error:', error);
    res.status(500).json({ error: 'Failed to create work order' });
  }
};

export const updateWorkOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wo = await prisma.workOrder.update({ where: { id }, data: req.body });
    res.json(wo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update work order' });
  }
};

// ============================================================================
// CLOSE WORK ORDER (With Counter Updates)
// ============================================================================

export const closeWorkOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      failureMode, causeCode, actionTaken, meterReading,
      labourHours, downtime, remarks, closedBy,
      teamMembers, // Array of team member objects
      checklistUpdates // Array of {id, isCompleted, completedBy}
    } = req.body;

    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: { assignment: true, functionalLocation: true }
    });

    if (!wo) return res.status(404).json({ error: 'Work order not found' });

    const now = new Date();

    // Update the work order
    const updatedWO = await prisma.workOrder.update({
      where: { id },
      data: {
        status: 'CLOSED',
        completionDate: now,
        failureMode,
        causeCode,
        actionTaken,
        meterReading,
        labourHours,
        downtime,
        remarks,
        closedBy
      }
    });

    // Save team members if provided
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      await prisma.workOrderTeam.createMany({
        data: teamMembers.map((m: any) => ({
          workOrderId: id,
          employeeId: m.employeeId,
          employeeName: m.employeeName,
          designation: m.designation,
          department: m.department,
          role: m.role || 'TECHNICIAN',
          isContractor: m.isContractor || false,
          companyName: m.companyName,
          startTime: m.startTime ? new Date(m.startTime) : wo.startDate,
          endTime: m.endTime ? new Date(m.endTime) : now,
          hoursWorked: m.hoursWorked
        })),
        skipDuplicates: false
      });
    }

    // Update checklist if provided
    if (checklistUpdates && Array.isArray(checklistUpdates)) {
      for (const item of checklistUpdates) {
        await prisma.workOrderChecklist.update({
          where: { id: item.id },
          data: {
            isCompleted: item.isCompleted,
            completedBy: item.completedBy || closedBy,
            completedAt: item.isCompleted ? now : null
          }
        });
      }
    }

    // AUTO-CREATE MaintenanceLog entry when WO is closed
    // This automatically saves the report in the equipment maintenance log
    try {
      const equipmentTag = wo.functionalLocation?.currentAssetId || null;

      // Find related installation from FL hierarchy
      let installationId: string | null = null;
      if (wo.flId) {
        const fl = await prisma.functionalLocation.findUnique({
          where: { id: wo.flId },
          include: { system: { include: { area: { include: { site: true } } } } }
        });
        // Try to find installation by site name match
        if (fl?.system?.area?.site) {
          const install = await prisma.installation.findFirst({
            where: { installationId: fl.system.area.site.siteId }
          });
          installationId = install?.id || null;
        }
      }

      if (installationId) {
        const teamNames = Array.isArray(teamMembers) && teamMembers.length > 0
          ? teamMembers.map((m: any) => m.employeeName).join(', ')
          : closedBy || 'System';

        await prisma.maintenanceLog.create({
          data: {
            date: now,
            installationId,
            department: 'MAINTENANCE',
            section: 'GENERAL',
            jobType: wo.woType === 'PREVENTIVE' ? 'PM' : 'BD',
            reportCriticality: wo.priority === 'EMERGENCY' ? 3 : wo.priority === 'HIGH' ? 2 : 1,
            equipmentTag: equipmentTag || wo.woNumber,
            serviceLine: 'RUNNING_EQUIPMENT',
            notificationNo: wo.woNumber,
            description: wo.description,
            status: 'Closed',
            startTime: wo.startDate || wo.createdAt,
            endTime: now,
            durationHours: labourHours || 0,
            remarks: `WO Closed: ${remarks || ''} | Action: ${actionTaken || ''} | Failure: ${failureMode || 'N/A'}`,
            createdBy: closedBy || 'system',
            assignedBy: wo.assignedBy || 'System'
          }
        });
      }
    } catch (logErr) {
      // Don't fail the WO closure if maintenance log creation fails
      console.warn('Could not auto-create MaintenanceLog for WO closure:', logErr);
    }

    // If linked to a PMS assignment, update the counters
    if (wo.assignment) {
      let nextDueDate: Date | null = null;
      let nextDueReading: number | null = null;

      if (wo.assignment.triggerType === 'TIME') {
        nextDueDate = new Date(now);
        if (wo.assignment.intervalUnit === 'DAYS') {
          nextDueDate.setDate(nextDueDate.getDate() + wo.assignment.intervalValue);
        } else if (wo.assignment.intervalUnit === 'MONTHS') {
          nextDueDate.setMonth(nextDueDate.getMonth() + wo.assignment.intervalValue);
        }
      } else if (wo.assignment.triggerType === 'USAGE' && meterReading) {
        nextDueReading = meterReading + wo.assignment.intervalValue;
      }

      await prisma.maintenancePlanAssignment.update({
        where: { id: wo.assignment.id },
        data: {
          lastDoneDate: now,
          lastDoneReading: meterReading,
          nextDueDate,
          nextDueReading
        }
      });
    }

    res.json({ message: 'Work order closed', workOrder: updatedWO });
  } catch (error) {
    console.error('Close WO Error:', error);
    res.status(500).json({ error: 'Failed to close work order' });
  }
};

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export const getStats = async (req: Request, res: Response) => {
  try {
    const [open, inProgress, closed, overdue] = await Promise.all([
      prisma.workOrder.count({ where: { status: 'OPEN' } }),
      prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.workOrder.count({ where: { status: 'CLOSED' } }),
      prisma.workOrder.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          scheduledDate: { lt: new Date() }
        }
      })
    ]);
    
    // By type
    const byType = await prisma.workOrder.groupBy({
      by: ['woType'],
      _count: true
    });
    
    // Recent closures with failure modes
    const recentFailures = await prisma.workOrder.findMany({
      where: { status: 'CLOSED', failureMode: { not: null } },
      select: { failureMode: true, causeCode: true, woType: true },
      take: 100,
      orderBy: { completionDate: 'desc' }
    });
    
    // Top failure modes
    const failureModeCount: Record<string, number> = {};
    for (const wo of recentFailures) {
      if (wo.failureMode) {
        failureModeCount[wo.failureMode] = (failureModeCount[wo.failureMode] || 0) + 1;
      }
    }
    
    res.json({
      counts: { open, inProgress, closed, overdue },
      byType,
      topFailureModes: Object.entries(failureModeCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ============================================================================
// ISO 14224 REFERENCE CODES
// ============================================================================

export const getFailureModes = async (req: Request, res: Response) => {
  try {
    const modes = await prisma.failureMode.findMany({ orderBy: { code: 'asc' } });
    res.json(modes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failure modes' });
  }
};

export const getCauseCodes = async (req: Request, res: Response) => {
  try {
    const codes = await prisma.causeCode.findMany({ orderBy: { code: 'asc' } });
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cause codes' });
  }
};

export const getActionCodes = async (req: Request, res: Response) => {
  try {
    const codes = await prisma.actionCode.findMany({ orderBy: { code: 'asc' } });
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch action codes' });
  }
};

// Seed ISO 14224 codes
export const seedIsoCodes = async (req: Request, res: Response) => {
  try {
    // Failure Modes
    await prisma.failureMode.createMany({
      data: [
        { code: 'BRD', name: 'Bearing Damage' },
        { code: 'LKG', name: 'Leakage' },
        { code: 'STK', name: 'Stuck/Seized' },
        { code: 'SHV', name: 'High Vibration' },
        { code: 'OHT', name: 'Overheating' },
        { code: 'ELF', name: 'Electrical Failure' },
        { code: 'INL', name: 'Instrument Loop Failure' },
        { code: 'CAL', name: 'Calibration Drift' },
        { code: 'WER', name: 'Wear' },
        { code: 'CRK', name: 'Cracking' },
        { code: 'COR', name: 'Corrosion' },
        { code: 'ERO', name: 'Erosion' }
      ],
      skipDuplicates: true
    });
    
    // Cause Codes
    await prisma.causeCode.createMany({
      data: [
        { code: 'LUB', name: 'Lubrication Failure' },
        { code: 'WER', name: 'Normal Wear' },
        { code: 'OVL', name: 'Overload' },
        { code: 'AGE', name: 'Aging/Fatigue' },
        { code: 'MIS', name: 'Misalignment' },
        { code: 'VIB', name: 'Vibration' },
        { code: 'CON', name: 'Contamination' },
        { code: 'COR', name: 'Corrosion' },
        { code: 'OPE', name: 'Operating Error' },
        { code: 'DES', name: 'Design Error' },
        { code: 'FAB', name: 'Fabrication Error' },
        { code: 'INS', name: 'Installation Error' }
      ],
      skipDuplicates: true
    });
    
    // Action Codes
    await prisma.actionCode.createMany({
      data: [
        { code: 'REPLACE', name: 'Replace' },
        { code: 'REPAIR', name: 'Repair' },
        { code: 'ADJUST', name: 'Adjust/Align' },
        { code: 'CLEAN', name: 'Clean' },
        { code: 'LUBRICATE', name: 'Lubricate' },
        { code: 'CALIBRATE', name: 'Calibrate' },
        { code: 'MODIFY', name: 'Modify' },
        { code: 'INSPECT', name: 'Inspect Only' },
        { code: 'NONE', name: 'No Action Required' }
      ],
      skipDuplicates: true
    });
    
    res.json({ message: 'ISO 14224 codes seeded' });
  } catch (error) {
    console.error('Seed Error:', error);
    res.status(500).json({ error: 'Failed to seed codes' });
  }
};

// Get Work Order with Team Members
export const getWorkOrderWithTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        functionalLocation: {
          include: {
            currentAsset: true,
            system: { include: { area: { include: { site: true } } } }
          }
        },
        assignment: { include: { strategy: { include: { tasks: true } } } },
        teamMembers: true,
        checklist: { orderBy: { sequence: 'asc' } }
      }
    });
    res.json(wo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
};

// Add Team Member to WO
export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const member = await prisma.workOrderTeam.create({
      data: { ...req.body, workOrderId: req.params.id }
    });
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add team member' });
  }
};

// Add Checklist Item
export const addChecklistItem = async (req: Request, res: Response) => {
  try {
    const item = await prisma.workOrderChecklist.create({
      data: { ...req.body, workOrderId: req.params.id }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add checklist item' });
  }
};

// Update Checklist Item
export const updateChecklistItem = async (req: Request, res: Response) => {
  try {
    const item = await prisma.workOrderChecklist.update({
      where: { id: req.params.itemId },
      data: req.body
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
};

export const deleteWorkOrder = async (req: Request, res: Response) => {
  try {
    // Delete related records first
    await prisma.workOrderTeam.deleteMany({ where: { workOrderId: req.params.id } });
    await prisma.workOrderChecklist.deleteMany({ where: { workOrderId: req.params.id } });
    await prisma.maintenanceRequest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Work order deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete work order' });
  }
};
