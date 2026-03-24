import { Router } from 'express';
import {
  getDailyEnergyLogs, createDailyEnergyLog, updateDailyEnergyLog,
  getMonthlyBills, createMonthlyBill, updateMonthlyBill, markBillPaid,
  getEnergyDashboard
} from '../controllers/energy.controller';

const router = Router();

// Dashboard
router.get('/dashboard', getEnergyDashboard);

// Daily Energy Logs
router.get('/daily', getDailyEnergyLogs);
router.post('/daily', createDailyEnergyLog);
router.put('/daily/:id', updateDailyEnergyLog);

// Monthly Bills
router.get('/bills', getMonthlyBills);
router.post('/bills', createMonthlyBill);
router.put('/bills/:id', updateMonthlyBill);
router.post('/bills/:id/pay', markBillPaid);

export default router;
