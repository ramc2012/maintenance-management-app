import { Router } from 'express';
import {
  getStrategies, getStrategyById, createStrategy, updateStrategy, deleteStrategy,
  addTask, updateTask, deleteTask,
  getAssignments, createAssignment, deleteAssignment,
  getDueItems, checkTriggers
} from '../controllers/pms.controller';

const router = Router();

// Strategies
router.get('/strategies', getStrategies);
router.get('/strategies/:id', getStrategyById);
router.post('/strategies', createStrategy);
router.put('/strategies/:id', updateStrategy);
router.delete('/strategies/:id', deleteStrategy);

// Tasks
router.post('/tasks', addTask);
router.put('/tasks/:id', updateTask);
router.delete('/tasks/:id', deleteTask);

// Assignments
router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
router.delete('/assignments/:id', deleteAssignment);

// Due Items & Triggers
router.get('/due', getDueItems);
router.post('/check-triggers', checkTriggers);

export default router;
