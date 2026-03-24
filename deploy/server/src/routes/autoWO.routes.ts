import { Router, Request, Response } from 'express';
import { authorizeRole } from '../middleware/auth';
import { runAutoWOGeneration } from '../services/autoWOService';

const router = Router();

// Trigger auto-WO generation (can be called by cron or manually by admin)
router.post('/trigger', authorizeRole(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const result = await runAutoWOGeneration();
    res.json(result);
  } catch (error) {
    console.error('Auto-WO trigger error:', error);
    res.status(500).json({ error: 'Failed to run auto-WO generation' });
  }
});

export default router;
