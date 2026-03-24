import { Router } from 'express';
import {
  seedISO14224Codes,
  getFailureModes, getFailureMechanisms, getCauseCodes, getActionCodes,
  getISO14224Levels, calculateMTBF,
  getRCMAnalysis, createRCMAnalysis, updateRCMAnalysis, deleteRCMAnalysis, getRCMByStrategy
} from '../controllers/iso14224.controller';

const router = Router();

// Seed all ISO 14224 codes
router.post('/seed', seedISO14224Codes);

// Dropdown data
router.get('/levels', getISO14224Levels);
router.get('/failure-modes', getFailureModes);
router.get('/failure-mechanisms', getFailureMechanisms);
router.get('/cause-codes', getCauseCodes);
router.get('/action-codes', getActionCodes);

// Metrics
router.get('/mtbf', calculateMTBF);

// RCM Analysis
router.get('/rcm', getRCMAnalysis);
router.post('/rcm', createRCMAnalysis);

export default router;

// RCM Analysis Update/Delete
router.put('/rcm/:id', updateRCMAnalysis);
router.delete('/rcm/:id', deleteRCMAnalysis);
router.get('/rcm/strategy/:strategyId', getRCMByStrategy);
