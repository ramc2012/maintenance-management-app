import { Router } from 'express';
import {
  getCalibrationEvents, getCalibrationEventById, createCalibrationEvent, updateCalibrationEvent,
  addCalibrationPoint, addMultiplePoints, calculateResults,
  approveEvent, getDueInstruments, getOverdueInstruments,
  getCertificate, generate5PointTemplate, exportCalibrationEvents, getInstrumentHistory
} from '../controllers/calibration.controller';

const router = Router();

// Calibration Events
router.get('/events', getCalibrationEvents);
router.get('/events/:id', getCalibrationEventById);
router.get('/instruments/:tagId/history', getInstrumentHistory);
router.post('/events', createCalibrationEvent);
router.put('/events/:id', updateCalibrationEvent);

// Calibration Points
router.post('/points', addCalibrationPoint);
router.post('/points/batch', addMultiplePoints);

// Auto-calculation & Approval
router.post('/events/:id/calculate', calculateResults);
router.post('/events/:id/approve', approveEvent);

// Due/Overdue
router.get('/due', getDueInstruments);
router.get('/overdue', getOverdueInstruments);

// Certificate
router.get('/certificate/:id', getCertificate);

// Template Generator
router.get('/template', generate5PointTemplate);

// Excel Export
router.get('/export', exportCalibrationEvents);

export default router;

// Tiered Calibration Routes
import {
  getInstrumentsByTier, updateInstrumentTier, classifyCustodyAsAutomated,
  createUnifiedHistoryEntry, importExternalCalibration,
  getUnifiedComplianceStats, getTierDistribution
} from '../controllers/calibration.controller';

router.get('/tiers/instruments', getInstrumentsByTier);
router.put('/tiers/instruments/:tagId', updateInstrumentTier);
router.post('/tiers/classify-custody', classifyCustodyAsAutomated);

router.post('/unified-history', createUnifiedHistoryEntry);
router.post('/import-external', importExternalCalibration);

router.get('/unified/stats', getUnifiedComplianceStats);
router.get('/tiers/distribution', getTierDistribution);
