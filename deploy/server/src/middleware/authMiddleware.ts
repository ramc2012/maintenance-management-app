import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { buildAuthUserPayload } from "../services/disciplineAccess";

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

    if (!payload.id) {
      return res.sendStatus(401);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        username: true,
        role: true,
        jobTitle: true,
        canCreateWorkOrder: true,
        canCloseWorkOrder: true,
        department: {
          select: {
            name: true,
          },
        },
        disciplineAccesses: {
          select: {
            discipline: true,
            accessLevel: true,
            isDefault: true,
            canViewProcurement: true,
            canUpdateProcurement: true,
            canRaiseRequirements: true,
          },
          orderBy: [
            { isDefault: 'desc' },
            { discipline: 'asc' },
          ],
        },
      },
    });

    if (!dbUser) {
      return res.sendStatus(401);
    }

    (req as any).user = buildAuthUserPayload(dbUser);
    return next();
  } catch (err) {
    console.error("[Auth] Token verification failed:", err);
    return res.sendStatus(401);
  }
};
