import { Router } from 'express';
import {
  getJobs, getJobById, createJob, updateJob, updateJobStatus, getWorkshopDashboard
} from '../controllers/workshop.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', getWorkshopDashboard);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', createJob);
router.put('/:id', updateJob);
router.put('/:id/status', updateJobStatus);

export default router;
