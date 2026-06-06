import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  getSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  deleteSubmission,
} from '../controllers/checklist.controller';

const router = Router();

router.use(authenticateToken);

// Templates (structure / definitions)
router.get('/templates', getTemplates);
router.get('/templates/:id', getTemplate);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);

// Submissions (filled checklists + history)
router.get('/submissions', getSubmissions);
router.get('/submissions/:id', getSubmission);
router.post('/submissions', createSubmission);
router.put('/submissions/:id', updateSubmission);
router.delete('/submissions/:id', deleteSubmission);

export default router;
