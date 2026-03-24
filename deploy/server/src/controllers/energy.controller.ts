import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// DAILY ENERGY LOGS
// ============================================================================

export const getDailyEnergyLogs = async (req: Request, res: Response) => {
  try {
    const { installationId, startDate, endDate } = req.query;
    const where: any = {};
    
    if (installationId) where.installationId = String(installationId);
    if (startDate) where.date = { ...where.date, gte: new Date(String(startDate)) };
    if (endDate) where.date = { ...where.date, lte: new Date(String(endDate)) };
    
    const logs = await prisma.dailyEnergyLog.findMany({
      where,
      include: { installation: true },
      orderBy: { date: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch energy logs' });
  }
};

export const createDailyEnergyLog = async (req: Request, res: Response) => {
  try {
    const log = await prisma.dailyEnergyLog.create({
      data: req.body,
      include: { installation: true }
    });
    res.json(log);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Log already exists for this date and installation' });
    }
    res.status(500).json({ error: 'Failed to create energy log' });
  }
};

export const updateDailyEnergyLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = await prisma.dailyEnergyLog.update({
      where: { id },
      data: req.body
    });
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update energy log' });
  }
};

// ============================================================================
// MONTHLY ELECTRICITY BILLS
// ============================================================================

export const getMonthlyBills = async (req: Request, res: Response) => {
  try {
    const { installationId, year, status } = req.query;
    const where: any = {};
    
    if (installationId) where.installationId = String(installationId);
    if (year) where.year = Number(year);
    if (status) where.status = String(status);
    
    const bills = await prisma.monthlyElectricityBill.findMany({
      where,
      include: { installation: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
};

export const createMonthlyBill = async (req: Request, res: Response) => {
  try {
    const bill = await prisma.monthlyElectricityBill.create({
      data: req.body,
      include: { installation: true }
    });
    res.json(bill);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Bill already exists for this month/year and installation' });
    }
    res.status(500).json({ error: 'Failed to create bill' });
  }
};

export const updateMonthlyBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bill = await prisma.monthlyElectricityBill.update({
      where: { id },
      data: req.body
    });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bill' });
  }
};

export const markBillPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paidDate } = req.body;
    
    const bill = await prisma.monthlyElectricityBill.update({
      where: { id },
      data: { status: 'PAID', paidDate: new Date(paidDate) }
    });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark bill paid' });
  }
};

// ============================================================================
// ENERGY DASHBOARD
// ============================================================================

export const getEnergyDashboard = async (req: Request, res: Response) => {
  try {
    const { installationId, year } = req.query;
    const currentYear = year ? Number(year) : new Date().getFullYear();
    const where: any = {};
    const billWhere: any = { year: currentYear };
    
    if (installationId) {
      where.installationId = String(installationId);
      billWhere.installationId = String(installationId);
    }
    
    // Last 30 days energy
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = await prisma.dailyEnergyLog.findMany({
      where: { ...where, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'asc' }
    });
    
    // Monthly bills summary
    const bills = await prisma.monthlyElectricityBill.findMany({
      where: billWhere,
      include: { installation: true },
      orderBy: { month: 'asc' }
    });
    
    // Totals
    const totalFuelCost = recentLogs.reduce((sum, l) => sum + (l.fuelCost || 0), 0);
    const totalElectricCost = recentLogs.reduce((sum, l) => sum + (l.electricityCost || 0), 0);
    const totalElectricKwh = recentLogs.reduce((sum, l) => sum + (l.electricityKwh || 0), 0);
    const totalFuelQty = recentLogs.reduce((sum, l) => sum + (l.fuelQuantity || 0), 0);
    
    // Pending bills
    const pendingBills = bills.filter(b => b.status === 'PENDING');
    const overdueBills = bills.filter(b => b.status === 'OVERDUE' || (b.status === 'PENDING' && b.dueDate && new Date(b.dueDate) < new Date()));
    
    // Monthly trend
    const monthlyTrend = bills.map(b => ({
      month: b.month,
      year: b.year,
      units: b.unitsConsumed,
      amount: b.totalAmount,
      installation: b.installation?.installationId
    }));
    
    res.json({
      summary: {
        totalFuelCost,
        totalElectricCost,
        totalElectricKwh,
        totalFuelQty,
        pendingBillsCount: pendingBills.length,
        overdueBillsCount: overdueBills.length,
        totalBillAmount: bills.reduce((sum, b) => sum + b.totalAmount, 0)
      },
      recentLogs,
      monthlyTrend,
      pendingBills,
      overdueBills
    });
  } catch (error) {
    console.error('Energy Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch energy dashboard' });
  }
};
