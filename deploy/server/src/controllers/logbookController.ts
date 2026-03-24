import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getLogbookEntries = async (req: Request, res: Response) => {
  try {
    const { equipmentTag, date } = req.query;
    const where: any = {};
    
    if (equipmentTag) where.equipmentTag = String(equipmentTag);
    if (date) {
        // Simple date filtering (exact match or start of day logic could be used)
        const d = new Date(String(date));
        where.date = {
            gte: d,
            lt: new Date(d.getTime() + 24 * 60 * 60 * 1000)
        };
    }

    const logs = await prisma.equipmentLog.findMany({
      where,
      include: { 
          equipment: {
              include: { installation: true }
          }
      },
      orderBy: { date: 'desc' },
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const getLastLog = async (req: Request, res: Response) => {
  try {
    const { equipmentTag } = req.params;
    const log = await prisma.equipmentLog.findFirst({
      where: { equipmentTag },
      orderBy: { date: 'desc' }, // Or createdAt
    });
    res.json(log || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch last log' });
  }
};

export const createLog = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    // Check previous meter validation backend-side (optional but good)
    const lastLog = await prisma.equipmentLog.findFirst({
        where: { equipmentTag: data.equipmentTag },
        orderBy: { date: 'desc' }
    });
    
    if (lastLog && lastLog.cumulativeMeterReading && data.cumulativeMeterReading) {
        if (data.cumulativeMeterReading < lastLog.cumulativeMeterReading) {
             return res.status(400).json({ error: 'Current meter reading cannot be less than previous reading value: ' + lastLog.cumulativeMeterReading });
        }
    }

    const log = await prisma.equipmentLog.create({
      data: {
        ...data,
        date: new Date(data.date),
        startTime: data.startTime ? new Date(data.startTime) : null,
        stopTime: data.stopTime ? new Date(data.stopTime) : null,
      },
    });
    res.json(log);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create log: ' + error.message });
  }
};

export const deleteLog = async (req: Request, res: Response) => {
  try {
    await prisma.equipmentLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Log entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete log entry' });
  }
};
