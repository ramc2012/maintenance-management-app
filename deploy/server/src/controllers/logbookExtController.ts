import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// RUNNING HOURS LOG
// ============================================================================

export const getRunningHoursLogs = async (req: Request, res: Response) => {
  try {
    const { category, installationId } = req.query;
    const where: any = {};
    if (installationId) {
      where.equipment = { installationId: String(installationId) };
    }

    const logs = await prisma.equipmentLog.findMany({
      where,
      include: {
        equipment: { include: { installation: true } }
      },
      orderBy: { date: 'desc' },
      take: 200
    });

    // Map to frontend expected format
    const mapped = logs.map(l => ({
      id: l.id,
      date: l.date,
      equipmentTag: l.equipmentTag,
      shift: l.shift,
      runHours: l.totalRunHours || 0,
      cumulativeHours: l.cumulativeMeterReading || 0,
      parameters: l.parameters || {},
      status: l.runStatus ? 'Running' : 'Stopped',
      remarks: l.remarks,
      installationId: l.equipment?.installationId,
      installationName: (l.equipment as any)?.installation?.installationId
    }));

    res.json(mapped);
  } catch (error: any) {
    console.error('Get running hours error:', error);
    res.status(500).json({ error: 'Failed to fetch running hours logs' });
  }
};

export const createRunningHoursLog = async (req: Request, res: Response) => {
  try {
    const { date, equipmentTag, shift, runHours, cumulativeHours, status, parameters, installationId } = req.body;

    const log = await prisma.equipmentLog.create({
      data: {
        date: new Date(date),
        equipmentTag,
        shift: shift || 'Day',
        runStatus: status !== 'Stopped',
        totalRunHours: runHours || 0,
        cumulativeMeterReading: cumulativeHours || 0,
        parameters: parameters || {},
        remarks: req.body.remarks
      }
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error('Create running hours error:', error);
    res.status(500).json({ error: 'Failed to create running hours log: ' + error.message });
  }
};

// ============================================================================
// GAS COMPRESSION LOG
// ============================================================================

export const getCompressionLogs = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);

    const logs = await prisma.gasCompressionLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 200
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Get compression logs error:', error);
    res.status(500).json({ error: 'Failed to fetch compression logs' });
  }
};

export const createCompressionLog = async (req: Request, res: Response) => {
  try {
    const log = await prisma.gasCompressionLog.create({
      data: {
        date: new Date(req.body.date),
        compressorId: req.body.compressorId,
        installationId: req.body.installationId || null,
        gasCompressed: req.body.gasCompressed || 0,
        runHours: req.body.runHours || 0,
        flowRate: req.body.flowRate || 0,
        suctionPressure: req.body.suctionPressure,
        dischargePressure: req.body.dischargePressure,
        suctionTemp: req.body.suctionTemp,
        dischargeTemp: req.body.dischargeTemp,
        remarks: req.body.remarks
      }
    });

    res.status(201).json(log);
  } catch (error: any) {
    console.error('Create compression log error:', error);
    res.status(500).json({ error: 'Failed to create compression log: ' + error.message });
  }
};

export const deleteRunningHoursLog = async (req: Request, res: Response) => {
  try {
    await prisma.equipmentLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Running hours log deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete running hours log' });
  }
};

export const deleteCompressionLog = async (req: Request, res: Response) => {
  try {
    await prisma.gasCompressionLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Compression log deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete compression log' });
  }
};
