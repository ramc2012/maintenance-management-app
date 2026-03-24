import { Router } from 'express';
import {
  getObservations,
  getObservationById,
  createObservation,
  updateObservation,
  deleteObservation,
  addAction,
  updateAction,
  deleteAction,
  getDashboard,
  getAuditLogs
} from '../controllers/auditController';
import { authorizeRole } from '../middleware/auth';

const router = Router();

// Dashboard
router.get('/dashboard', getDashboard);

// Observations CRUD
router.get('/observations', getObservations);
router.get('/observations/:id', getObservationById);
router.post('/observations', createObservation);
router.put('/observations/:id', updateObservation);
router.delete('/observations/:id', authorizeRole(['ADMIN']), deleteObservation);

// Actions within observations
router.post('/observations/:id/actions', addAction);
router.put('/observations/:id/actions/:actionId', updateAction);
router.delete('/observations/:id/actions/:actionId', deleteAction);

// Activity audit logs (admin only)
router.get('/logs', authorizeRole(['ADMIN']), getAuditLogs);

export default router;
