import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppError, errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { attachRequestContext } from '../src/middleware/requestContext';

describe('error middleware', () => {
  it('returns structured error payloads', async () => {
    const app = express();
    app.use(attachRequestContext);
    app.get('/boom', () => {
      throw new AppError(409, 'CONFLICT', 'Already exists');
    });
    app.use(notFoundHandler);
    app.use(errorHandler);

    const response = await request(app).get('/boom');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'CONFLICT',
      message: 'Already exists',
    });
    expect(response.body.requestId).toBeTruthy();
  });
});
