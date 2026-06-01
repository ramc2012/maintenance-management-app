import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  runNotificationSweep,
} from '../controllers/notificationController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);
router.post('/sweep', authorizeRole(['ADMIN']), runNotificationSweep);

export default router;
