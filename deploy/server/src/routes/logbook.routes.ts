import { Router } from 'express';
import { getLogbookEntries, getLastLog, createLog, deleteLog } from '../controllers/logbookController';
import { authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/', getLogbookEntries);
router.get('/last/:equipmentTag', getLastLog);
router.post('/', createLog);
router.delete('/:id', authorizeRole(['ADMIN']), deleteLog);

export default router;
