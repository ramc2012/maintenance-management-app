import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const attachRequestContext = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.headers['x-request-id'];
  const requestId =
    typeof incomingRequestId === 'string' && incomingRequestId.trim()
      ? incomingRequestId.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};
