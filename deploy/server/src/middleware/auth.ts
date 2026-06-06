import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './authMiddleware';

export { authenticateToken };

export const authorizeRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
};
