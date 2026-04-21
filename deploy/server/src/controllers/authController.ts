import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid password' });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        canCreateWorkOrder: user.canCreateWorkOrder,
        canCloseWorkOrder: user.canCloseWorkOrder,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, role },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true, username: true, role: true,
                lastLogin: true, createdAt: true,
                canCreateWorkOrder: true, canCloseWorkOrder: true
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const updateUserPermissions = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { canCreateWorkOrder, canCloseWorkOrder } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(canCreateWorkOrder !== undefined ? { canCreateWorkOrder: Boolean(canCreateWorkOrder) } : {}),
                ...(canCloseWorkOrder !== undefined ? { canCloseWorkOrder: Boolean(canCloseWorkOrder) } : {}),
            },
            select: {
                id: true,
                username: true,
                role: true,
                canCreateWorkOrder: true,
                canCloseWorkOrder: true,
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating permissions' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid current password' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password' });
    }
};
