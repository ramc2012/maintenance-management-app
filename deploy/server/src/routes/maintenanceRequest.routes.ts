import { Router } from 'express';
import {
  getRequests, createRequest, approveRequest,
  rejectRequest, convertToWorkOrder, updateRequest, closeRequest
} from '../controllers/maintenanceRequestController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/', getRequests);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.patch('/:id/close', closeRequest);
router.post('/:id/approve', approveRequest);
router.post('/:id/reject', rejectRequest);
router.post('/:id/convert', convertToWorkOrder);

export default router;
