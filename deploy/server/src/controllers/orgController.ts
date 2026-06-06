import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_COMPANY_NAME = "ANKLESHWAR ASSET";
const DEFAULT_DEPARTMENTS = ["MECHANICAL", "ELECTRICAL", "INSTRUMENTATION", "WORKSHOP", "MOH"];

const sortDepartments = <T extends { name: string }>(departments: T[]) => {
  const order = new Map(DEFAULT_DEPARTMENTS.map((name, index) => [name, index]));
  return [...departments].sort((left, right) => {
    const leftName = left.name.trim().toUpperCase();
    const rightName = right.name.trim().toUpperCase();
    const leftRank = order.get(leftName);
    const rightRank = order.get(rightName);
    if (leftRank !== undefined || rightRank !== undefined) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }
    return left.name.localeCompare(right.name);
  });
};

const ensureDefaultHierarchy = async () => {
  let company = await prisma.company.findFirst({
    include: {
      departments: true,
    },
    orderBy: { name: "asc" },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: DEFAULT_COMPANY_NAME },
      include: {
        departments: true,
      },
    });
  }

  const existing = new Map(company.departments.map((department) => [department.name.trim().toUpperCase(), department]));
  const missingNames = DEFAULT_DEPARTMENTS.filter((name) => !existing.has(name));

  if (missingNames.length > 0) {
    await prisma.department.createMany({
      data: missingNames.map((name) => ({
        name,
        companyId: company.id,
      })),
    });

    company = await prisma.company.findUniqueOrThrow({
      where: { id: company.id },
      include: {
        departments: true,
      },
    });
  }

  return {
    ...company,
    departments: sortDepartments(company.departments),
  };
};

// Get full hierarchy: Company -> Departments (simplified)
export const getHierarchy = async (req: Request, res: Response) => {
  try {
    const company = await ensureDefaultHierarchy();
    res.json(company);
  } catch (error) {
    console.error("Error fetching hierarchy:", error);
    res.status(500).json({ error: "Failed to fetch hierarchy" });
  }
};

// Update Company
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const company = await prisma.company.update({
      where: { id },
      data: { name }
    });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: "Failed to update company" });
  }
};

// --- Department CRUD ---
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, companyId } = req.body;
    if (!name || !companyId) {
      return res.status(400).json({ error: "Name and companyId are required" });
    }
    const normalizedName = String(name).trim().toUpperCase();
    const department = await prisma.department.create({
      data: { name: normalizedName, companyId }
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: "Failed to create department" });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const data: any = {};
    if (name) data.name = String(name).trim().toUpperCase();
    const department = await prisma.department.update({
      where: { id },
      data
    });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: "Failed to update department" });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id } });
    res.json({ message: "Department deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete department" });
  }
};
