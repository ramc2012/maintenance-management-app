import { Router } from 'express';
import {
  getMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  getManpower,
  createManpower,
  updateManpower,
  getMonthlyReportLogs,
  getAnnualReportLogs,
  exportMaintenanceLogs,
} from '../controllers/maintenance.controller';

const router = Router();

// Maintenance Logs
router.get('/logs', getMaintenanceLogs);
router.get('/logs/export', exportMaintenanceLogs);
router.post('/logs', createMaintenanceLog);
router.put('/logs/:id', updateMaintenanceLog);

// Manpower
router.get('/manpower', getManpower);
router.post('/manpower', createManpower);
router.put('/manpower/:id', updateManpower);

// Report Queries
router.get('/reports/monthly', getMonthlyReportLogs);
router.get('/reports/annual', getAnnualReportLogs);

export default router;
