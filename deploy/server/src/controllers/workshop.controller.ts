import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SHOPS = ['FABRICATION', 'DIESEL', 'MACHINE', 'ELECTRICAL'];

// Get all jobs with filters
export const getJobs = async (req: Request, res: Response) => {
  try {
    const { shopType, status, priority } = req.query;
    const where: any = {};
    
    if (shopType) where.shopType = String(shopType);
    if (status) where.status = String(status);
    if (priority) where.priority = String(priority);
    
    const jobs = await prisma.workshopJob.findMany({
      where,
      orderBy: { requestDate: 'desc' }
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

// Get job by ID
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.workshopJob.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

// Create job
export const createJob = async (req: Request, res: Response) => {
  try {
    // Generate job number
    const count = await prisma.workshopJob.count({ where: { shopType: req.body.shopType } });
    const prefix = req.body.shopType.substring(0, 3).toUpperCase();
    const jobNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    
    const job = await prisma.workshopJob.create({
      data: {
        ...req.body,
        jobNumber,
        requestDate: new Date(req.body.requestDate || new Date())
      }
    });
    res.json(job);
  } catch (error) {
    console.error('Create Job Error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

// Update job
export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.workshopJob.update({
      where: { id },
      data: req.body
    });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
};

// Update job status
export const updateJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updateData: any = { status };
    if (status === 'IN_PROGRESS' && !req.body.startDate) {
      updateData.startDate = new Date();
    }
    if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
    }
    
    const job = await prisma.workshopJob.update({
      where: { id },
      data: updateData
    });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Get dashboard stats
export const getWorkshopDashboard = async (req: Request, res: Response) => {
  try {
    const stats: any = {};
    
    // Stats per shop
    for (const shop of SHOPS) {
      const [total, pending, inProgress, completed] = await Promise.all([
        prisma.workshopJob.count({ where: { shopType: shop } }),
        prisma.workshopJob.count({ where: { shopType: shop, status: 'PENDING' } }),
        prisma.workshopJob.count({ where: { shopType: shop, status: 'IN_PROGRESS' } }),
        prisma.workshopJob.count({ where: { shopType: shop, status: 'COMPLETED' } })
      ]);
      stats[shop] = { total, pending, inProgress, completed };
    }
    
    // Overall stats
    const [totalJobs, totalPending, totalInProgress, totalCompleted] = await Promise.all([
      prisma.workshopJob.count(),
      prisma.workshopJob.count({ where: { status: 'PENDING' } }),
      prisma.workshopJob.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.workshopJob.count({ where: { status: 'COMPLETED' } })
    ]);
    
    // Recent jobs
    const recentJobs = await prisma.workshopJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    // Urgent jobs
    const urgentJobs = await prisma.workshopJob.findMany({
      where: { priority: 'URGENT', status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { requestDate: 'asc' }
    });
    
    res.json({
      overall: { total: totalJobs, pending: totalPending, inProgress: totalInProgress, completed: totalCompleted },
      byShop: stats,
      recentJobs,
      urgentJobs
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};
