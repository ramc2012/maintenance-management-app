import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get full hierarchy: Company -> Departments (simplified)
export const getHierarchy = async (req: Request, res: Response) => {
  try {
    let company = await prisma.company.findFirst({
      include: {
        departments: true
      }
    });

    // Create default company if none exists
    if (!company) {
      company = await prisma.company.create({
        data: { name: "My Organization" },
        include: {
          departments: true
        }
      });
    }

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
    const department = await prisma.department.create({
      data: { name, companyId }
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
    if (name) data.name = name;
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
