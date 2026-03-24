import { Router } from 'express';
import {
  getDiscussions, getDiscussionById, createDiscussion, addReply,
  reactToDiscussion, reactToReply,
  getFeedback, getFeedbackById, createFeedback, voteFeedback,
  addFeedbackComment, updateFeedbackStatus
} from '../controllers/collaboration.controller';

const router = Router();

// Discussions
router.get('/discussions', getDiscussions);
router.get('/discussions/:id', getDiscussionById);
router.post('/discussions', createDiscussion);
router.post('/discussions/reply', addReply);
router.post('/discussions/react', reactToDiscussion);
router.post('/discussions/reply/react', reactToReply);

// Feedback
router.get('/feedback', getFeedback);
router.get('/feedback/:id', getFeedbackById);
router.post('/feedback', createFeedback);
router.post('/feedback/vote', voteFeedback);
router.post('/feedback/comment', addFeedbackComment);
router.put('/feedback/:id/status', updateFeedbackStatus);

export default router;
