import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  applyDisciplineScope,
  canRaiseRequirementsForDiscipline,
  canUpdateProcurementForDiscipline,
  resolvePrimaryDisciplineForEquipmentTag,
  resolvePrimaryDisciplineForText,
  resolveScopedDisciplines,
} from "../services/disciplineAccess";

const prisma = new PrismaClient();

export const getCases = async (req: Request, res: Response) => {
  try {
    const { type, departmentId, discipline } = req.query;
    
    const where: any = {};
    if (type) where.type = type;
    if (departmentId) where.departmentId = departmentId;
    applyDisciplineScope(where, "primaryDiscipline", resolveScopedDisciplines(req.user, discipline));
    
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
    const scopedDisciplines = resolveScopedDisciplines(req.user, req.query.discipline);
    const caseItem = await prisma.case.findFirst({
      where: {
        id,
        ...(scopedDisciplines.length === 1 ? { primaryDiscipline: scopedDisciplines[0] } : { primaryDiscipline: { in: scopedDisciplines } }),
      },
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
  if (!req.user || !req.user.username) {
      return res.status(401).json({ error: "User not authenticated" });
  }

  const createdBy = req.user.username;

  try {
    const inferredDiscipline = await resolvePrimaryDisciplineForEquipmentTag(
      prisma,
      equipmentTag,
      resolvePrimaryDisciplineForText(`${title} ${category} ${tag}`),
    );

    if (!canRaiseRequirementsForDiscipline(req.user, inferredDiscipline)) {
      return res.status(403).json({ error: "You do not have permission to raise requirements for this discipline." });
    }

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
        primaryDiscipline: inferredDiscipline,
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
  const userId = req.user?.id;

  try {
    const existingCase = await prisma.case.findUnique({
      where: { id },
      select: { id: true, primaryDiscipline: true },
    });
    if (!existingCase) return res.status(404).json({ error: "Case not found" });
    if (!canUpdateProcurementForDiscipline(req.user, existingCase.primaryDiscipline)) {
      return res.status(403).json({ error: "You do not have permission to update procurement stages for this discipline." });
    }

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
        const existingCase = await prisma.case.findUnique({
            where: { id },
            select: { primaryDiscipline: true },
        });
        if (!existingCase) {
            return res.status(404).json({ error: "Case not found" });
        }
        if (!canUpdateProcurementForDiscipline(req.user, existingCase.primaryDiscipline)) {
            return res.status(403).json({ error: "You do not have permission to update procurement data for this discipline." });
        }

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
        const { departmentId, discipline } = req.query;
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

        const where: any = {
            createdAt: {
                gte: startDate,
                lte: endDate
            }
        };

        if (departmentId) {
            where.departmentId = String(departmentId);
        }
        applyDisciplineScope(where, "primaryDiscipline", resolveScopedDisciplines(req.user, discipline));

        // Fetch all cases created in this FY
        const cases = await prisma.case.findMany({
            where,
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                    }
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

        const departmentBreakdown = new Map<string, {
            id: string;
            name: string;
            countByType: Record<string, number>;
            valueByType: Record<string, number>;
        }>();

        const assetBreakdown = new Map<string, {
            tag: string;
            countByType: Record<string, number>;
            valueByType: Record<string, number>;
        }>();

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

            const departmentKey = c.departmentId || "__UNASSIGNED__";
            const departmentName = c.department?.name || "Unassigned";
            if (!departmentBreakdown.has(departmentKey)) {
                departmentBreakdown.set(departmentKey, {
                    id: departmentKey,
                    name: departmentName,
                    countByType: {},
                    valueByType: {},
                });
            }

            const departmentEntry = departmentBreakdown.get(departmentKey)!;
            departmentEntry.countByType[c.type] = (departmentEntry.countByType[c.type] || 0) + 1;
            departmentEntry.valueByType[c.type] = (departmentEntry.valueByType[c.type] || 0) + caseValue;

            const assetTag = c.equipmentTag || c.tag;
            if (assetTag) {
                if (!assetBreakdown.has(assetTag)) {
                    assetBreakdown.set(assetTag, {
                        tag: assetTag,
                        countByType: {},
                        valueByType: {},
                    });
                }

                const assetEntry = assetBreakdown.get(assetTag)!;
                assetEntry.countByType[c.type] = (assetEntry.countByType[c.type] || 0) + 1;
                assetEntry.valueByType[c.type] = (assetEntry.valueByType[c.type] || 0) + caseValue;
            }
        });

        res.json({
            fy: `${startYear}-${startYear + 1}`,
            activeCount,
            closedCount,
            valueBreakdown,
            departmentBreakdown: Array.from(departmentBreakdown.values()).sort((a, b) => a.name.localeCompare(b.name)),
            assetBreakdown: Array.from(assetBreakdown.values()).sort((a, b) => a.tag.localeCompare(b.tag)),
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ error: "Error fetching analytics" });
    }
};
