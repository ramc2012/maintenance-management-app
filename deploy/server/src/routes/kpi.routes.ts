import { Router } from 'express';
import {
  getKPISummary,
  getHealthScore,
  getHealthTable,
  getEquipmentTimeline,
  getResponseTimeReport,
  getMaintenanceCost,
  getLaborRates,
  createLaborRate,
  updateLaborRate,
  deleteLaborRate,
  exportKPIReport,
} from '../controllers/kpi.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// KPI summary (all 10 KPIs for a period)
router.get('/summary', getKPISummary);

// Equipment health
router.get('/health-table', getHealthTable);
router.get('/health-score/:tag', getHealthScore);

// Equipment timeline
router.get('/timeline/:tag', getEquipmentTimeline);

// Reports
router.get('/response-time', getResponseTimeReport);
router.get('/maintenance-cost', getMaintenanceCost);
router.get('/report/export', exportKPIReport);

// Labor rates
router.get('/labor-rates', getLaborRates);
router.post('/labor-rates', createLaborRate);
router.put('/labor-rates/:id', updateLaborRate);
router.delete('/labor-rates/:id', deleteLaborRate);

export default router;
