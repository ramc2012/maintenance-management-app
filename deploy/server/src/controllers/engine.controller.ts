import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// ENGINE REGISTRY (Prime Movers)
// ============================================================================

export const getAllEngines = async (req: Request, res: Response) => {
  try {
    const engines = await prisma.engineRegistry.findMany({
      orderBy: { tagId: 'asc' }
    });
    res.json(engines);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch engines' });
  }
};

export const getEngineByTag = async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const engine = await prisma.engineRegistry.findUnique({ where: { tagId } });
    if (!engine) return res.status(404).json({ error: 'Engine not found' });
    res.json(engine);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch engine' });
  }
};

export const createEngine = async (req: Request, res: Response) => {
  try {
    const engine = await prisma.engineRegistry.create({ data: req.body });
    res.json(engine);
  } catch (error: any) {
    console.error('Create Engine Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create engine' });
  }
};

export const updateEngine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const engine = await prisma.engineRegistry.update({
      where: { id },
      data: req.body
    });
    res.json(engine);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update engine' });
  }
};

export const deleteEngine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.engineRegistry.delete({ where: { id } });
    res.json({ message: 'Engine deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete engine' });
  }
};

// ============================================================================
// SKID CONFIGURATION (Multi-Driver Trains)
// ============================================================================

export const getSkidConfigurations = async (req: Request, res: Response) => {
  try {
    const configs = await prisma.skidConfiguration.findMany({
      include: {
        skidFl: true,
        driveTrains: {
          include: {
            driverFl: true,
            drivenFl: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skid configurations' });
  }
};

export const createSkidConfiguration = async (req: Request, res: Response) => {
  try {
    const { skidFlId, name, driveTrains } = req.body;
    
    const config = await prisma.skidConfiguration.create({
      data: {
        skidFlId,
        name,
        driveTrains: {
          create: driveTrains || []
        }
      },
      include: {
        skidFl: true,
        driveTrains: { include: { driverFl: true, drivenFl: true } }
      }
    });
    
    res.json(config);
  } catch (error: any) {
    console.error('Create Skid Config Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create skid configuration' });
  }
};

export const addDriveTrain = async (req: Request, res: Response) => {
  try {
    const { skidConfigId } = req.params;
    const driveTrain = await prisma.skidDriveTrain.create({
      data: {
        skidConfigId,
        ...req.body
      },
      include: { driverFl: true, drivenFl: true }
    });
    res.json(driveTrain);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add drive train' });
  }
};

export const removeDriveTrain = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.skidDriveTrain.delete({ where: { id } });
    res.json({ message: 'Drive train removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove drive train' });
  }
};

// Get driver-driven relationships for a specific FL
export const getDriverDrivenForFL = async (req: Request, res: Response) => {
  try {
    const { flId } = req.params;
    
    // Find where this FL is a driver
    const asDriver = await prisma.skidDriveTrain.findMany({
      where: { driverFlId: flId },
      include: { drivenFl: true, skidConfig: true }
    });
    
    // Find where this FL is driven
    const asDriven = await prisma.skidDriveTrain.findMany({
      where: { drivenFlId: flId },
      include: { driverFl: true, skidConfig: true }
    });
    
    res.json({ asDriver, asDriven });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver-driven relationships' });
  }
};
