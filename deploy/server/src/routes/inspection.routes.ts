import { Router } from 'express';
import {
  getRounds,
  getRoundById,
  createRound,
  updateRound,
  deleteRound,
  getExecutions,
  startExecution,
  updateExecution,
  completeExecution,
  getExecutionById,
  getInspectionStats,
} from '../controllers/inspection.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Stats
router.get('/stats', getInspectionStats);

// Rounds
router.get('/rounds', getRounds);
router.get('/rounds/:id', getRoundById);
router.post('/rounds', createRound);
router.put('/rounds/:id', updateRound);
router.delete('/rounds/:id', deleteRound);

// Executions
router.get('/executions', getExecutions);
router.get('/executions/:id', getExecutionById);
router.post('/executions', startExecution);
router.put('/executions/:id', updateExecution);
router.post('/executions/:id/complete', completeExecution);

export default router;
