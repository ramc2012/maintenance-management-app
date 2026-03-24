import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get MOH Dashboard with installation-wise status
export const getMOHDashboard = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);
    
    // Get all MOH records for dashboard
    const mohRecords = await prisma.mOHRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    // Get equipment with D check schedules
    const pmsSchedules = await prisma.pMSchedule.findMany({
      
      include: { equipmentType: true }
    });
    
    // Stats
    const [total, planned, inProgress, completed] = await Promise.all([
      prisma.mOHRecord.count({ where }),
      prisma.mOHRecord.count({ where: { ...where, status: 'PLANNED' } }),
      prisma.mOHRecord.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.mOHRecord.count({ where: { ...where, status: 'COMPLETED' } })
    ]);
    
    // Group by installation
    const byInstallation: Record<string, any[]> = {};
    mohRecords.forEach(m => {
      if (!byInstallation[m.installationId]) byInstallation[m.installationId] = [];
      byInstallation[m.installationId].push(m);
    });
    
    // Overdue MOHs (running hours exceeded D check interval)
    const overdue = mohRecords.filter(m => 
      m.status !== 'COMPLETED' && 
      m.currentRunHours && 
      m.dCheckInterval && 
      m.currentRunHours >= m.dCheckInterval * 0.9
    );
    
    res.json({
      stats: { total, planned, inProgress, completed },
      byInstallation,
      pmsSchedules,
      overdue,
      recentMOH: mohRecords.slice(0, 10)
    });
  } catch (error) {
    console.error('MOH Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch MOH dashboard' });
  }
};

// Get all MOH records
export const getMOHRecords = async (req: Request, res: Response) => {
  try {
    const { installationId, status } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);
    if (status) where.status = String(status);
    
    const records = await prisma.mOHRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MOH records' });
  }
};

// Get MOH by ID
export const getMOHById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.mOHRecord.findUnique({ where: { id } });
    if (!record) return res.status(404).json({ error: 'MOH record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MOH record' });
  }
};

// Initiate new MOH workflow
export const initiateMOH = async (req: Request, res: Response) => {
  try {
    const count = await prisma.mOHRecord.count();
    const mohNumber = `MOH-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    const record = await prisma.mOHRecord.create({
      data: {
        ...req.body,
        mohNumber,
        status: 'PLANNED'
      }
    });
    res.json(record);
  } catch (error) {
    console.error('Initiate MOH Error:', error);
    res.status(500).json({ error: 'Failed to initiate MOH' });
  }
};

// Update MOH record
export const updateMOH = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.mOHRecord.update({
      where: { id },
      data: req.body
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update MOH record' });
  }
};

// Update MOH status
export const updateMOHStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actualStartDate, completedDate } = req.body;
    
    const updateData: any = { status };
    if (status === 'IN_PROGRESS' && !actualStartDate) {
      updateData.actualStartDate = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completedDate = completedDate || new Date();
    }
    
    const record = await prisma.mOHRecord.update({
      where: { id },
      data: updateData
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update MOH status' });
  }
};

// Link MOH to procurement case
export const linkToProcurement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { procurementCaseId } = req.body;
    
    const record = await prisma.mOHRecord.update({
      where: { id },
      data: { procurementCaseId }
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Failed to link to procurement' });
  }
};

export const deleteMOH = async (req: Request, res: Response) => {
  try {
    await prisma.mOHRecord.delete({ where: { id: req.params.id } });
    res.json({ message: 'MOH record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete MOH record' });
  }
};
