import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// ASSETS CRUD
// ============================================================================

export const getAssets = async (req: Request, res: Response) => {
  try {
    const { status, assetClass } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (assetClass) where.assetClass = String(assetClass);
    
    const assets = await prisma.asset.findMany({
      where,
      include: {
        currentFl: true,
        installations: {
          take: 1,
          orderBy: { installDate: 'desc' },
          include: { functionalLocation: true }
        }
      },
      orderBy: { assetCode: 'asc' }
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

export const getAssetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        currentFl: true,
        installations: {
          orderBy: { installDate: 'desc' },
          include: { functionalLocation: { include: { system: true } } }
        }
      }
    });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const asset = await prisma.asset.create({ data: req.body });
    res.json(asset);
  } catch (error) {
    console.error('Create Asset Error:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.update({ where: { id }, data: req.body });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};

// ============================================================================
// ASSET INSTALLATION / REMOVAL
// ============================================================================

export const installAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Asset ID
    const { flId, installedBy, reason, meterReading } = req.body;
    
    // Check if FL already has an asset
    const fl = await prisma.functionalLocation.findUnique({ where: { id: flId } });
    if (!fl) return res.status(404).json({ error: 'Functional Location not found' });
    if (fl.currentAssetId) {
      return res.status(400).json({ error: 'FL already has an installed asset. Remove it first.' });
    }
    
    // Create installation record and update both Asset and FL
    const [installation] = await prisma.$transaction([
      prisma.assetInstallation.create({
        data: {
          assetId: id,
          flId,
          installDate: new Date(),
          installedBy,
          reason,
          meterReadingAtInstall: meterReading
        }
      }),
      prisma.asset.update({
        where: { id },
        data: { status: 'INSTALLED', currentFlId: flId }
      }),
      prisma.functionalLocation.update({
        where: { id: flId },
        data: { currentAssetId: id }
      })
    ]);
    
    res.json({ message: 'Asset installed', installation });
  } catch (error) {
    console.error('Install Asset Error:', error);
    res.status(500).json({ error: 'Failed to install asset' });
  }
};

export const removeAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Asset ID
    const { removedBy, reason, meterReading, newStatus } = req.body;
    
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset || !asset.currentFlId) {
      return res.status(400).json({ error: 'Asset is not currently installed' });
    }
    
    const flId = asset.currentFlId;
    
    // Find the current installation record and close it
    const currentInstall = await prisma.assetInstallation.findFirst({
      where: { assetId: id, flId, removalDate: null },
      orderBy: { installDate: 'desc' }
    });
    
    if (currentInstall) {
      await prisma.assetInstallation.update({
        where: { id: currentInstall.id },
        data: {
          removalDate: new Date(),
          removedBy,
          reason,
          meterReadingAtRemoval: meterReading
        }
      });
    }
    
    // Update Asset and FL
    await prisma.$transaction([
      prisma.asset.update({
        where: { id },
        data: { status: newStatus || 'IN_STORE', currentFlId: null }
      }),
      prisma.functionalLocation.update({
        where: { id: flId },
        data: { currentAssetId: null }
      })
    ]);
    
    res.json({ message: 'Asset removed' });
  } catch (error) {
    console.error('Remove Asset Error:', error);
    res.status(500).json({ error: 'Failed to remove asset' });
  }
};

export const getAssetHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await prisma.assetInstallation.findMany({
      where: { assetId: id },
      include: {
        functionalLocation: {
          include: { system: { include: { area: { include: { site: true } } } } }
        }
      },
      orderBy: { installDate: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch asset history' });
  }
};

// ============================================================================
// ASSET CLASS TEMPLATES (Helper for UI)
// ============================================================================

export const getSpecTemplates = async (req: Request, res: Response) => {
  const templates = {
    MOTOR: {
      type: 'Electrical',
      rating_kw: null,
      voltage_v: null,
      fla_amps: null,
      rpm: null,
      frame: null,
      insulation_class: null,
      efficiency_class: null
    },
    PUMP: {
      type: 'Mechanical',
      design_head_m: null,
      design_flow_m3h: null,
      impeller_dia_mm: null,
      shut_off_head: null,
      npsh_required: null
    },
    COMPRESSOR: {
      type: 'Mechanical',
      capacity_m3h: null,
      suction_pressure_bar: null,
      discharge_pressure_bar: null,
      stages: null
    },
    INSTRUMENT: {
      type: 'Instrument',
      range_min: null,
      range_max: null,
      unit: null,
      output_signal: null,
      accuracy: null
    },
    GENERATOR: {
      type: 'Electrical',
      rating_kva: null,
      voltage_v: null,
      frequency_hz: null,
      power_factor: null
    }
  };
  res.json(templates);
};
