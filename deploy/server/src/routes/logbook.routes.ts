import { Router } from 'express';
import {
  getLogbookEntries,
  getLastLog,
  createLog,
  deleteLog,
  getCompressionLogs,
  createCompressionLog,
  deleteCompressionLog,
} from '../controllers/logbookController';
import { authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/', getLogbookEntries);
router.get('/last/:equipmentTag', getLastLog);
router.get('/compression', getCompressionLogs);
router.post('/', createLog);
router.post('/compression', createCompressionLog);
router.delete('/:id', authorizeRole(['ADMIN']), deleteLog);
router.delete('/compression/:id', authorizeRole(['ADMIN']), deleteCompressionLog);

export default router;
