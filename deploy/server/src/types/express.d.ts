import type { AuthUserPayload } from '../services/disciplineAccess';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUserPayload;
    }
  }
}

export {};
