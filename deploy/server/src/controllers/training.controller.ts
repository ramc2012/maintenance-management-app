import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all trainings with filters
export const getTrainings = async (req: Request, res: Response) => {
  try {
    const { installationId, status, type, startDate, endDate } = req.query;
    const where: any = {};
    
    if (installationId) where.installationId = String(installationId);
    if (status) where.status = String(status);
    if (type) where.trainingType = String(type);
    if (startDate) where.startDate = { gte: new Date(String(startDate)) };
    if (endDate) where.endDate = { lte: new Date(String(endDate)) };
    
    const trainings = await prisma.trainingRecord.findMany({
      where,
      include: { 
        installation: true,
        attendees: true 
      },
      orderBy: { startDate: 'desc' }
    });
    res.json(trainings);
  } catch (error) {
    console.error('Get Trainings Error:', error);
    res.status(500).json({ error: 'Failed to fetch trainings' });
  }
};

// Get training by ID
export const getTrainingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const training = await prisma.trainingRecord.findUnique({
      where: { id },
      include: { installation: true, attendees: true }
    });
    if (!training) return res.status(404).json({ error: 'Training not found' });
    res.json(training);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch training' });
  }
};

// Create training
export const createTraining = async (req: Request, res: Response) => {
  try {
    const training = await prisma.trainingRecord.create({
      data: req.body,
      include: { installation: true }
    });
    res.json(training);
  } catch (error) {
    console.error('Create Training Error:', error);
    res.status(500).json({ error: 'Failed to create training' });
  }
};

// Update training
export const updateTraining = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const training = await prisma.trainingRecord.update({
      where: { id },
      data: req.body,
      include: { installation: true, attendees: true }
    });
    res.json(training);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update training' });
  }
};

// Add attendees to training
export const addAttendees = async (req: Request, res: Response) => {
  try {
    const { trainingId, attendees } = req.body;
    
    const created = await prisma.trainingAttendee.createMany({
      data: attendees.map((att: any) => ({
        trainingId,
        employeeId: att.employeeId,
        employeeName: att.employeeName,
        department: att.department
      })),
      skipDuplicates: true
    });
    
    res.json({ count: created.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add attendees' });
  }
};

// Mark attendance
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { attendeeId, attended, score, certified, feedback } = req.body;
    
    const attendee = await prisma.trainingAttendee.update({
      where: { id: attendeeId },
      data: { attended, score, certified, feedback }
    });
    
    res.json(attendee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

// Get training dashboard stats
export const getTrainingDashboard = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);
    
    const [total, scheduled, completed, cancelled] = await Promise.all([
      prisma.trainingRecord.count({ where }),
      prisma.trainingRecord.count({ where: { ...where, status: 'SCHEDULED' } }),
      prisma.trainingRecord.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.trainingRecord.count({ where: { ...where, status: 'CANCELLED' } })
    ]);
    
    // Upcoming trainings
    const upcoming = await prisma.trainingRecord.findMany({
      where: { ...where, status: 'SCHEDULED', startDate: { gte: new Date() } },
      include: { installation: true },
      orderBy: { startDate: 'asc' },
      take: 5
    });
    
    // Recent completed
    const recent = await prisma.trainingRecord.findMany({
      where: { ...where, status: 'COMPLETED' },
      include: { installation: true, attendees: { where: { attended: true } } },
      orderBy: { endDate: 'desc' },
      take: 5
    });
    
    // Type breakdown
    const byType = await prisma.trainingRecord.groupBy({
      by: ['trainingType'],
      where,
      _count: { id: true }
    });
    
    res.json({
      stats: { total, scheduled, completed, cancelled },
      upcoming,
      recent,
      byType: byType.map(t => ({ type: t.trainingType, count: t._count.id }))
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};
