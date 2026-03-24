import { Router } from 'express';
import {
  getTrainings, getTrainingById, createTraining, updateTraining,
  addAttendees, markAttendance, getTrainingDashboard
} from '../controllers/training.controller';

const router = Router();

// Dashboard
router.get('/dashboard', getTrainingDashboard);

// CRUD
router.get('/', getTrainings);
router.get('/:id', getTrainingById);
router.post('/', createTraining);
router.put('/:id', updateTraining);

// Attendees
router.post('/attendees', addAttendees);
router.put('/attendees/mark', markAttendance);

export default router;
