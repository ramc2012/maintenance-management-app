import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Maintenance Logs ---

export const getMaintenanceLogs = async (req: Request, res: Response) => {
  try {
    const { date, installationId, department, status, criticality, equipmentTag } = req.query;
    
    const where: any = {};
    if (date) where.date = new Date(date as string);
    if (installationId) where.installationId = installationId;
    if (department) where.department = department;
    if (status) where.status = status;
    if (criticality) where.reportCriticality = parseInt(criticality as string);
    if (equipmentTag) where.equipmentTag = String(equipmentTag);
    
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
      teamMemberIds
    } = req.body;

    // Remove all existing team members
    await prisma.maintenanceLogTeam.deleteMany({
      where: { maintenanceLogId: id }
    });

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
    const { year, installationId } = req.query;
    
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
    const { from, to, installationId, jobType } = req.query;

    const where: any = {};
    if (jobType) where.jobType = String(jobType);
    if (installationId) where.installationId = String(installationId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(String(from));
      if (to) where.date.lte = new Date(String(to));
    }

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
