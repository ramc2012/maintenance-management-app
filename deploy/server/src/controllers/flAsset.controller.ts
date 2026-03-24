import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to log audit
const logAudit = async (
  flId: string, 
  action: string, 
  assetTag: string, 
  assetType: string, 
  performedBy: string, 
  details?: any,
  reason?: string,
  previousAssetTag?: string
) => {
  await prisma.assignmentAuditLog.create({
    data: {
      flId,
      action,
      assetTag,
      assetType,
      performedBy,
      details,
      reason,
      previousAssetTag,
      role: 'ENGINEER' // Defaulting to ENGINEER for now, ideally from auth context
    }
  });
};

// Get all assets assigned to a Functional Location
export const getAssetsForFL = async (req: Request, res: Response) => {
  try {
    const { flId } = req.params;
    
    // Sort logic handled in FE usually, but basic sort by sequence here
    const assignments = await prisma.fLAssetAssignment.findMany({
      where: { flId },
      orderBy: { sequence: 'asc' }
    });
    
    // Enrich with asset details
    const enriched = await Promise.all(assignments.map(async (a) => {
      let assetDetails: any = null;
      
      if (a.assetType === 'RUNNING_EQUIPMENT') {
        assetDetails = await prisma.runningEquipmentMaster.findUnique({
          where: { equipmentTag: a.assetTag },
          include: { installation: true, equipmentType: true }
        });
      } else if (a.assetType === 'INSTRUMENT') {
        assetDetails = await prisma.instrumentMaster.findUnique({
          where: { tagId: a.assetTag }
        });
      } else if (a.assetType === 'CUSTODY_METER') {
        assetDetails = await prisma.custodyTransferMeter.findUnique({
          where: { meterId: a.assetTag }
        });
      } else if (a.assetType === 'INTERNAL_METER') {
        assetDetails = await prisma.internalFlowMeter.findUnique({
          where: { meterId: a.assetTag }
        });
      }
      
      return { 
        ...a, 
        assetDetails: assetDetails ? {
           description: assetDetails.description || assetDetails.details || assetDetails.meterId,
           make: assetDetails.make || null,
           model: assetDetails.model || null,
           serialNumber: assetDetails.serialNumber || assetDetails.serialNo || null
        } : {}
      };
    }));
    
    res.json(enriched);
  } catch (error) {
    console.error('Get FL Assets Error:', error);
    res.status(500).json({ error: 'Failed to fetch assets for FL' });
  }
};

// Assign asset to FL
export const assignAssetToFL = async (req: Request, res: Response) => {
  try {
    const { flId, assetType, assetTag, function: assetFunction, position, remarks, performedBy, reason } = req.body;
    
    // Auto-determine sequence based on function
    let seq = 99;
    if (assetFunction === 'DRIVER') seq = 1;
    else if (assetFunction === 'DRIVEN') seq = 2;
    else if (assetFunction === 'CONTROLLER') seq = 3;
    
    const assignment = await prisma.fLAssetAssignment.create({
      data: {
        flId,
        assetType,
        assetTag,
        function: assetFunction || 'SENSOR',
        sequence: seq,
        position,
        remarks,
        assignedBy: performedBy || 'System',
        assignedAt: new Date()
      }
    });
    
    // Audit Log
    await logAudit(flId, 'ASSIGN', assetTag, assetType, performedBy || 'System', { function: assetFunction, position }, reason);
    
    res.json(assignment);
  } catch (error: any) {
    console.error('Assign Asset Error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Asset already assigned to this FL' });
    }
    res.status(500).json({ error: error.message || 'Failed to assign asset' });
  }
};

// Replace asset (Atomic Unassign + Assign)
export const replaceAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID of assignment to replace
    const { newAssetTag, newAssetType, performedBy, reason, remarks } = req.body;
    
    const oldAssignment = await prisma.fLAssetAssignment.findUnique({ where: { id } });
    if (!oldAssignment) return res.status(404).json({ error: 'Assignment not found' });
    
    const updated = await prisma.fLAssetAssignment.update({
      where: { id },
      data: {
        assetTag: newAssetTag,
        assetType: newAssetType,
        assignedBy: performedBy || 'System',
        assignedAt: new Date(),
        remarks: remarks || `Replaced ${oldAssignment.assetTag}`
      }
    });

    await logAudit(
       oldAssignment.flId, 
       'REPLACE', 
       newAssetTag, 
       newAssetType, 
       performedBy || 'System', 
       { oldTag: oldAssignment.assetTag, function: oldAssignment.function }, 
       reason,
       oldAssignment.assetTag
    );
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to replace asset' });
  }
};

// Update assignment details
export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { function: assetFunction, position, remarks, performedBy } = req.body;
    
    let seq = 99;
    if (assetFunction === 'DRIVER') seq = 1;
    else if (assetFunction === 'DRIVEN') seq = 2;
    else if (assetFunction === 'CONTROLLER') seq = 3;
    
    const old = await prisma.fLAssetAssignment.findUnique({ where: { id } });

    const assignment = await prisma.fLAssetAssignment.update({
      where: { id },
      data: { function: assetFunction, sequence: seq, position, remarks }
    });
    
    if (old) {
       await logAudit(old.flId, 'MODIFY', old.assetTag, old.assetType, performedBy || 'System', { before: old, after: assignment });
    }
    
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update assignment' });
  }
};

// Remove asset from FL
export const removeAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // For DELETE requests, typically params are in query or url, body support depends on client/server config.
    // We'll assume the client sends headers or we fetch user from request context if middleware existed.
    // For simplicity here, we might just log 'System' if body isn't parsed or passed.
    const performedBy = req.body.performedBy || 'System'; 
    
    const assignment = await prisma.fLAssetAssignment.findUnique({ where: { id } });
    
    if (assignment) {
      await logAudit(assignment.flId, 'UNASSIGN', assignment.assetTag, assignment.assetType, performedBy, null, req.body.reason);
      await prisma.fLAssetAssignment.delete({ where: { id } });
    }
    
    res.json({ message: 'Assignment removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
};

// Get Audit History
export const getAuditHistory = async (req: Request, res: Response) => {
  try {
    const { flId } = req.params;
    const history = await prisma.assignmentAuditLog.findMany({
      where: { flId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

// Available assets logic
export const getAvailableAssets = async (req: Request, res: Response) => {
   try {
    const { flId, category } = req.query;
    const assigned = await prisma.fLAssetAssignment.findMany({ select: { assetTag: true } });
    const assignedTags = new Set(assigned.map(a => a.assetTag));

    const equipment = await prisma.runningEquipmentMaster.findMany({ include: { installation: true } });
    const instruments = await prisma.instrumentMaster.findMany();
    const custody = await prisma.custodyTransferMeter.findMany();
    const internal = await prisma.internalFlowMeter.findMany();

    const availEquip = equipment.filter(e => !assignedTags.has(e.equipmentTag)).map(e => ({
       assetType: 'RUNNING_EQUIPMENT', assetTag: e.equipmentTag, description: e.description,
       type: e.equipmentTypeName, category: e.category
    }));
    
    const availInst = instruments.filter(i => !assignedTags.has(i.tagId)).map(i => ({
       assetType: 'INSTRUMENT', assetTag: i.tagId, description: i.description, type: i.type || 'Instrument', category: 'INSTRUMENT'
    }));

     const availCust = custody.filter(i => !assignedTags.has(i.meterId)).map(i => ({
       assetType: 'CUSTODY_METER', assetTag: i.meterId, description: i.details || i.customerName, type: i.meterType || 'Meter', category: 'CUSTODY_METER'
    }));

    const availInt = internal.filter(i => !assignedTags.has(i.meterId)).map(i => ({
       assetType: 'INTERNAL_METER', assetTag: i.meterId, description: i.description, type: i.meterType || 'Meter', category: 'INTERNAL_METER'
    }));

    res.json({ all: [...availEquip, ...availInst, ...availCust, ...availInt] });
   } catch(e) {
     res.status(500).json({error: 'Failed to get available'});
   }
};

export const getEquipmentTrain = async (req: Request, res: Response) => {
  try {
    const { flId } = req.params;
    const assignments = await prisma.fLAssetAssignment.findMany({
      where: { flId, function: { in: ['DRIVER', 'DRIVEN', 'CONTROLLER'] } },
      orderBy: { sequence: 'asc' }
    });
    res.json({ TRAIN: assignments }); // Simplified wrapper
  } catch (error) {
    res.status(500).json({ error: 'Failed to get equipment train' });
  }
};
