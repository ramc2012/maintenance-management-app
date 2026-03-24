import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// SITES
// ============================================================================

export const getSites = async (req: Request, res: Response) => {
  try {
    const sites = await prisma.site.findMany({
      include: { areas: { include: { systems: true } } },
      orderBy: { siteId: 'asc' }
    });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
};

export const createSite = async (req: Request, res: Response) => {
  try {
    const site = await prisma.site.create({ data: req.body });
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create site' });
  }
};

export const updateSite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const site = await prisma.site.update({ where: { id }, data: req.body });
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update site' });
  }
};

export const deleteSite = async (req: Request, res: Response) => {
  try {
    await prisma.site.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete site' });
  }
};

// ============================================================================
// AREAS
// ============================================================================

export const getAreas = async (req: Request, res: Response) => {
  try {
    const { siteId } = req.query;
    const where = siteId ? { siteId: String(siteId) } : {};
    const areas = await prisma.area.findMany({
      where,
      include: { site: true, systems: true },
      orderBy: { areaId: 'asc' }
    });
    res.json(areas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch areas' });
  }
};

export const createArea = async (req: Request, res: Response) => {
  try {
    const area = await prisma.area.create({ data: req.body });
    res.json(area);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create area' });
  }
};

export const updateArea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const area = await prisma.area.update({ where: { id }, data: req.body });
    res.json(area);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update area' });
  }
};

export const deleteArea = async (req: Request, res: Response) => {
  try {
    await prisma.area.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete area' });
  }
};

// ============================================================================
// SYSTEMS
// ============================================================================

export const getSystems = async (req: Request, res: Response) => {
  try {
    const { areaId } = req.query;
    const where = areaId ? { areaId: String(areaId) } : {};
    const systems = await prisma.system.findMany({
      where,
      include: { area: { include: { site: true } }, functionalLocations: true },
      orderBy: { systemTag: 'asc' }
    });
    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch systems' });
  }
};

export const createSystem = async (req: Request, res: Response) => {
  try {
    const system = await prisma.system.create({ data: req.body });
    res.json(system);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create system' });
  }
};

export const updateSystem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const system = await prisma.system.update({ where: { id }, data: req.body });
    res.json(system);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update system' });
  }
};

export const deleteSystem = async (req: Request, res: Response) => {
  try {
    await prisma.system.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete system' });
  }
};

// ============================================================================
// FUNCTIONAL LOCATIONS
// ============================================================================

export const getFunctionalLocations = async (req: Request, res: Response) => {
  try {
    const { systemId, parentFlId } = req.query;
    const where: any = {};
    if (systemId) where.systemId = String(systemId);
    if (parentFlId) where.parentFlId = String(parentFlId);
    
    const fls = await prisma.functionalLocation.findMany({
      where,
      include: {
        system: { include: { area: { include: { site: true } } } },
        parentFl: true,
        childFls: true,
        currentAsset: true
      },
      orderBy: { flId: 'asc' }
    });
    res.json(fls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch functional locations' });
  }
};

export const getFunctionalLocationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fl = await prisma.functionalLocation.findUnique({
      where: { id },
      include: {
        system: { include: { area: { include: { site: true } } } },
        parentFl: true,
        childFls: { include: { currentAsset: true } },
        currentAsset: true,
        installations: {
          include: { asset: true },
          orderBy: { installDate: 'desc' }
        },
        maintenanceAssignments: {
          include: { strategy: { include: { tasks: true } } }
        },
        workOrders: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });
    res.json(fl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch functional location' });
  }
};

export const createFunctionalLocation = async (req: Request, res: Response) => {
  try {
    const fl = await prisma.functionalLocation.create({ data: req.body });
    res.json(fl);
  } catch (error) {
    console.error('Create FL Error:', error);
    res.status(500).json({ error: 'Failed to create functional location' });
  }
};

export const updateFunctionalLocation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fl = await prisma.functionalLocation.update({ where: { id }, data: req.body });
    res.json(fl);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update functional location' });
  }
};

export const deleteFunctionalLocation = async (req: Request, res: Response) => {
  try {
    await prisma.functionalLocation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete functional location' });
  }
};

// ============================================================================
// HIERARCHY TREE (Full Tree Structure)
// ============================================================================

export const getFullHierarchy = async (req: Request, res: Response) => {
  try {
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      include: {
        areas: {
          include: {
            systems: {
              include: {
                functionalLocations: {
                  where: { parentFlId: null },
                  include: {
                    childFls: {
                      include: { currentAsset: true, childFls: true }
                    },
                    currentAsset: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { siteId: 'asc' }
    });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hierarchy' });
  }
};

export const getElectricalLoad = async (req: Request, res: Response) => {
  try {
    const { systemId, areaId } = req.query;
    
    let where: any = {};
    if (systemId) {
      where.systemId = String(systemId);
    } else if (areaId) {
      where.system = { areaId: String(areaId) };
    }
    
    const fls = await prisma.functionalLocation.findMany({
      where,
      include: { currentAsset: true }
    });
    
    let totalKw = 0;
    const details: any[] = [];
    
    for (const fl of fls) {
      if (fl.currentAsset?.specifications) {
        const specs = fl.currentAsset.specifications as any;
        if (specs.rating_kw) {
          totalKw += specs.rating_kw;
          details.push({
            flId: fl.flId,
            assetCode: fl.currentAsset.assetCode,
            kw: specs.rating_kw
          });
        }
      }
    }
    
    res.json({ totalKw, count: details.length, details });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate electrical load' });
  }
};
