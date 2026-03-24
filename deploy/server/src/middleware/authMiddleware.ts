import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    
    // Check if payload has username, if not fetch from DB (Handle Stale Tokens)
    if (!payload.username && payload.id) {
        // Use lazy require/import to avoid circular dependencies or initialization order issues
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        console.log(`[Auth] Token missing username, fetching from DB for ID: ${payload.id}`);
        
        try {
            const dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
            
            if (dbUser) {
                 // Attach full user details including username
                 (req as any).user = { ...payload, username: dbUser.username, role: dbUser.role };
                 return next();
            } else {
                 console.log(`[Auth] User ID ${payload.id} not found in DB`);
                 return res.sendStatus(403);
            }
        } catch (dbError) {
            console.error("[Auth] Database error fetching user:", dbError);
            return res.sendStatus(500);
        } finally {
            await prisma.$disconnect();
        }
    }

    (req as any).user = payload;
    next();
  } catch (err) {
    console.error("[Auth] Token verification failed:", err);
    return res.sendStatus(401);
  }
};
