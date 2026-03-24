import { Router } from 'express';
import {
  getPresentations, uploadPresentation, deletePresentation,
  downloadPresentation, viewPresentation, updatePresentation, upload
} from '../controllers/presentationsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/', getPresentations);
// Support both POST /upload (canonical) and POST / (frontend compatibility)
router.post('/upload', upload.single('file'), uploadPresentation);
router.post('/', upload.single('file'), uploadPresentation);
router.get('/:id/view', viewPresentation);
router.get('/:id/download', downloadPresentation);
router.put('/:id', updatePresentation);
router.delete('/:id', deletePresentation);

export default router;
