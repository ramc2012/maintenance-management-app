import { Router } from 'express';
import {
  getWorkOrders, getWorkOrderById, createWorkOrder, updateWorkOrder,
  closeWorkOrder, getStats,
  getFailureModes, getCauseCodes, getActionCodes, seedIsoCodes,
  getWorkOrderWithTeam, addTeamMember, addChecklistItem, updateChecklistItem,
  uploadAttachments, getAttachments, deleteAttachment, serveAttachment,
  exportWorkOrders, woUpload,
} from '../controllers/workorder.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Export (before /:id to avoid conflict)
router.get('/export', exportWorkOrders);

// ISO 14224 Codes (before /:id)
router.get('/codes/failure-modes', getFailureModes);
router.get('/codes/cause-modes', getFailureModes);
router.get('/codes/cause-codes', getCauseCodes);
router.get('/codes/action-codes', getActionCodes);
router.post('/codes/seed', seedIsoCodes);

// Work Orders CRUD
router.get('/', getWorkOrders);
router.get('/stats', getStats);
router.get('/:id', getWorkOrderById);
router.post('/', createWorkOrder);
router.put('/:id', updateWorkOrder);
router.post('/:id/close', closeWorkOrder);

// Work Order Team & Checklist
router.get('/:id/detail', getWorkOrderWithTeam);
router.post('/:id/team', addTeamMember);
router.post('/:id/checklist', addChecklistItem);
router.put('/:id/checklist/:itemId', updateChecklistItem);

// Attachments
router.get('/:id/attachments', getAttachments);
router.post('/:id/attachments', woUpload.array('files', 10), uploadAttachments);
router.get('/:id/attachments/:attachId/file', serveAttachment);
router.delete('/:id/attachments/:attachId', deleteAttachment);

export default router;
