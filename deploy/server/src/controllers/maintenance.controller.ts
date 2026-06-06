import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  applyDisciplineScope,
  resolvePrimaryDisciplineForEquipmentTag,
  resolvePrimaryDisciplineForText,
  resolveScopedDisciplines,
} from '../services/disciplineAccess';

const prisma = new PrismaClient();

// --- Maintenance Logs ---

export const getMaintenanceLogs = async (req: Request, res: Response) => {
  try {
    const { date, installationId, department, status, criticality, equipmentTag, discipline, section } = req.query;
    
    const where: any = {};
    if (date) where.date = new Date(date as string);
    if (installationId) where.installationId = installationId;
    if (department) where.department = department;
    if (section) where.section = String(section);
    if (status) where.status = status;
    if (criticality) where.reportCriticality = parseInt(criticality as string);
    if (equipmentTag) where.equipmentTag = String(equipmentTag);
    applyDisciplineScope(where, 'primaryDiscipline', resolveScopedDisciplines(req.user, discipline));
    
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
      equipmentType,
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
      externalCrew,
      createdBy
    } = req.body;

    const primaryDiscipline = await resolvePrimaryDisciplineForEquipmentTag(
      prisma,
      equipmentTag,
      resolvePrimaryDisciplineForText(`${department} ${section} ${equipmentType}`),
    );

    const log = await prisma.maintenanceLog.create({
      data: {
        date: new Date(date),
        installationId,
        primaryDiscipline,
        department,
        section,
        jobType,
        reportCriticality,
        equipmentTag,
        equipmentTypeName: equipmentType,
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
        externalCrew: Array.isArray(externalCrew) ? externalCrew : undefined,
        createdBy,
        teamMembers: {
          create: (teamMemberIds || []).map((manpowerId: string) => ({
            manpowerId
          }))
        }
      },
      include: {
        installation: true,
        teamMembers: { include: { manpower: true } }
      }
    });

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
      externalCrew
    } = req.body;

    // Remove all existing team members
    await prisma.maintenanceLogTeam.deleteMany({
      where: { maintenanceLogId: id }
    });

    const existingLog = await prisma.maintenanceLog.findUnique({
      where: { id },
      select: { primaryDiscipline: true, equipmentTag: true, department: true, section: true, equipmentTypeName: true },
    });

    const resolvedPrimaryDiscipline = await resolvePrimaryDisciplineForEquipmentTag(
      prisma,
      equipmentTag || existingLog?.equipmentTag,
      resolvePrimaryDisciplineForText(
        `${department || existingLog?.department || ''} ${section || existingLog?.section || ''} ${equipmentType || existingLog?.equipmentTypeName || ''}`,
        existingLog?.primaryDiscipline || 'MECHANICAL',
      ),
    );

    const log = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        installationId,
        primaryDiscipline: resolvedPrimaryDiscipline,
        department,
        section,
        jobType,
        reportCriticality,
        equipmentTag,
        equipmentTypeName: equipmentType,
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
        externalCrew: Array.isArray(externalCrew) ? externalCrew : undefined,
        teamMembers: {
          create: (teamMemberIds || []).map((manpowerId: string) => ({
            manpowerId
          }))
        }
      },
      include: {
        installation: true,
        teamMembers: { include: { manpower: true } }
      }
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance log' });
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

export const getManpowerHours = async (req: Request, res: Response) => {
  try {
    const { date, from, to, department, section, isActive } = req.query;
    const targetDate = date ? new Date(String(date)) : new Date();
    const start = from ? new Date(String(from)) : new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = to ? new Date(String(to)) : new Date(start);
    end.setHours(23, 59, 59, 999);

    const manpowerWhere: any = {};
    if (department) manpowerWhere.department = String(department);
    if (section) manpowerWhere.section = String(section);
    if (isActive !== undefined) manpowerWhere.isActive = isActive === 'true';

    const [manpower, teamRows] = await Promise.all([
      prisma.manpower.findMany({
        where: manpowerWhere,
        orderBy: [{ section: 'asc' }, { name: 'asc' }],
      }),
      prisma.maintenanceLogTeam.findMany({
        where: {
          maintenanceLog: {
            date: { gte: start, lte: end },
            ...(department ? { department: String(department) } : {}),
            ...(section ? { section: String(section) } : {}),
          },
        },
        include: {
          manpower: true,
          maintenanceLog: {
            select: {
              id: true,
              date: true,
              department: true,
              section: true,
              durationHours: true,
              description: true,
              installation: { select: { installationId: true } },
            },
          },
        },
      }),
    ]);

    const hoursByManpower = new Map<string, { totalHours: number; jobs: any[] }>();
    teamRows.forEach((row) => {
      const bucket = hoursByManpower.get(row.manpowerId) ?? { totalHours: 0, jobs: [] };
      const hours = Number(row.maintenanceLog.durationHours || 0);
      bucket.totalHours += hours;
      bucket.jobs.push({
        logId: row.maintenanceLog.id,
        date: row.maintenanceLog.date,
        hours,
        department: row.maintenanceLog.department,
        section: row.maintenanceLog.section,
        installationId: row.maintenanceLog.installation?.installationId,
        description: row.maintenanceLog.description,
      });
      hoursByManpower.set(row.manpowerId, bucket);
    });

    const manpowerById = new Map(manpower.map((person) => [person.id, person]));
    teamRows.forEach((row) => {
      if (!manpowerById.has(row.manpowerId)) {
        manpowerById.set(row.manpowerId, row.manpower);
      }
    });

    const employees = Array.from(manpowerById.values()).map((person) => {
      const bucket = hoursByManpower.get(person.id) ?? { totalHours: 0, jobs: [] };
      return {
        ...person,
        totalHours: Number(bucket.totalHours.toFixed(2)),
        jobCount: bucket.jobs.length,
        jobs: bucket.jobs,
      };
    });

    res.json({
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      totalEmployees: employees.length,
      totalHours: Number(employees.reduce((sum, person) => sum + person.totalHours, 0).toFixed(2)),
      employees,
    });
  } catch (error) {
    console.error('Manpower hours error:', error);
    res.status(500).json({ error: 'Failed to fetch manpower hours' });
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
    const { startDate, endDate, installationId, discipline } = req.query;
    
    const where: any = {
      reportCriticality: { gte: 2 } // Significant and Critical
    };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (installationId) where.installationId = installationId;
    applyDisciplineScope(where, 'primaryDiscipline', resolveScopedDisciplines(req.user, discipline));
    
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        installation: true,
        teamMembers: { include: { manpower: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly report logs' });
  }
};

export const getAnnualReportLogs = async (req: Request, res: Response) => {
  try {
    const { year, installationId, discipline } = req.query;
    
    const where: any = {
      reportCriticality: 3 // Critical only
    };
    
    if (year) {
      const yearNum = parseInt(year as string);
      where.date = {
        gte: new Date(yearNum, 0, 1),
        lte: new Date(yearNum, 11, 31)
      };
    }
    if (installationId) where.installationId = installationId;
    applyDisciplineScope(where, 'primaryDiscipline', resolveScopedDisciplines(req.user, discipline));
    
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        installation: true,
        teamMembers: { include: { manpower: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch annual report logs' });
  }
};

// ============================================================================
// EXCEL EXPORT — MAINTENANCE LOGS
// ============================================================================

export const exportMaintenanceLogs = async (req: Request, res: Response) => {
  try {
    const ExcelJS = require('exceljs');
    const { from, to, installationId, jobType, discipline } = req.query;

    const where: any = {};
    if (jobType) where.jobType = String(jobType);
    if (installationId) where.installationId = String(installationId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) where.date.lte = new Date(String(to));
    }
    applyDisciplineScope(where, 'primaryDiscipline', resolveScopedDisciplines(req.user, discipline));

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        installation: { select: { installationId: true } },
        teamMembers: { include: { manpower: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 5000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ONGC MMS';
    const sheet = workbook.addWorksheet('Maintenance Logs');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Installation', key: 'installation', width: 16 },
      { header: 'Department', key: 'department', width: 14 },
      { header: 'Section', key: 'section', width: 14 },
      { header: 'Job Type', key: 'jobType', width: 10 },
      { header: 'Criticality', key: 'criticality', width: 12 },
      { header: 'Equipment Tag', key: 'equipmentTag', width: 18 },
      { header: 'Notification No', key: 'notificationNo', width: 18 },
      { header: 'Description', key: 'description', width: 45 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Duration (hrs)', key: 'duration', width: 14 },
      { header: 'BD Report Time', key: 'bdReport', width: 20 },
      { header: 'Team Report Time', key: 'teamReport', width: 20 },
      { header: 'Completion Time', key: 'completion', width: 20 },
      { header: 'Team', key: 'team', width: 35 },
      { header: 'Remarks', key: 'remarks', width: 35 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4FFD4' } };

    logs.forEach(log => {
      sheet.addRow({
        date: log.date.toISOString().slice(0, 10),
        installation: log.installation?.installationId || '',
        department: log.department,
        section: log.section,
        jobType: log.jobType,
        criticality: log.reportCriticality === 3 ? 'Critical' : log.reportCriticality === 2 ? 'Significant' : 'Routine',
        equipmentTag: log.equipmentTag || '',
        notificationNo: log.notificationNo || '',
        description: log.description,
        status: log.status,
        duration: log.durationHours,
        bdReport: log.bdReportTime ? new Date(log.bdReportTime).toISOString().slice(0, 16).replace('T', ' ') : '',
        teamReport: log.teamReportTime ? new Date(log.teamReportTime).toISOString().slice(0, 16).replace('T', ' ') : '',
        completion: log.jobCompletionTime ? new Date(log.jobCompletionTime).toISOString().slice(0, 16).replace('T', ' ') : '',
        team: log.teamMembers.map(m => m.manpower.name).join('; '),
        remarks: log.remarks || '',
      });
    });

    const filename = `MaintenanceLogs_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ error: 'Failed to export maintenance logs' });
  }
};
