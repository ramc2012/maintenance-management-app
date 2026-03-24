import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getCases = async (req: Request, res: Response) => {
  try {
    const { type, departmentId } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (departmentId) where.departmentId = departmentId;

    const cases = await prisma.case.findMany({
      where,
      include: {
        department: true,
        comments: {
          include: {
            user: {
              select: { username: true },
            },
          },
          orderBy: { timestamp: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: "Error fetching cases" });
  }
};

export const getCaseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const caseItem = await prisma.case.findUnique({
      where: { id },
      include: {
        department: true,
        comments: {
          include: {
            user: {
              select: { username: true },
            },
          },
          orderBy: { timestamp: "desc" },
        },
      },
    });
    if (!caseItem) return res.status(404).json({ error: "Case not found" });
    res.json(caseItem);
  } catch (error) {
    res.status(500).json({ error: "Error fetching case" });
  }
};

export const createCase = async (req: Request, res: Response) => {
  const { title, type, vendor, prValue, poValue, currency, prNumber, poNumber, sanctionFileNumber, tenderingFileNumber, procurementMethod, category, value, createdAt, departmentId, vendorCode, tag, processedBy } = req.body;

  // Strict Auth Check
  if (!(req as any).user || !(req as any).user.username) {
      return res.status(401).json({ error: "User not authenticated" });
  }

  const createdBy = (req as any).user.username;

  try {
    const newCase = await prisma.case.create({
      data: {
        title,
        type,
        currentStage: "Requirement Raised",
        createdBy,
        vendor,
        vendorCode,
        prValue: prValue ? parseFloat(prValue) : null,
        poValue: poValue ? parseFloat(poValue) : null,
        currency: currency || "INR",
        prNumber,
        poNumber,
        sanctionFileNumber,
        tenderingFileNumber,
        procurementMethod,
        category,
        value: value ? parseFloat(value) : null,
        tag,
        processedBy,
        departmentId: departmentId || null,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
    });
    res.json(newCase);
  } catch (error) {
    console.error("Error creating case:", error);
    res.status(500).json({ error: "Error creating case" });
  }
};

export const addComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, effectiveDate } = req.body;
  const userId = (req as any).user.id;

  try {
    const caseItem = await prisma.case.findUnique({ where: { id } });
    if (!caseItem) return res.status(404).json({ error: "Case not found" });

    const comment = await prisma.caseComment.create({
      data: {
        content,
        caseId: id,
        userId,
        stageSnapshot: caseItem.currentStage,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined
      },
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    // Update case timestamp
    await prisma.case.update({
        where: { id },
        data: { updatedAt: new Date() }
    });

    res.json(comment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Error adding comment" });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stage, effectiveDate } = req.body;
  const userId = (req as any).user.id;

  try {
    const updatedCase = await prisma.case.update({
      where: { id },
      data: { currentStage: stage },
    });

    // Auto-generate comment for stage change
    await prisma.caseComment.create({
      data: {
        content: `Stage updated to ${stage}`,
        caseId: id,
        userId,
        stageSnapshot: stage,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date()
      },
    });

    res.json(updatedCase);
  } catch (error) {
    console.error("Error updating stage:", error);
    res.status(500).json({ error: "Error updating stage" });
  }
};

export const deleteCase = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.caseComment.deleteMany({ where: { caseId: id } });
    await prisma.case.delete({ where: { id } });
    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    console.error("Error deleting case:", error);
    res.status(500).json({ error: "Error deleting case" });
  }
};

export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { vendor, prValue, poValue, currency, prNumber, poNumber, sanctionFileNumber, tenderingFileNumber, procurementMethod, category, value } = req.body;

    try {
        const updatedCase = await prisma.case.update({
            where: { id },
            data: {
                vendor,
                prValue: prValue ? parseFloat(prValue) : null,
                poValue: poValue ? parseFloat(poValue) : null,
                currency,
                prNumber,
                poNumber,
                sanctionFileNumber,
                tenderingFileNumber,
                procurementMethod,
                category,
                value: value ? parseFloat(value) : null
            }
        });
        res.json(updatedCase);
    } catch (error) {
        console.error("Error updating case:", error);
        res.status(500).json({ error: "Error updating case" });
    }
};

const CASE_TYPES = ["STORES", "SPARES", "SERVICES", "CAPITAL", "PETTY"];

function computeCaseValue(c: { type: string; currentStage: string; value: number | null; poValue: number | null; prValue: number | null }): number {
  if (c.type === "PETTY") return c.value || 0;
  const isPostPO = ["PO Released", "QCC", "GRV", "Payment", "Closed", "Receipt"].includes(c.currentStage);
  return isPostPO ? (c.poValue || 0) : (c.prValue || 0);
}

export const getDashboardAnalytics = async (req: Request, res: Response) => {
    try {
        const { departmentId } = req.query;
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        let startYear = currentYear;
        if (currentMonth < 3) startYear = currentYear - 1;

        const startDate = new Date(startYear, 3, 1);
        const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59);

        const where: any = { createdAt: { gte: startDate, lte: endDate } };
        if (departmentId) where.departmentId = departmentId as string;

        const cases = await prisma.case.findMany({
            where,
            include: { department: true }
        });

        // --- Summary counters ---
        let activeCount = 0;
        let closedCount = 0;
        const valueBreakdown: Record<string, number> = { STORES: 0, SPARES: 0, CAPITAL: 0, SERVICES: 0, PETTY: 0 };

        // --- Department breakdown: { [deptId]: { name, countByType, valueByType } } ---
        const deptMap: Record<string, {
            name: string;
            countByType: Record<string, number>;
            valueByType: Record<string, number>;
        }> = {};

        // --- Asset (tag) breakdown: { [tag]: { countByType, valueByType } } ---
        const assetMap: Record<string, {
            countByType: Record<string, number>;
            valueByType: Record<string, number>;
        }> = {};

        cases.forEach(c => {
            const caseValue = computeCaseValue(c);

            // Summary
            if (c.currentStage === "Closed") closedCount++;
            else activeCount++;

            if (valueBreakdown[c.type] !== undefined) valueBreakdown[c.type] += caseValue;

            // Department breakdown
            if (c.departmentId && c.department) {
                if (!deptMap[c.departmentId]) {
                    deptMap[c.departmentId] = {
                        name: c.department.name,
                        countByType: {},
                        valueByType: {}
                    };
                }
                const d = deptMap[c.departmentId];
                d.countByType[c.type] = (d.countByType[c.type] || 0) + 1;
                d.valueByType[c.type] = (d.valueByType[c.type] || 0) + caseValue;
            }

            // Asset (tag) breakdown
            if (c.tag) {
                if (!assetMap[c.tag]) {
                    assetMap[c.tag] = { countByType: {}, valueByType: {} };
                }
                const a = assetMap[c.tag];
                a.countByType[c.type] = (a.countByType[c.type] || 0) + 1;
                a.valueByType[c.type] = (a.valueByType[c.type] || 0) + caseValue;
            }
        });

        const departmentBreakdown = Object.entries(deptMap).map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const assetBreakdown = Object.entries(assetMap).map(([tag, data]) => ({ tag, ...data }))
            .sort((a, b) => {
                const totalA = Object.values(a.valueByType).reduce((s, v) => s + v, 0);
                const totalB = Object.values(b.valueByType).reduce((s, v) => s + v, 0);
                return totalB - totalA;
            });

        res.json({
            fy: `${startYear}-${startYear + 1}`,
            activeCount,
            closedCount,
            valueBreakdown,
            departmentBreakdown,
            assetBreakdown
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ error: "Error fetching analytics" });
    }
};
