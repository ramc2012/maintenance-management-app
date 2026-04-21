import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const contractWorkspaceInclude = {
  milestones: { orderBy: { dueDate: 'asc' as const } },
  documents: true,
  userAccesses: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          isExternal: true,
          companyName: true,
          phone: true,
          jobTitle: true,
        }
      }
    }
  },
  installationScopes: {
    include: {
      installation: true,
    }
  },
  instrumentTypeScopes: true,
  equipmentScopes: true,
  functionalLocationScopes: {
    include: {
      fl: {
        select: {
          id: true,
          flId: true,
          name: true,
          systemId: true,
        }
      }
    }
  },
} as const;

const generateContractNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `CNT-${year}`;
  const count = await prisma.contract.count({ where: { contractNumber: { startsWith: prefix } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const getContracts = async (req: Request, res: Response) => {
  try {
    const { status, workType } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (workType) where.workType = String(workType);

    const contracts = await prisma.contract.findMany({
      where,
      include: contractWorkspaceInclude,
      orderBy: { createdAt: 'desc' }
    });
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
};

export const getContractById = async (req: Request, res: Response) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: contractWorkspaceInclude,
    });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
};

export const createContract = async (req: Request, res: Response) => {
  try {
    const contractNumber = await generateContractNumber();
    const contract = await prisma.contract.create({
      data: { ...req.body, contractNumber },
      include: contractWorkspaceInclude,
    });
    res.json(contract);
  } catch (error) {
    console.error('Create Contract Error:', error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
};

export const updateContract = async (req: Request, res: Response) => {
  try {
    const contract = await prisma.contract.update({
      where: { id: req.params.id },
      data: req.body,
      include: contractWorkspaceInclude,
    });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contract' });
  }
};

export const deleteContract = async (req: Request, res: Response) => {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } });
    res.json({ message: 'Contract deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contract' });
  }
};

export const addMilestone = async (req: Request, res: Response) => {
  try {
    const milestone = await prisma.contractMilestone.create({
      data: { ...req.body, contractId: req.params.id }
    });
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add milestone' });
  }
};

export const updateMilestone = async (req: Request, res: Response) => {
  try {
    const milestone = await prisma.contractMilestone.update({
      where: { id: req.params.milestoneId },
      data: req.body
    });
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update milestone' });
  }
};

export const getContractStats = async (req: Request, res: Response) => {
  try {
    const [active, expired, total, externalEnabled] = await Promise.all([
      prisma.contract.count({ where: { status: 'ACTIVE' } }),
      prisma.contract.count({ where: { status: 'EXPIRED' } }),
      prisma.contract.count(),
      prisma.contract.count({ where: { externalAccessEnabled: true } }),
    ]);
    const sumResult = await prisma.contract.aggregate({ _sum: { contractValue: true } });
    res.json({ active, expired, total, externalEnabled, totalValue: sumResult._sum.contractValue || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
