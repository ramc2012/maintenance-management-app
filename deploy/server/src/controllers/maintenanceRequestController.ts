import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateReqNumber = async (): Promise<string> => {
  const today = new Date();
  const prefix = `MR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.maintenanceRequest.count({ where: { reqNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const getRequests = async (req: Request, res: Response) => {
  try {
    const { status, priority, requestType } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);
    if (requestType) where.requestType = String(requestType);

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const createRequest = async (req: Request, res: Response) => {
  try {
    const reqNumber = await generateReqNumber();
    // Map frontend field names to schema field names and strip unknown fields
    const {
      title, description, priority,
      woType, requestType,
      equipmentId, equipmentTag,
      requestedBy: bodyRequestedBy,
      remarks,
      flId,
      // extra fields stored in remarks
      specialTools, safetyPrecautions, assignedTo, scheduledDate, estimatedHours, department
    } = req.body;

    // Build extra info into remarks
    const extraParts: string[] = [];
    if (assignedTo)          extraParts.push(`Assigned: ${assignedTo}`);
    if (department)          extraParts.push(`Dept: ${department}`);
    if (scheduledDate)       extraParts.push(`Scheduled: ${scheduledDate}`);
    if (estimatedHours)      extraParts.push(`Est. Hours: ${estimatedHours}`);
    if (specialTools)        extraParts.push(`Tools: ${specialTools}`);
    if (safetyPrecautions)   extraParts.push(`Safety: ${safetyPrecautions}`);
    const combinedRemarks = [remarks, ...extraParts].filter(Boolean).join(' | ');

    const request = await prisma.maintenanceRequest.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        requestType: requestType || woType || 'CORRECTIVE',
        equipmentTag: equipmentTag || equipmentId,
        flId: flId || null,
        reqNumber,
        requestedBy: (req as any).user?.username || bodyRequestedBy || 'system',
        requestedAt: new Date(),
        ...(combinedRemarks ? { remarks: combinedRemarks } : {}),
      }
    });
    res.json(request);
  } catch (error) {
    console.error('Create Request Error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

export const approveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: (req as any).user?.username || req.body.approvedBy,
        approvedAt: new Date()
      }
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: (req as any).user?.username || req.body.rejectedBy,
        rejectedAt: new Date(),
        rejectionReason
      }
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

export const convertToWorkOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mreq = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!mreq) return res.status(404).json({ error: 'Request not found' });
    if (mreq.status !== 'APPROVED') return res.status(400).json({ error: 'Request must be approved first' });

    // Generate WO number
    const today = new Date();
    const prefix = `WO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const count = await prisma.workOrder.count({ where: { woNumber: { startsWith: prefix } } });
    const woNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    // Determine woType from requestType
    const woTypeMap: Record<string, string> = {
      CORRECTIVE: 'CORRECTIVE',
      PREVENTIVE: 'PREVENTIVE',
      INSPECTION: 'PREDICTIVE',
      MODIFICATION: 'CORRECTIVE'
    };

    // Create work order (flId is required - use a default if not provided)
    const flId = req.body.flId || mreq.flId;
    if (!flId) return res.status(400).json({ error: 'Functional Location (flId) is required to create Work Order' });

    const wo = await prisma.workOrder.create({
      data: {
        woNumber,
        flId,
        woType: woTypeMap[mreq.requestType] || 'CORRECTIVE',
        priority: mreq.priority,
        description: mreq.description,
        status: 'OPEN',
        maintenanceRequestId: id,
        createdBy: (req as any).user?.username || 'system'
      }
    });

    // Update the request
    await prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'CONVERTED', workOrderId: wo.id }
    });

    res.json({ workOrder: wo, request: { id, status: 'CONVERTED' } });
  } catch (error) {
    console.error('Convert Error:', error);
    res.status(500).json({ error: 'Failed to convert to work order' });
  }
};

export const updateRequest = async (req: Request, res: Response) => {
  try {
    const request = await prisma.maintenanceRequest.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update request' });
  }
};

export const closeRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { completionNotes, actualHours, partsUsed, followUpRequired } = req.body;

    const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Work order not found' });

    const closureInfo: string[] = [];
    if (completionNotes) closureInfo.push(`Completion: ${completionNotes}`);
    if (actualHours)     closureInfo.push(`Actual Hours: ${actualHours}`);
    if (partsUsed)       closureInfo.push(`Parts Used: ${partsUsed}`);
    if (followUpRequired) closureInfo.push('Follow-up Required');
    const closureRemarks = closureInfo.join(' | ');

    const request = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        remarks: closureRemarks || existing.remarks,
      }
    });
    res.json(request);
  } catch (error) {
    console.error('Close Request Error:', error);
    res.status(500).json({ error: 'Failed to close work order' });
  }
};
