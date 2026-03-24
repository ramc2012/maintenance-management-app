import { Router } from 'express';
import {
  getMOHDashboard, getMOHRecords, getMOHById, initiateMOH,
  updateMOH, updateMOHStatus, linkToProcurement, deleteMOH
} from '../controllers/moh.controller';
import { authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/dashboard', getMOHDashboard);
router.get('/', getMOHRecords);
router.get('/:id', getMOHById);
router.post('/', initiateMOH);
router.put('/:id', updateMOH);
router.put('/:id/status', updateMOHStatus);
router.put('/:id/procurement', linkToProcurement);
router.delete('/:id', authorizeRole(['ADMIN']), deleteMOH);

export default router;
