import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { workshopHandlers, notificationHandlers } = vi.hoisted(() => ({
  workshopHandlers: {
    getWorkshopDashboard: vi.fn((_req, res) => res.json({ ok: true })),
    getJobs: vi.fn((_req, res) => res.json([])),
    getJobById: vi.fn((_req, res) => res.json({ id: 'job-1' })),
    createJob: vi.fn((_req, res) => res.status(201).json({ id: 'job-1' })),
    updateJob: vi.fn((_req, res) => res.json({ id: 'job-1' })),
    updateJobStatus: vi.fn((_req, res) => res.json({ id: 'job-1' })),
  },
  notificationHandlers: {
    getNotifications: vi.fn((req, res) => res.json({ user: req.user, data: [] })),
    getUnreadCount: vi.fn((_req, res) => res.json({ count: 0 })),
    markAllNotificationsRead: vi.fn((_req, res) => res.json({ updated: 0 })),
    markNotificationRead: vi.fn((_req, res) => res.json({ id: 'notification-1' })),
    runNotificationSweep: vi.fn((_req, res) => res.json({ created: 0 })),
  },
}));

vi.mock('../src/middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    if (req.headers.authorization !== 'Bearer valid-token') return res.sendStatus(401);
    req.user = { id: 'user-1', username: 'admin', role: 'ADMIN' };
    return next();
  },
  authorizeRole: (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) return res.sendStatus(403);
    return next();
  },
}));

vi.mock('../src/controllers/workshop.controller', () => workshopHandlers);
vi.mock('../src/controllers/notificationController', () => notificationHandlers);

import workshopRoutes from '../src/routes/workshop.routes';
import notificationRoutes from '../src/routes/notification.routes';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/workshop', workshopRoutes);
  app.use('/notifications', notificationRoutes);
  return app;
};

describe('protected routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires auth for workshop reads and writes', async () => {
    const app = buildApp();

    await request(app).get('/workshop/dashboard').expect(401);
    await request(app).post('/workshop').send({ title: 'Blocked' }).expect(401);

    await request(app)
      .get('/workshop/dashboard')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    await request(app)
      .post('/workshop')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Allowed' })
      .expect(201);

    expect(workshopHandlers.getWorkshopDashboard).toHaveBeenCalledOnce();
    expect(workshopHandlers.createJob).toHaveBeenCalledOnce();
  });

  it('requires auth for notification feed and read actions', async () => {
    const app = buildApp();

    await request(app).get('/notifications?status=UNREAD').expect(401);
    await request(app).post('/notifications/notification-1/read').expect(401);

    const feed = await request(app)
      .get('/notifications?status=UNREAD')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
    await request(app)
      .post('/notifications/notification-1/read')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(feed.body.user).toEqual({ id: 'user-1', username: 'admin', role: 'ADMIN' });
    expect(notificationHandlers.getNotifications).toHaveBeenCalledOnce();
    expect(notificationHandlers.markNotificationRead).toHaveBeenCalledOnce();
  });
});
