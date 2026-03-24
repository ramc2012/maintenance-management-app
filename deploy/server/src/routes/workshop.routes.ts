import { Router } from 'express';
import {
  getJobs, getJobById, createJob, updateJob, updateJobStatus, getWorkshopDashboard
} from '../controllers/workshop.controller';

const router = Router();

router.get('/dashboard', getWorkshopDashboard);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', createJob);
router.put('/:id', updateJob);
router.put('/:id/status', updateJobStatus);

export default router;
