import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sweepNotifications } from '../services/notificationService';

const DEFAULT_PAGE_SIZE = 20;

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || DEFAULT_PAGE_SIZE))));
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const module = req.query.module ? String(req.query.module).toUpperCase() : undefined;
    const scope = req.query.scope === 'all' && req.user?.role === 'ADMIN' ? 'all' : 'mine';

    const where: any = {};
    if (status) where.status = status;
    if (module) where.module = module;
    if (scope !== 'all') {
      where.OR = [
        { userId: req.user?.id || undefined },
        { userId: null }
      ];
    }

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    ]);

    return res.json({
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const count = await prisma.notification.count({
      where: {
        status: 'UNREAD',
        OR: [{ userId }, { userId: null }]
      }
    });
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ message: 'Notification not found' });

    const canAccess = req.user?.role === 'ADMIN' || existing.userId === null || existing.userId === req.user?.id;
    if (!canAccess) return res.status(403).json({ message: 'No permission' });

    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: 'READ', readAt: new Date() },
    });
    return res.json(notification);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        status: 'UNREAD',
        OR: [{ userId: req.user?.id || undefined }, { userId: null }],
      },
      data: { status: 'READ', readAt: new Date() },
    });
    return res.json({ updated: result.count });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

export const runNotificationSweep = async (_req: Request, res: Response) => {
  try {
    const result = await sweepNotifications();
    return res.json(result);
  } catch (error) {
    console.error('Notification sweep error:', error);
    return res.status(500).json({ error: 'Failed to run sweep' });
  }
};
