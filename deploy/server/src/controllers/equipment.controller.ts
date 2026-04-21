import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Installations ---
export const getInstallations = async (req: Request, res: Response) => {
  try {
    const installations = await prisma.installation.findMany({ orderBy: { installationId: 'asc' } });
    res.json(installations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch installations' });
  }
};

export const createInstallation = async (req: Request, res: Response) => {
  try {
    const installation = await prisma.installation.create({ data: req.body });
    res.json(installation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create installation' });
  }
};

export const updateInstallation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const installation = await prisma.installation.update({ where: { id }, data: req.body });
    res.json(installation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update installation' });
  }
};

// --- Instrument Types ---
export const getInstrumentTypes = async (req: Request, res: Response) => {
  try {
    const types = await prisma.instrumentType.findMany();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch types' });
  }
};

export const createInstrumentType = async (req: Request, res: Response) => {
  try {
    const type = await prisma.instrumentType.create({ data: req.body });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create type' });
  }
};

export const updateInstrumentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = await prisma.instrumentType.update({ where: { id }, data: req.body });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update type' });
  }
};

// --- Instruments ---
export const getInstruments = async (req: Request, res: Response) => {
  try {
    const instruments = await prisma.instrumentMaster.findMany({
      include: { installation: true },
    });
    res.json(instruments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instruments' });
  }
};


export const createInstrument = async (req: Request, res: Response) => {
  try {
    const { tagId, type, description, serviceLine, installationId, manufacturer, modelNo, serialNo, specifications } = req.body;
    
    // Build proper data payload for InstrumentMaster
    const data: any = {
      tagId,
      type: type || 'Unknown',
      description: description || type + ' - ' + tagId,
      serviceLine,
      installationId,
      make: manufacturer || specifications?.manufacturer,
      model: modelNo || specifications?.model,
      serialNo: serialNo || specifications?.serialNo,
      rangeMin: specifications?.rangeMin,
      rangeMax: specifications?.rangeMax
    };
    
    const instrument = await prisma.instrumentMaster.create({ data });
    res.json(instrument);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Equipment Tag already exists. Please use a unique Tag ID.' });
    }
    console.error('Create Instrument Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create instrument' });
  }
};

export const updateInstrument = async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const instrument = await prisma.instrumentMaster.update({ where: { tagId }, data: req.body });
    res.json(instrument);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update instrument' });
  }
};

// --- Calibration Standards ---
export const getStandards = async (req: Request, res: Response) => {
  try {
    const standards = await prisma.calibrationStandard.findMany({ orderBy: { tagId: 'asc' } });
    res.json(standards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch standards' });
  }
};

export const createStandard = async (req: Request, res: Response) => {
  try {
    const standard = await prisma.calibrationStandard.create({ data: req.body });
    res.json(standard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create standard' });
  }
};

export const updateStandard = async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const standard = await prisma.calibrationStandard.update({ where: { tagId }, data: req.body });
    res.json(standard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update standard' });
  }
};

// --- Calibration Logs ---
export const getLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.calibrationLog.findMany({
      where: { instrumentTagId: req.params.tagId },
      orderBy: { currentCalDate: 'desc' },
      include: { masterStandard: true }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const createLog = async (req: Request, res: Response) => {
  try {
    const { instrumentTagId, currentCalDate, ...rest } = req.body;
    const instrument = await prisma.instrumentMaster.findUnique({ where: { tagId: instrumentTagId } });
    if (!instrument) return res.status(404).json({ error: 'Instrument not found' });

    const calDate = new Date(currentCalDate);
    const nextDueDate = new Date(calDate);
    nextDueDate.setMonth(calDate.getMonth() + instrument.calibrationFreqMonths);
    
    const log = await prisma.calibrationLog.create({
      data: { instrumentTagId, currentCalDate: calDate, nextDueDate, lastCalDate: calDate, ...rest }
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create calibration log' });
  }
};

// --- Replacement History ---
export const getReplacements = async (req: Request, res: Response) => {
  try {
    const history = await prisma.replacementHistory.findMany({
      where: { instrumentTagId: req.params.tagId },
      orderBy: { date: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch replacement history' });
  }
};

// --- PM Schedules ---
export const getPMSchedules = async (req: Request, res: Response) => {
  try {
    const { typeId, equipTypeId } = req.query;
    let where: any = {};
    if (typeId) where.instrumentTypeId = String(typeId);
    if (equipTypeId) where.equipmentTypeNameId = String(equipTypeId);
    const schedules = await prisma.pMSchedule.findMany({ where });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PM schedules' });
  }
};

export const createPMSchedule = async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.pMSchedule.create({ data: req.body });
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PM schedule' });
  }
};

export const deletePMSchedule = async (req: Request, res: Response) => {
  try {
    await prisma.pMSchedule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete PM schedule' });
  }
};

// --- Custody Meters ---
export const getCustodyMeters = async (req: Request, res: Response) => {
  try {
    const meters = await prisma.custodyTransferMeter.findMany({ include: { instruments: true } });
    res.json(meters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custody meters' });
  }
};

export const createCustodyMeter = async (req: Request, res: Response) => {
  try {
    const meter = await prisma.custodyTransferMeter.create({ data: req.body });
    res.json(meter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create custody meter' });
  }
};

export const updateCustodyMeter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meter = await prisma.custodyTransferMeter.update({ where: { id }, data: req.body });
    res.json(meter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update custody meter' });
  }
};

// --- Internal Meters ---
export const getInternalMeters = async (req: Request, res: Response) => {
  try {
    const meters = await prisma.internalFlowMeter.findMany({ include: { instruments: true } });
    res.json(meters);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const createInternalMeter = async (req: Request, res: Response) => {
  try {
    const meter = await prisma.internalFlowMeter.create({ data: req.body });
    res.json(meter);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const updateInternalMeter = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const meter = await prisma.internalFlowMeter.update({ where: { id }, data: req.body });
    res.json(meter);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

// --- Meter Composition ---
export const addInstrumentToMeter = async (req: Request, res: Response) => {
  const { meterId, tagId, type } = req.body;
  try {
    if (type === 'custody') {
      await prisma.instrumentMaster.update({ where: { tagId }, data: { custodyMeterId: meterId } });
    } else {
      await prisma.instrumentMaster.update({ where: { tagId }, data: { internalMeterId: meterId } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to link instrument' });
  }
};

export const getInstrumentHistory = async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const logs = await prisma.calibrationLog.findMany({
      where: { instrumentTagId: tagId },
      orderBy: { currentCalDate: 'desc' },
      include: { masterStandard: true }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' }); 
  }
};

// --- Running Equipment ---
export const getRunningEquipment = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.installationId) {
      where.installationId = String(req.query.installationId);
    }

    const equip = await prisma.runningEquipmentMaster.findMany({
      where,
      include: { installation: true, equipmentType: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(equip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
};

export const createRunningEquipment = async (req: Request, res: Response) => {
  try {
    const newEquip = await prisma.runningEquipmentMaster.create({ data: req.body });
    res.json(newEquip);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create equipment' });
  }
};

export const updateRunningEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.runningEquipmentMaster.update({ where: { equipmentTag: id }, data: req.body });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
};

// --- Equipment Types ---
export const getEquipmentTypes = async (req: Request, res: Response) => {
  try {
    const types = await prisma.equipmentType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch equipment types' });
  }
};

export const createEquipmentType = async (req: Request, res: Response) => {
  try {
    const type = await prisma.equipmentType.create({ data: req.body });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create equipment type' });
  }
};

export const updateEquipmentType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = await prisma.equipmentType.update({ where: { id }, data: req.body });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipment type' });
  }
};

// --- Meter Types ---
export const getMeterTypes = async (req: Request, res: Response) => {
  try {
    const types = await prisma.meterType.findMany({ orderBy: { name: 'asc' } });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch meter types' });
  }
};

export const createMeterType = async (req: Request, res: Response) => {
  try {
    const type = await prisma.meterType.create({ data: req.body });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meter type' });
  }
};

export const updateMeterType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = await prisma.meterType.update({ where: { id }, data: req.body });
    res.json(type);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meter type' });
  }
};

export const deleteMeterType = async (req: Request, res: Response) => {
  try {
    await prisma.meterType.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meter type' });
  }
};

// --- Products ---
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.update({ where: { id }, data: req.body });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// --- Calibration Performers ---
export const getPerformers = async (req: Request, res: Response) => {
  try {
    const performers = await prisma.calibrationPerformer.findMany({ orderBy: { name: 'asc' } });
    res.json(performers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performers' });
  }
};

export const createPerformer = async (req: Request, res: Response) => {
  try {
    const performer = await prisma.calibrationPerformer.create({ data: req.body });
    res.json(performer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create performer' });
  }
};

export const updatePerformer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const performer = await prisma.calibrationPerformer.update({ where: { id }, data: req.body });
    res.json(performer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update performer' });
  }
};

// ============================================================================
// ============================================================================
// CATEGORY-BASED EQUIPMENT REGISTRY
// ============================================================================


export const getEquipmentByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    const equipment = await prisma.runningEquipmentMaster.findMany({
      where: { category: category },
      include: { installation: true },
      orderBy: { equipmentTag: 'asc' }
    });
    
    const mapped = equipment.map(e => ({
      id: e.equipmentTag,
      tagId: e.equipmentTag,
      equipmentTag: e.equipmentTag,
      description: e.description,
      manufacturer: e.make,
      modelNo: e.model,
      serialNo: null,
      equipmentTypeName: e.equipmentTypeName,
      equipmentType: e.equipmentTypeName,
      serviceLine: e.serviceLine,
      status: 'ACTIVE',
      specifications: e.specifications || {},
      createdAt: e.createdAt
    }));
    
    res.json(mapped);
  } catch (error) {
    console.error('Category Equipment Error:', error);
    res.status(500).json({ error: 'Failed to fetch equipment by category' });
  }
};

export const createCategoryEquipment = async (req: Request, res: Response) => {
  try {
    const { tagId, description, category, equipmentType, serviceLine, manufacturer, modelNo, serialNo, installationId, specifications } = req.body;
    
    let validInstallationId = installationId;
    
    if (!installationId) {
      const defaultInstall = await prisma.installation.findFirst();
      if (!defaultInstall) {
        return res.status(400).json({ error: 'No installations exist. Please create an installation first.' });
      }
      validInstallationId = defaultInstall.id;
    } else {
      const installation = await prisma.installation.findUnique({ where: { id: installationId } });
      if (!installation) {
        return res.status(400).json({ error: 'Invalid installation ID provided' });
      }
    }
    
    // Check if tag already exists in this installation (but allow same tag in different installations)
    const existingInInstallation = await prisma.runningEquipmentMaster.findFirst({
      where: { equipmentTag: tagId, installationId: validInstallationId }
    });
    if (existingInInstallation) {
      return res.status(400).json({ error: 'Equipment Tag ' + tagId + ' already exists in this installation.' });
    }
    
    // Make equipmentTag globally unique by prefixing with short installationId
    const installation = await prisma.installation.findUnique({ where: { id: validInstallationId } });
    const prefix = installation?.installationId?.substring(0, 6) || 'EQ';
    const globalTag = prefix + '-' + tagId;
    
    const finalDescription = description || equipmentType + ' - ' + tagId;
    
    const equipment = await prisma.runningEquipmentMaster.create({
      data: {
        equipmentTag: globalTag,
        description: finalDescription,
        category,
        equipmentTypeName: equipmentType,
        serviceLine,
        make: manufacturer,
        model: modelNo,
        installationId: validInstallationId,
        specifications: specifications || {}
      }
    });
    
    res.json({
      id: equipment.equipmentTag,
      tagId: equipment.equipmentTag,
      description: equipment.description,
      equipmentTypeName: equipment.equipmentTypeName,
      manufacturer: equipment.make,
      modelNo: equipment.model,
      specifications: equipment.specifications
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Equipment Tag already exists. Please use a unique Tag ID.' });
    }
    console.error('Create Category Equipment Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create equipment' });
  }
};

export const updateCategoryEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, equipmentType, serviceLine, manufacturer, modelNo, serialNo, specifications } = req.body;
    
    const equipment = await prisma.runningEquipmentMaster.update({
      where: { equipmentTag: id },
      data: {
        description,
        equipmentTypeName: equipmentType,
        serviceLine,
        make: manufacturer,
        model: modelNo,
        specifications: specifications || {}
      }
    });
    
    res.json({
      id: equipment.equipmentTag,
      tagId: equipment.equipmentTag,
      description: equipment.description,
      equipmentTypeName: equipment.equipmentTypeName,
      manufacturer: equipment.make,
      modelNo: equipment.model,
      specifications: equipment.specifications
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipment' });
  }
};

export const deleteCategoryEquipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.runningEquipmentMaster.delete({ where: { equipmentTag: id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
};


// ============================================================================
// QR CODE GENERATION
// ============================================================================

export const getEquipmentQR = async (req: Request, res: Response) => {
  try {
    const QRCode = require('qrcode');
    const { tag } = req.params;
    const qrData = JSON.stringify({ type: 'equipment', tag, app: 'ONGC-MMS' });
    const buffer = await QRCode.toBuffer(qrData, { type: 'png', width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

export const getInstrumentQR = async (req: Request, res: Response) => {
  try {
    const QRCode = require('qrcode');
    const { tagId } = req.params;
    const qrData = JSON.stringify({ type: 'instrument', tagId, app: 'ONGC-MMS' });
    const buffer = await QRCode.toBuffer(qrData, { type: 'png', width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};
