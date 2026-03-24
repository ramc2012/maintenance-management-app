import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all static equipment
export const getStaticEquipment = async (req: Request, res: Response) => {
  try {
    const { installationId, equipmentType, status } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);
    if (equipmentType) where.equipmentType = String(equipmentType);
    if (status) where.status = String(status);
    
    const equipment = await prisma.staticEquipment.findMany({
      where,
      orderBy: { tagNumber: 'asc' }
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch static equipment' });
  }
};

// Get by ID
export const getStaticEquipmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipment = await prisma.staticEquipment.findUnique({ where: { id } });
    if (!equipment) return res.status(404).json({ error: 'Not found' });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

// Create
export const createStaticEquipment = async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.staticEquipment.create({
      data: {
        ...req.body,
        installDate: req.body.installDate ? new Date(req.body.installDate) : null,
        lastInspection: req.body.lastInspection ? new Date(req.body.lastInspection) : null,
        nextInspection: req.body.nextInspection ? new Date(req.body.nextInspection) : null
      }
    });
    res.json(equipment);
  } catch (error) {
    console.error('Create Static Equipment Error:', error);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
};

// Update
export const updateStaticEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const equipment = await prisma.staticEquipment.update({
      where: { id },
      data: req.body
    });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipment' });
  }
};

// Delete
export const deleteStaticEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.staticEquipment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
};

// Get dashboard stats
export const getStaticEquipmentDashboard = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);
    
    const [total, operational, maintenance, shutdown] = await Promise.all([
      prisma.staticEquipment.count({ where }),
      prisma.staticEquipment.count({ where: { ...where, status: 'OPERATIONAL' } }),
      prisma.staticEquipment.count({ where: { ...where, status: 'UNDER_MAINTENANCE' } }),
      prisma.staticEquipment.count({ where: { ...where, status: 'SHUTDOWN' } })
    ]);
    
    // Group by type
    const byType = await prisma.staticEquipment.groupBy({
      by: ['equipmentType'],
      where,
      _count: true
    });
    
    // Inspection due (next 30 days)
    const inspectionDue = await prisma.staticEquipment.findMany({
      where: {
        ...where,
        nextInspection: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    });
    
    res.json({
      stats: { total, operational, maintenance, shutdown },
      byType: byType.map(t => ({ type: t.equipmentType, count: t._count })),
      inspectionDue
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};
