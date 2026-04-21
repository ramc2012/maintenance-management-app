import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TokenPayload extends JwtPayload {
  id?: string;
  username?: string;
  role?: string;
}

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
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;

    if (payload.id && payload.username && payload.role) {
      (req as any).user = {
        id: payload.id,
        username: payload.username,
        role: payload.role,
      };
      return next();
    }

    if (!payload.id) {
      return res.sendStatus(401);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, role: true },
    });

    if (!dbUser) {
      return res.sendStatus(401);
    }

    (req as any).user = dbUser;
    return next();
  } catch (err) {
    console.error("[Auth] Token verification failed:", err);
    return res.sendStatus(401);
  }
};
