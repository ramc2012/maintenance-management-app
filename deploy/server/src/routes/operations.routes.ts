import { Router } from 'express';
import {
  createCompressorLog,
  createOperationalLog,
  deleteCompressorLog,
  deleteOperationalLog,
  getCompressorLogs,
  getOperationalAssetProfile,
  getOperationalAssetTimeline,
  getOperationalLogs,
  getOperationalOverview,
  getOperationalProfiles,
} from '../controllers/operations.controller';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/overview', getOperationalOverview);
router.get('/profiles', getOperationalProfiles);
router.get('/assets/:equipmentTag/profile', getOperationalAssetProfile);
router.get('/assets/:equipmentTag/timeline', getOperationalAssetTimeline);

router.get('/logs', getOperationalLogs);
router.post('/logs', createOperationalLog);
router.delete('/logs/:id', authorizeRole(['ADMIN']), deleteOperationalLog);

router.get('/compressors/logs', getCompressorLogs);
router.post('/compressors/logs', createCompressorLog);
router.delete('/compressors/logs/:id', authorizeRole(['ADMIN']), deleteCompressorLog);

export default router;
