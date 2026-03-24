import { Router } from 'express';
import {
  getRunningHoursLogs,
  createRunningHoursLog,
  getCompressionLogs,
  createCompressionLog,
  deleteRunningHoursLog,
  deleteCompressionLog
} from '../controllers/logbookExtController';
import { authorizeRole } from '../middleware/auth';

const router = Router();

// Running Hours
router.get('/running-hours', getRunningHoursLogs);
router.post('/running-hours', createRunningHoursLog);
router.delete('/running-hours/:id', authorizeRole(['ADMIN']), deleteRunningHoursLog);

// Gas Compression
router.get('/compression', getCompressionLogs);
router.post('/compression', createCompressionLog);
router.delete('/compression/:id', authorizeRole(['ADMIN']), deleteCompressionLog);

// Electrical Tests (stub - returns empty array until data is seeded)
router.get('/electrical-tests', (_req, res) => res.json([]));
router.post('/electrical-tests', (_req, res) => res.status(201).json({ message: 'Electrical test log created' }));

export default router;
