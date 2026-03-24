import { Router } from 'express';
import {
  getContracts, getContractById, createContract, updateContract,
  deleteContract, addMilestone, updateMilestone, getContractStats
} from '../controllers/contractsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/stats', getContractStats);
router.get('/', getContracts);
router.get('/:id', getContractById);
router.post('/', createContract);
router.put('/:id', updateContract);
router.delete('/:id', deleteContract);
router.post('/:id/milestones', addMilestone);
router.put('/:id/milestones/:milestoneId', updateMilestone);

export default router;
