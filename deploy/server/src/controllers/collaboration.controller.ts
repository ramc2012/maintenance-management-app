import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all discussions
export const getDiscussions = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = String(category);
    
    const discussions = await prisma.discussion.findMany({
      where,
      include: {
        _count: { select: { replies: true, reactions: true } }
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }]
    });
    res.json(discussions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
};

// Get discussion with replies
export const getDiscussionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Increment view count
    await prisma.discussion.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });
    
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        replies: {
          include: {
            reactions: true,
            _count: { select: { reactions: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        reactions: true
      }
    });
    res.json(discussion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch discussion' });
  }
};

// Create discussion
export const createDiscussion = async (req: Request, res: Response) => {
  try {
    const discussion = await prisma.discussion.create({
      data: req.body
    });
    res.json(discussion);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create discussion' });
  }
};

// Add reply
export const addReply = async (req: Request, res: Response) => {
  try {
    const reply = await prisma.discussionReply.create({
      data: req.body
    });
    res.json(reply);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
};

// React to discussion
export const reactToDiscussion = async (req: Request, res: Response) => {
  try {
    const { discussionId, userId, reactionType } = req.body;
    
    const existing = await prisma.discussionReaction.findUnique({
      where: { discussionId_userId: { discussionId, userId } }
    });
    
    if (existing) {
      if (existing.reactionType === reactionType) {
        await prisma.discussionReaction.delete({ where: { id: existing.id } });
        return res.json({ removed: true });
      }
      const updated = await prisma.discussionReaction.update({
        where: { id: existing.id },
        data: { reactionType }
      });
      return res.json(updated);
    }
    
    const reaction = await prisma.discussionReaction.create({
      data: { discussionId, userId, reactionType }
    });
    res.json(reaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to react' });
  }
};

// React to reply
export const reactToReply = async (req: Request, res: Response) => {
  try {
    const { replyId, userId, reactionType } = req.body;
    
    const existing = await prisma.replyReaction.findUnique({
      where: { replyId_userId: { replyId, userId } }
    });
    
    if (existing) {
      if (existing.reactionType === reactionType) {
        await prisma.replyReaction.delete({ where: { id: existing.id } });
        return res.json({ removed: true });
      }
      const updated = await prisma.replyReaction.update({
        where: { id: existing.id },
        data: { reactionType }
      });
      return res.json(updated);
    }
    
    const reaction = await prisma.replyReaction.create({
      data: { replyId, userId, reactionType }
    });
    res.json(reaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to react' });
  }
};

// ============ FEEDBACK ============

// Get all feedback
export const getFeedback = async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;
    const where: any = {};
    if (category) where.category = String(category);
    if (status) where.status = String(status);
    
    const feedback = await prisma.feedback.findMany({
      where,
      include: {
        _count: { select: { reactions: true, comments: true } }
      },
      orderBy: { upvotes: 'desc' }
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

// Get feedback by ID
export const getFeedbackById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        reactions: true,
        comments: { orderBy: { createdAt: 'asc' } }
      }
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

// Create feedback
export const createFeedback = async (req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.create({
      data: req.body
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feedback' });
  }
};

// Vote on feedback
export const voteFeedback = async (req: Request, res: Response) => {
  try {
    const { feedbackId, userId, voteType } = req.body;
    
    const existing = await prisma.feedbackReaction.findUnique({
      where: { feedbackId_userId: { feedbackId, userId } }
    });
    
    if (existing) {
      // Remove old vote
      const oldVote = existing.voteType;
      await prisma.feedbackReaction.delete({ where: { id: existing.id } });
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: oldVote === 'UP' ? { upvotes: { decrement: 1 } } : { downvotes: { decrement: 1 } }
      });
      
      if (oldVote === voteType) {
        return res.json({ removed: true });
      }
    }
    
    // Add new vote
    await prisma.feedbackReaction.create({
      data: { feedbackId, userId, voteType }
    });
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: voteType === 'UP' ? { upvotes: { increment: 1 } } : { downvotes: { increment: 1 } }
    });
    
    res.json({ voted: voteType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
};

// Add comment to feedback
export const addFeedbackComment = async (req: Request, res: Response) => {
  try {
    const comment = await prisma.feedbackComment.create({
      data: req.body
    });
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// Update feedback status
export const updateFeedbackStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const feedback = await prisma.feedback.update({
      where: { id },
      data: { status }
    });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};
