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
  getEquipmentMaintenanceHistory
} from '../controllers/maintenance.controller';

const router = Router();

// Maintenance Logs
router.get('/logs', getMaintenanceLogs);
router.post('/logs', createMaintenanceLog);
router.put('/logs/:id', updateMaintenanceLog);

// Unified equipment maintenance history (instruments + running equipment)
// GET /api/maintenance/equipment/:tag/history
router.get('/equipment/:tag/history', getEquipmentMaintenanceHistory);

// Manpower
router.get('/manpower', getManpower);
router.post('/manpower', createManpower);
router.put('/manpower/:id', updateManpower);

// Report Queries
router.get('/reports/monthly', getMonthlyReportLogs);
router.get('/reports/annual', getAnnualReportLogs);

export default router;
