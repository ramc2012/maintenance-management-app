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
  const { title, type, vendor, prValue, poValue, currency, prNumber, poNumber, sanctionFileNumber, tenderingFileNumber, procurementMethod, category, value, createdAt, departmentId, vendorCode, tag, processedBy, equipmentTag, maintenanceRelated } = req.body;

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
        equipmentTag: equipmentTag || null,
        maintenanceRelated: maintenanceRelated === true || maintenanceRelated === 'true',
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
    // First delete all comments associated with the case
    await prisma.caseComment.deleteMany({
      where: { caseId: id },
    });

    // Then delete the case itself
    await prisma.case.delete({
      where: { id },
    });

    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    console.error("Error deleting case:", error);
    res.status(500).json({ error: "Error deleting case" });
  }
};

export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { vendor, prValue, poValue, currency, prNumber, poNumber, sanctionFileNumber, tenderingFileNumber, procurementMethod, category, value, equipmentTag, maintenanceRelated } = req.body;

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
                value: value ? parseFloat(value) : null,
                equipmentTag: equipmentTag || null,
                maintenanceRelated: maintenanceRelated === true || maintenanceRelated === 'true',
            }
        });
        res.json(updatedCase);
    } catch (error) {
        console.error("Error updating case:", error);
        res.status(500).json({ error: "Error updating case" });
    }
};

export const getDashboardAnalytics = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11

        // Financial Year Calculation (Apr 1 - Mar 31)
        let startYear = currentYear;
        if (currentMonth < 3) { // Jan, Feb, Mar
            startYear = currentYear - 1;
        }
        
        const startDate = new Date(startYear, 3, 1); // April 1st
        const endDate = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st

        // Fetch all cases created in this FY
        const cases = await prisma.case.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // 1. Active vs Closed
        let activeCount = 0;
        let closedCount = 0;

        // 2. Value Breakdown
        const valueBreakdown: Record<string, number> = {
            "STORES": 0,
            "SPARES": 0,
            "CAPITAL": 0,
            "SERVICES": 0,
            "PETTY": 0
        };

        const PO_STAGES = ["PO Released", "QCC", "GRV", "Payment", "Closed", "Receipt"]; // Receipt is for Petty

        cases.forEach(c => {
            // Count Status
            if (c.currentStage === "Closed") {
                closedCount++;
            } else {
                activeCount++;
            }

            // Calculate Value
            let caseValue = 0;
            if (c.type === "PETTY") {
                caseValue = c.value || 0;
            } else {
                // For other types: Use PO Value if stage >= PO Released, else PR Value
                
                const isPostPO = ["PO Released", "QCC", "GRV", "Payment", "Closed"].includes(c.currentStage);
                
                if (isPostPO) {
                    caseValue = c.poValue || 0;
                } else {
                    caseValue = c.prValue || 0;
                }
            }

            // Add to breakdown
            if (valueBreakdown[c.type] !== undefined) {
                valueBreakdown[c.type] += caseValue;
            } else {
                valueBreakdown[c.type] = (valueBreakdown[c.type] || 0) + caseValue;
            }
        });

        res.json({
            fy: `${startYear}-${startYear + 1}`,
            activeCount,
            closedCount,
            valueBreakdown
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ error: "Error fetching analytics" });
    }
};
