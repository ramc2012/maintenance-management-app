import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Maintenance Logs ---

export const getMaintenanceLogs = async (req: Request, res: Response) => {
  try {
    const { date, installationId, department, status, criticality } = req.query;

    const where: any = {};
    if (date) where.date = new Date(date as string);
    if (installationId) where.installationId = installationId;
    if (department) where.department = department;
    if (status) where.status = status;
    if (criticality) where.reportCriticality = parseInt(criticality as string);

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        installation: true,
        teamMembers: {
          include: { manpower: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
};

/**
 * Syncs a DPR maintenance entry to EquipmentLog for RUNNING_EQUIPMENT only.
 * Instruments are already stored in MaintenanceLog (the authoritative history for all assets).
 * Silently skips on error so the main log creation never fails.
 */
async function syncDprToEquipmentLog(params: {
  equipmentTag: string;
  assetCategory: string;
  date: string;
  jobType: string;
  description: string;
  remarks?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  createdBy: string;
  maintenanceLogId: string;
}) {
  if (params.assetCategory !== 'RUNNING_EQUIPMENT') return;

  try {
    // Verify the tag exists in RunningEquipmentMaster before writing
    const equipment = await prisma.runningEquipmentMaster.findUnique({
      where: { equipmentTag: params.equipmentTag },
      select: { equipmentTag: true }
    });
    if (!equipment) {
      console.warn(`DPR sync: tag "${params.equipmentTag}" not in RunningEquipmentMaster — skipping`);
      return;
    }

    await prisma.equipmentLog.create({
      data: {
        date: new Date(params.date),
        shift: 'DAY',
        equipmentTag: params.equipmentTag,
        runStatus: params.jobType !== 'BD',
        startTime: params.startTime ? new Date(params.startTime) : undefined,
        stopTime: params.endTime ? new Date(params.endTime) : undefined,
        totalRunHours: params.durationHours || 0,
        remarks: `[DPR-${params.jobType}] ${params.description}${params.remarks ? ' | ' + params.remarks : ''} (ref:${params.maintenanceLogId})`,
        assignedBy: params.createdBy || 'DPR System'
      }
    });

    console.log(`DPR synced to EquipmentLog: ${params.equipmentTag} (ref:${params.maintenanceLogId})`);
  } catch (err) {
    console.warn('DPR→EquipmentLog sync failed:', err);
  }
}

export const createMaintenanceLog = async (req: Request, res: Response) => {
  try {
    const {
      date,
      installationId,
      department,
      section,
      jobType,
      reportCriticality,
      equipmentTag,
      equipmentType,       // 'INSTRUMENT' | 'RUNNING_EQUIPMENT' — asset category
      equipmentTypeName,   // human-readable type name, e.g. "Centrifugal Pump"
      notificationNo,
      description,
      status,
      startTime,
      endTime,
      durationHours,
      remarks,
      bdReportTime,
      teamReportTime,
      jobCompletionTime,
      teamMemberIds,
      createdBy
    } = req.body;

    const log = await prisma.maintenanceLog.create({
      data: {
        date: new Date(date),
        installationId,
        department,
        section,
        jobType,
        reportCriticality,
        equipmentTag,
        // serviceLine = asset category (INSTRUMENT / RUNNING_EQUIPMENT)
        serviceLine: equipmentType || null,
        // equipmentTypeName = readable type name (NOT the category)
        equipmentTypeName: (equipmentTypeName && equipmentTypeName !== equipmentType)
          ? equipmentTypeName : null,
        notificationNo,
        description,
        status,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        durationHours: durationHours || 0,
        remarks,
        bdReportTime: bdReportTime ? new Date(bdReportTime) : undefined,
        teamReportTime: teamReportTime ? new Date(teamReportTime) : undefined,
        jobCompletionTime: jobCompletionTime ? new Date(jobCompletionTime) : undefined,
        createdBy,
        teamMembers: {
          create: (teamMemberIds || []).map((manpowerId: string) => ({ manpowerId }))
        }
      },
      include: {
        installation: true,
        teamMembers: { include: { manpower: true } }
      }
    });

    // Auto-save to EquipmentLog (running equipment only — instruments tracked via MaintenanceLog)
    if (equipmentTag) {
      await syncDprToEquipmentLog({
        equipmentTag,
        assetCategory: equipmentType || 'RUNNING_EQUIPMENT',
        date,
        jobType,
        description,
        remarks,
        startTime,
        endTime,
        durationHours,
        createdBy: createdBy || 'DPR System',
        maintenanceLogId: log.id
      });
    }

    res.status(201).json(log);
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({ error: 'Failed to create maintenance log' });
  }
};

export const updateMaintenanceLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      date,
      installationId,
      department,
      section,
      jobType,
      reportCriticality,
      equipmentTag,
      equipmentType,
      equipmentTypeName,
      notificationNo,
      description,
      status,
      startTime,
      endTime,
      durationHours,
      remarks,
      bdReportTime,
      teamReportTime,
      jobCompletionTime,
      teamMemberIds
    } = req.body;

    await prisma.maintenanceLogTeam.deleteMany({ where: { maintenanceLogId: id } });

    const log = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        installationId,
        department,
        section,
        jobType,
        reportCriticality,
        equipmentTag,
        serviceLine: equipmentType || undefined,
        equipmentTypeName: (equipmentTypeName && equipmentTypeName !== equipmentType)
          ? equipmentTypeName : undefined,
        notificationNo,
        description,
        status,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        durationHours,
        remarks,
        bdReportTime: bdReportTime ? new Date(bdReportTime) : undefined,
        teamReportTime: teamReportTime ? new Date(teamReportTime) : undefined,
        jobCompletionTime: jobCompletionTime ? new Date(jobCompletionTime) : undefined,
        teamMembers: {
          create: (teamMemberIds || []).map((manpowerId: string) => ({ manpowerId }))
        }
      },
      include: {
        installation: true,
        teamMembers: { include: { manpower: true } }
      }
    });

    // Sync to EquipmentLog when job is closed (running equipment only)
    if (equipmentTag && status === 'Closed') {
      const actor = (req as any).user?.username || 'System';
      await syncDprToEquipmentLog({
        equipmentTag,
        assetCategory: equipmentType || 'RUNNING_EQUIPMENT',
        date: date || new Date().toISOString().split('T')[0],
        jobType: jobType || 'PM',
        description: description || '',
        remarks,
        startTime,
        endTime,
        durationHours,
        createdBy: actor,
        maintenanceLogId: id
      });
    }

    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance log' });
  }
};

/**
 * GET /api/maintenance/equipment/:tag/history
 * Unified maintenance history for any asset tag (instrument or running equipment).
 * Merges MaintenanceLog (DPR entries) + EquipmentLog (operational entries).
 */
export const getEquipmentMaintenanceHistory = async (req: Request, res: Response) => {
  try {
    const { tag } = req.params;
    const { limit = '100' } = req.query;
    const take = parseInt(limit as string);

    const [maintenanceLogs, equipmentLogs] = await Promise.all([
      prisma.maintenanceLog.findMany({
        where: { equipmentTag: tag },
        include: {
          installation: true,
          teamMembers: { include: { manpower: true } },
          pmsSchedule: { select: { taskDescription: true, frequency: true } }
        },
        orderBy: { date: 'desc' },
        take
      }),
      prisma.equipmentLog.findMany({
        where: {
          equipmentTag: tag,
          // Exclude entries auto-synced from DPR (to avoid duplication in display)
          NOT: { remarks: { startsWith: '[DPR-' } }
        },
        orderBy: { date: 'desc' },
        take
      })
    ]);

    const history = [
      ...maintenanceLogs.map(l => ({
        type: 'MAINTENANCE_LOG',
        date: l.date,
        source: l.jobType === 'BD' ? 'BREAKDOWN' : (l.jobType === 'PM' ? 'PREVENTIVE' : l.jobType),
        description: l.description,
        status: l.status,
        durationHours: l.durationHours,
        remarks: l.remarks,
        createdBy: l.createdBy,
        installation: l.installation?.installationId,
        notificationNo: l.notificationNo,
        reportCriticality: l.reportCriticality,
        pmsTask: l.pmsSchedule?.taskDescription,
        team: l.teamMembers?.map((tm: any) => tm.manpower?.name).filter(Boolean)
      })),
      ...equipmentLogs.map(el => ({
        type: 'EQUIPMENT_LOG',
        date: el.date,
        source: 'OPERATIONAL',
        description: el.runStatus ? `Running — ${el.totalRunHours?.toFixed(1) || 0} hrs` : 'Stopped',
        status: el.runStatus ? 'RUNNING' : 'STOPPED',
        durationHours: el.totalRunHours || 0,
        remarks: el.remarks,
        createdBy: el.assignedBy,
        installation: null,
        notificationNo: null,
        reportCriticality: 1,
        pmsTask: null,
        team: []
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      equipmentTag: tag,
      totalEntries: history.length,
      maintenanceCount: maintenanceLogs.length,
      operationalCount: equipmentLogs.length,
      history
    });
  } catch (error) {
    console.error('Equipment history error:', error);
    res.status(500).json({ error: 'Failed to fetch equipment maintenance history' });
  }
};

// --- Manpower ---

export const getManpower = async (req: Request, res: Response) => {
  try {
    const { department, section, isActive } = req.query;

    const where: any = {};
    if (department) where.department = department;
    if (section) where.section = section;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const manpower = await prisma.manpower.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(manpower);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch manpower' });
  }
};

export const createManpower = async (req: Request, res: Response) => {
  try {
    const { employeeId, name, department, section, designation } = req.body;
    const manpower = await prisma.manpower.create({
      data: { employeeId, name, department, section, designation }
    });
    res.status(201).json(manpower);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create manpower' });
  }
};

export const updateManpower = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeId, name, department, section, designation, isActive } = req.body;
    const manpower = await prisma.manpower.update({
      where: { id },
      data: { employeeId, name, department, section, designation, isActive }
    });
    res.json(manpower);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update manpower' });
  }
};

// --- Report Queries ---

export const getMonthlyReportLogs = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, installationId } = req.query;

    const where: any = { reportCriticality: { gte: 2 } };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (installationId) where.installationId = installationId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { installation: true, teamMembers: { include: { manpower: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly report logs' });
  }
};

export const getAnnualReportLogs = async (req: Request, res: Response) => {
  try {
    const { year, installationId } = req.query;

    const where: any = { reportCriticality: 3 };

    if (year) {
      const y = parseInt(year as string);
      where.date = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };
    }
    if (installationId) where.installationId = installationId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { installation: true, teamMembers: { include: { manpower: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annual report logs' });
  }
};
