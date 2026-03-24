import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getBudgets = async (req: Request, res: Response) => {
    const { fy, departmentId } = req.query;
    try {
        const where: any = {};
        if (fy) where.fy = String(fy);
        if (departmentId) where.departmentId = String(departmentId);

        const budgets = await prisma.budget.findMany({
            where,
            include: {
                department: true
            },
            orderBy: { fy: 'desc' }
        });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching budgets' });
    }
};

export const createBudget = async (req: Request, res: Response) => {
    const { departmentId, fy, category, amount } = req.body;
    try {
        const budget = await prisma.budget.create({
            data: {
                departmentId,
                fy,
                category,
                amount: parseFloat(amount)
            }
        });
        res.status(201).json(budget);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating budget' });
    }
};

export const updateBudget = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
        const budget = await prisma.budget.update({
            where: { id },
            data: { amount: parseFloat(amount) }
        });
        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: 'Error updating budget' });
    }
};

export const deleteBudget = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.budget.delete({ where: { id } });
        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting budget' });
    }
};
