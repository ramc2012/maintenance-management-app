import { Router } from 'express';
import {
  getWorkOrders, getWorkOrderById, createWorkOrder, updateWorkOrder,
  closeWorkOrder, getStats,
  getFailureModes, getCauseCodes, getActionCodes, seedIsoCodes,
  getWorkOrderWithTeam, addTeamMember, addChecklistItem, updateChecklistItem,
  deleteWorkOrder
} from '../controllers/workorder.controller';
import { authorizeRole } from '../middleware/auth';

const router = Router();

// Work Orders CRUD
router.get('/', getWorkOrders);
router.get('/stats', getStats);
router.get('/:id', getWorkOrderById);
router.post('/', createWorkOrder);
router.put('/:id', updateWorkOrder);
router.post('/:id/close', closeWorkOrder);

// ISO 14224 Codes
router.get('/codes/failure-modes', getFailureModes);
router.get('/codes/cause-codes', getCauseCodes);
router.get('/codes/action-codes', getActionCodes);
router.post('/codes/seed', seedIsoCodes);

// Work Order Team & Checklist
router.get('/:id/detail', getWorkOrderWithTeam);
router.post('/:id/team', addTeamMember);
router.post('/:id/checklist', addChecklistItem);
router.put('/:id/checklist/:itemId', updateChecklistItem);
router.delete('/:id', authorizeRole(['ADMIN']), deleteWorkOrder);

export default router;
