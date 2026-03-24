import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  runNotificationSweep,
} from '../controllers/notificationController';
import { authorizeRole } from '../middleware/auth';

const router = Router();

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);
router.post('/sweep', authorizeRole(['ADMIN']), runNotificationSweep);

export default router;
