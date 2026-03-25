import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

const getFYBounds = (fy?: string): { startDate: Date; endDate: Date; fyLabel: string } => {
  const today = new Date();
  let startYear = today.getFullYear();
  if (today.getMonth() < 3) startYear = today.getFullYear() - 1; // before April

  if (fy && /^\d{4}-\d{4}$/.test(fy)) {
    startYear = parseInt(fy.split('-')[0]);
  }

  return {
    startDate: new Date(startYear, 3, 1),       // April 1
    endDate: new Date(startYear + 1, 2, 31, 23, 59, 59), // March 31
    fyLabel: `${startYear}-${startYear + 1}`
  };
};

const getDateBounds = (from?: string, to?: string) => {
  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
};

// ============================================================================
// KPI SUMMARY
// ============================================================================

export const getKPISummary = async (req: Request, res: Response) => {
  try {
    const { from, to, installationId } = req.query;
    const { startDate, endDate } = getDateBounds(from as string, to as string);

    const woWhere: any = { createdAt: { gte: startDate, lte: endDate } };
    if (installationId) {
      // Filter by installation via functional location → system → area → site
    }

    const [
      allWOs,
      closedWOs,
      overdueWOs,
      allMaintenanceLogs,
      allCalibrationEvents,
      equipmentLogs,
      workOrderTeams,
      laborRates,
      maintenanceCases,
    ] = await Promise.all([
      prisma.workOrder.findMany({
        where: woWhere,
        select: {
          id: true, woNumber: true, woType: true, status: true,
          priority: true, flId: true, failureMode: true,
          scheduledDate: true, startDate: true, completionDate: true,
          downtime: true, createdAt: true, labourHours: true,
        }
      }),
      prisma.workOrder.findMany({
        where: { ...woWhere, status: 'CLOSED' },
        select: {
          id: true, woType: true, scheduledDate: true, completionDate: true,
          downtime: true, failureMode: true, flId: true, labourHours: true,
        }
      }),
      prisma.workOrder.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          scheduledDate: { lt: new Date() }
        },
        select: { id: true, woNumber: true, flId: true, scheduledDate: true, priority: true }
      }),
      prisma.maintenanceLog.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          jobType: 'BD',
          bdReportTime: { not: null },
          teamReportTime: { not: null }
        },
        select: {
          id: true, equipmentTag: true, bdReportTime: true,
          teamReportTime: true, jobCompletionTime: true, durationHours: true
        }
      }),
      prisma.calibrationEvent.findMany({
        where: { calibrationDate: { gte: startDate, lte: endDate } },
        select: { id: true, calibrationDate: true, nextDueDate: true, status: true, overallResultAsFound: true }
      }),
      prisma.equipmentLog.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        select: { equipmentTag: true, totalRunHours: true, date: true }
      }),
      prisma.workOrderTeam.findMany({
        where: { workOrder: { createdAt: { gte: startDate, lte: endDate } } },
        select: { hoursWorked: true, department: true, designation: true }
      }),
      prisma.laborRate.findMany({ where: { isActive: true } }),
      prisma.case.findMany({
        where: {
          maintenanceRelated: true,
          currentStage: { in: ['PO Released', 'GRV', 'Payment', 'Closed', 'Receipt'] },
          createdAt: { gte: startDate, lte: endDate }
        },
        select: { id: true, category: true, poValue: true, prValue: true, equipmentTag: true }
      }),
    ]);

    // --- KPI 1: PM Compliance % ---
    const pmWOs = closedWOs.filter(w => w.woType === 'PREVENTIVE');
    const pmOnTime = pmWOs.filter(w =>
      w.scheduledDate && w.completionDate && w.completionDate <= w.scheduledDate
    ).length;
    const pmCompliance = pmWOs.length > 0 ? Math.round((pmOnTime / pmWOs.length) * 100) : null;

    // --- KPI 2: Breakdown Frequency by month ---
    const breakdownsByMonth: Record<string, number> = {};
    allWOs.filter(w => w.woType === 'CORRECTIVE').forEach(w => {
      const key = w.createdAt.toISOString().slice(0, 7); // YYYY-MM
      breakdownsByMonth[key] = (breakdownsByMonth[key] || 0) + 1;
    });

    // --- KPI 3: MTBF (hours between failures) ---
    const correctiveWOs = closedWOs.filter(w => w.woType === 'CORRECTIVE');
    const totalRunHours = equipmentLogs.reduce((sum, l) => sum + (l.totalRunHours || 0), 0);
    const mtbf = correctiveWOs.length > 0 ? Math.round(totalRunHours / correctiveWOs.length) : null;

    // --- KPI 4: MTTR (mean time to repair, hours) ---
    const totalDowntime = correctiveWOs.reduce((sum, w) => sum + (w.downtime || 0), 0);
    const mttr = correctiveWOs.length > 0
      ? Math.round((totalDowntime / correctiveWOs.length) * 10) / 10
      : null;

    // --- KPI 5: Equipment Availability % ---
    const totalPossibleHours = (() => {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const uniqueEquipment = new Set(equipmentLogs.map(l => l.equipmentTag)).size;
      return days * 24 * (uniqueEquipment || 1);
    })();
    const availability = totalPossibleHours > 0
      ? Math.round(((totalPossibleHours - totalDowntime) / totalPossibleHours) * 1000) / 10
      : null;

    // --- KPI 6: Overdue WOs ---
    const overdueCount = overdueWOs.length;
    const overdueByPriority = { EMERGENCY: 0, HIGH: 0, NORMAL: 0, LOW: 0 } as Record<string, number>;
    overdueWOs.forEach(w => { overdueByPriority[w.priority] = (overdueByPriority[w.priority] || 0) + 1; });

    // --- KPI 7: Breakdown Response Time (minutes) ---
    let totalResponseMins = 0, responseCount = 0;
    allMaintenanceLogs.forEach(log => {
      if (log.bdReportTime && log.teamReportTime) {
        const diffMs = new Date(log.teamReportTime).getTime() - new Date(log.bdReportTime).getTime();
        if (diffMs > 0) { totalResponseMins += diffMs / 60000; responseCount++; }
      }
    });
    const avgResponseMins = responseCount > 0
      ? Math.round(totalResponseMins / responseCount)
      : null;

    // --- KPI 8: Calibration Compliance % ---
    const calCompliant = allCalibrationEvents.filter(e => e.overallResultAsFound === 'PASS').length;
    const calCompliance = allCalibrationEvents.length > 0
      ? Math.round((calCompliant / allCalibrationEvents.length) * 100)
      : null;

    // --- KPI 9: Repeat Failure Rate ---
    const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentFailures = closedWOs.filter(w =>
      w.failureMode && w.completionDate && w.completionDate >= thirtyDaysAgo
    );
    const seen = new Map<string, number>();
    let repeatCount = 0;
    recentFailures.forEach(w => {
      const key = `${w.flId}:${w.failureMode}`;
      seen.set(key, (seen.get(key) || 0) + 1);
      if ((seen.get(key) || 0) > 1) repeatCount++;
    });
    const repeatFailureRate = recentFailures.length > 0
      ? Math.round((repeatCount / recentFailures.length) * 100)
      : 0;

    // --- KPI 10: Indirect Maintenance Cost ---
    // Labor cost
    const avgDailyRate = laborRates.length > 0
      ? laborRates.reduce((s, r) => s + r.dailyRate, 0) / laborRates.length
      : 1500; // default INR 1500/day
    const totalLaborHours = workOrderTeams.reduce((s, t) => s + (t.hoursWorked || 0), 0);
    const laborCost = Math.round((totalLaborHours / 8) * avgDailyRate);

    // Material/service cost from cases
    const sparesCost = maintenanceCases
      .filter(c => c.category === 'SPARES')
      .reduce((s, c) => s + (c.poValue || c.prValue || 0), 0);
    const servicesCost = maintenanceCases
      .filter(c => c.category === 'SERVICES')
      .reduce((s, c) => s + (c.poValue || c.prValue || 0), 0);
    const totalMaintenanceCost = laborCost + sparesCost + servicesCost;

    res.json({
      period: { from: startDate.toISOString(), to: endDate.toISOString() },
      kpis: {
        pmCompliance: { value: pmCompliance, unit: '%', label: 'PM Compliance', total: pmWOs.length, onTime: pmOnTime },
        mtbf: { value: mtbf, unit: 'hrs', label: 'Mean Time Between Failures' },
        mttr: { value: mttr, unit: 'hrs', label: 'Mean Time to Repair', failures: correctiveWOs.length },
        availability: { value: availability, unit: '%', label: 'Equipment Availability', totalDowntime: Math.round(totalDowntime) },
        overdueWOs: { value: overdueCount, label: 'Overdue Work Orders', byPriority: overdueByPriority, list: overdueWOs.slice(0, 10) },
        breakdownFrequency: { label: 'Breakdown Frequency', byMonth: breakdownsByMonth, total: correctiveWOs.length },
        avgResponseTime: { value: avgResponseMins, unit: 'min', label: 'Avg Breakdown Response Time', sampleSize: responseCount },
        calibrationCompliance: { value: calCompliance, unit: '%', label: 'Calibration Compliance', total: allCalibrationEvents.length },
        repeatFailureRate: { value: repeatFailureRate, unit: '%', label: 'Repeat Failure Rate (30d)', repeatCount },
        maintenanceCost: {
          label: 'Indirect Maintenance Cost',
          total: totalMaintenanceCost,
          breakdown: { labor: laborCost, spares: sparesCost, services: servicesCost },
          currency: 'INR',
          laborHours: Math.round(totalLaborHours)
        },
      },
      totals: {
        allWOs: allWOs.length,
        closedWOs: closedWOs.length,
        pmWOs: pmWOs.length,
        correctiveWOs: correctiveWOs.length,
      }
    });
  } catch (error) {
    console.error('KPI Summary Error:', error);
    res.status(500).json({ error: 'Failed to compute KPIs' });
  }
};

// ============================================================================
// EQUIPMENT HEALTH SCORE
// ============================================================================

export const getHealthScore = async (req: Request, res: Response) => {
  try {
    const { tag } = req.params;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find FL(s) linked to this equipment tag via FLAssetAssignment
    const assignments = await prisma.fLAssetAssignment.findMany({
      where: { assetTag: tag, isActive: true },
      select: { flId: true }
    });
    const flIds = assignments.map(a => a.flId);

    const [latestCalibration, recentBreakdowns, openWO, pmCompliance, equipment] = await Promise.all([
      // Latest calibration (for instruments)
      prisma.calibrationLog.findFirst({
        where: { instrumentTagId: tag },
        orderBy: { currentCalDate: 'desc' }
      }),
      // Recent breakdowns
      prisma.workOrder.count({
        where: {
          flId: { in: flIds },
          woType: 'CORRECTIVE',
          status: 'CLOSED',
          completionDate: { gte: ninetyDaysAgo }
        }
      }),
      // Any critical open WO
      prisma.workOrder.findFirst({
        where: {
          flId: { in: flIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          priority: { in: ['HIGH', 'EMERGENCY'] }
        }
      }),
      // PM compliance for this equipment
      prisma.workOrder.findMany({
        where: {
          flId: { in: flIds },
          woType: 'PREVENTIVE',
          status: 'CLOSED',
          completionDate: { gte: ninetyDaysAgo }
        },
        select: { scheduledDate: true, completionDate: true }
      }),
      // Equipment master for PM frequency
      prisma.runningEquipmentMaster.findUnique({
        where: { equipmentTag: tag },
        select: { equipmentTag: true, description: true, criticality: true, pmFrequencyDays: true }
      }),
    ]);

    // Score calculation (each component 0-100)
    let calScore = 50; // neutral if no calibration data
    if (latestCalibration) {
      const daysSinceCal = Math.floor((Date.now() - latestCalibration.currentCalDate.getTime()) / 86400000);
      calScore = latestCalibration.result === 'PASS'
        ? Math.max(0, 100 - (daysSinceCal > 365 ? 100 : daysSinceCal / 3.65))
        : 10;
    }

    const breakdownScore = Math.max(0, 100 - recentBreakdowns * 25); // -25 per breakdown in 90 days

    const woScore = openWO?.priority === 'EMERGENCY' ? 0
      : openWO?.priority === 'HIGH' ? 30
      : openWO ? 60
      : 100;

    const pmOnTime = pmCompliance.filter(w =>
      w.scheduledDate && w.completionDate && w.completionDate <= w.scheduledDate
    ).length;
    const pmScore = pmCompliance.length > 0
      ? Math.round((pmOnTime / pmCompliance.length) * 100)
      : 75; // neutral if no PM history

    const overallScore = Math.round(
      calScore * 0.25 + breakdownScore * 0.25 + woScore * 0.25 + pmScore * 0.25
    );

    const grade = overallScore >= 80 ? 'A'
      : overallScore >= 60 ? 'B'
      : overallScore >= 40 ? 'C' : 'D';

    const gradeColor = grade === 'A' ? 'green' : grade === 'B' ? 'blue' : grade === 'C' ? 'orange' : 'red';

    res.json({
      tag,
      description: equipment?.description,
      criticality: equipment?.criticality,
      score: overallScore,
      grade,
      gradeColor,
      breakdown: {
        calibration: { score: Math.round(calScore), label: 'Calibration Status' },
        breakdownHistory: { score: breakdownScore, label: 'Breakdown History (90d)', count: recentBreakdowns },
        openWorkOrders: { score: woScore, label: 'Open WO Status', hasHighPriority: !!openWO },
        pmPerformance: { score: pmScore, label: 'PM Compliance (90d)', total: pmCompliance.length, onTime: pmOnTime },
      }
    });
  } catch (error) {
    console.error('Health Score Error:', error);
    res.status(500).json({ error: 'Failed to compute health score' });
  }
};

// ============================================================================
// EQUIPMENT HEALTH TABLE (batch scores for all equipment)
// ============================================================================

export const getHealthTable = async (req: Request, res: Response) => {
  try {
    const { installationId } = req.query;
    const where: any = {};
    if (installationId) where.installationId = String(installationId);

    const allEquipment = await prisma.runningEquipmentMaster.findMany({
      where,
      select: { equipmentTag: true, description: true, criticality: true, category: true, installationId: true },
      take: 200
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Batch fetch data for all equipment
    const tags = allEquipment.map(e => e.equipmentTag);

    const [assignments, breakdowns, openWOs, pmWOs] = await Promise.all([
      prisma.fLAssetAssignment.findMany({
        where: { assetTag: { in: tags }, isActive: true },
        select: { assetTag: true, flId: true }
      }),
      prisma.workOrder.groupBy({
        by: ['flId'],
        where: { woType: 'CORRECTIVE', status: 'CLOSED', completionDate: { gte: ninetyDaysAgo } },
        _count: { id: true }
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: { in: ['HIGH', 'EMERGENCY'] } },
        select: { flId: true, priority: true }
      }),
      prisma.workOrder.findMany({
        where: { woType: 'PREVENTIVE', status: 'CLOSED', completionDate: { gte: ninetyDaysAgo } },
        select: { flId: true, scheduledDate: true, completionDate: true }
      }),
    ]);

    const flByTag = new Map<string, string[]>();
    assignments.forEach(a => {
      const existing = flByTag.get(a.assetTag) || [];
      existing.push(a.flId);
      flByTag.set(a.assetTag, existing);
    });

    const breakdownByFl = new Map<string, number>();
    breakdowns.forEach(b => breakdownByFl.set(b.flId, b._count.id));

    const openWOByFl = new Map<string, string>();
    openWOs.forEach(w => { if (!openWOByFl.has(w.flId)) openWOByFl.set(w.flId, w.priority); });

    const results = allEquipment.map(eq => {
      const flIds = flByTag.get(eq.equipmentTag) || [];
      const bdCount = flIds.reduce((s, fId) => s + (breakdownByFl.get(fId) || 0), 0);
      const priority = flIds.map(fId => openWOByFl.get(fId)).find(p => p);
      const pmForEq = pmWOs.filter(w => flIds.includes(w.flId));
      const pmOnTime = pmForEq.filter(w => w.scheduledDate && w.completionDate && w.completionDate <= w.scheduledDate).length;

      const bdScore = Math.max(0, 100 - bdCount * 25);
      const woScore = priority === 'EMERGENCY' ? 0 : priority === 'HIGH' ? 30 : priority ? 60 : 100;
      const pmScore = pmForEq.length > 0 ? Math.round((pmOnTime / pmForEq.length) * 100) : 75;
      const overallScore = Math.round(bdScore * 0.35 + woScore * 0.3 + pmScore * 0.35);
      const grade = overallScore >= 80 ? 'A' : overallScore >= 60 ? 'B' : overallScore >= 40 ? 'C' : 'D';

      return { ...eq, score: overallScore, grade, breakdowns: bdCount, openPriority: priority || null };
    });

    results.sort((a, b) => a.score - b.score); // worst first

    res.json({ equipment: results, total: results.length });
  } catch (error) {
    console.error('Health Table Error:', error);
    res.status(500).json({ error: 'Failed to compute health table' });
  }
};

// ============================================================================
// EQUIPMENT TIMELINE
// ============================================================================

export const getEquipmentTimeline = async (req: Request, res: Response) => {
  try {
    const { tag } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    // Find FLs linked to this equipment
    const assignments = await prisma.fLAssetAssignment.findMany({
      where: { assetTag: tag, isActive: true },
      select: { flId: true }
    });
    const flIds = assignments.map(a => a.flId);

    const [workOrders, calEvents, maintenanceLogs, assetInstallations] = await Promise.all([
      prisma.workOrder.findMany({
        where: { flId: { in: flIds } },
        select: { id: true, woNumber: true, woType: true, status: true, description: true, completionDate: true, createdAt: true, priority: true, failureMode: true },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.calibrationEvent.findMany({
        where: { instrumentTagId: tag },
        select: { id: true, certificateNo: true, calibrationDate: true, overallResultAsFound: true, overallResultAsLeft: true, performedBy: true },
        orderBy: { calibrationDate: 'desc' },
        take: limit
      }),
      prisma.maintenanceLog.findMany({
        where: { equipmentTag: tag },
        select: { id: true, date: true, jobType: true, description: true, status: true, durationHours: true, createdBy: true },
        orderBy: { date: 'desc' },
        take: limit
      }),
      prisma.assetInstallation.findMany({
        where: { asset: { assetCode: tag } },
        select: { id: true, installDate: true, removalDate: true, installedBy: true, removedBy: true, reason: true },
        orderBy: { installDate: 'desc' },
        take: 20
      }),
    ]);

    const events: any[] = [];

    workOrders.forEach(w => events.push({
      date: w.completionDate || w.createdAt,
      type: 'WORK_ORDER',
      icon: 'wrench',
      color: w.woType === 'PREVENTIVE' ? '#3b82f6' : '#ef4444',
      title: `${w.woType} WO: ${w.woNumber}`,
      description: w.description,
      status: w.status,
      id: w.id,
      meta: { priority: w.priority, failureMode: w.failureMode }
    }));

    calEvents.forEach(c => events.push({
      date: c.calibrationDate,
      type: 'CALIBRATION',
      icon: 'gauge',
      color: c.overallResultAsFound === 'PASS' ? '#22c55e' : '#f59e0b',
      title: `Calibration: ${c.certificateNo}`,
      description: `As Found: ${c.overallResultAsFound} | As Left: ${c.overallResultAsLeft}`,
      status: c.overallResultAsFound,
      id: c.id,
      meta: { performedBy: c.performedBy }
    }));

    maintenanceLogs.forEach(m => events.push({
      date: m.date,
      type: 'MAINTENANCE_LOG',
      icon: 'tool',
      color: '#8b5cf6',
      title: `${m.jobType} Maintenance`,
      description: m.description,
      status: m.status,
      id: m.id,
      meta: { duration: m.durationHours, by: m.createdBy }
    }));

    assetInstallations.forEach(i => events.push({
      date: i.installDate,
      type: 'INSTALLATION',
      icon: 'arrow-down',
      color: '#0ea5e9',
      title: i.removalDate ? 'Equipment Removed' : 'Equipment Installed',
      description: i.reason || (i.removalDate ? `Removed by ${i.removedBy}` : `Installed by ${i.installedBy}`),
      status: i.removalDate ? 'REMOVED' : 'INSTALLED',
      id: i.id,
      meta: { installedBy: i.installedBy, removedBy: i.removedBy }
    }));

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ tag, events: events.slice(0, limit), total: events.length });
  } catch (error) {
    console.error('Timeline Error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};

// ============================================================================
// BREAKDOWN RESPONSE TIME REPORT
// ============================================================================

export const getResponseTimeReport = async (req: Request, res: Response) => {
  try {
    const { from, to, installationId } = req.query;
    const { startDate, endDate } = getDateBounds(from as string, to as string);

    const where: any = {
      date: { gte: startDate, lte: endDate },
      jobType: 'BD',
      bdReportTime: { not: null },
      teamReportTime: { not: null }
    };
    if (installationId) where.installationId = String(installationId);

    const logs = await prisma.maintenanceLog.findMany({
      where,
      select: {
        id: true,
        equipmentTag: true,
        date: true,
        description: true,
        bdReportTime: true,
        teamReportTime: true,
        jobCompletionTime: true,
        durationHours: true,
        department: true,
        section: true,
      },
      orderBy: { date: 'desc' }
    });

    const enriched = logs.map(log => {
      const responseMs = log.bdReportTime && log.teamReportTime
        ? new Date(log.teamReportTime).getTime() - new Date(log.bdReportTime).getTime()
        : null;
      const repairMs = log.teamReportTime && log.jobCompletionTime
        ? new Date(log.jobCompletionTime).getTime() - new Date(log.teamReportTime).getTime()
        : null;
      const totalMs = log.bdReportTime && log.jobCompletionTime
        ? new Date(log.jobCompletionTime).getTime() - new Date(log.bdReportTime).getTime()
        : null;

      return {
        ...log,
        responseTimeMin: responseMs !== null ? Math.round(responseMs / 60000) : null,
        repairTimeMin: repairMs !== null ? Math.round(repairMs / 60000) : null,
        totalDowntimeMin: totalMs !== null ? Math.round(totalMs / 60000) : null,
      };
    });

    const validResponse = enriched.filter(e => e.responseTimeMin !== null);
    const avgResponse = validResponse.length > 0
      ? Math.round(validResponse.reduce((s, e) => s + (e.responseTimeMin || 0), 0) / validResponse.length)
      : null;
    const avgRepair = enriched.filter(e => e.repairTimeMin !== null).length > 0
      ? Math.round(enriched.filter(e => e.repairTimeMin !== null)
          .reduce((s, e) => s + (e.repairTimeMin || 0), 0) / enriched.filter(e => e.repairTimeMin !== null).length)
      : null;

    res.json({
      period: { from: startDate, to: endDate },
      summary: {
        totalBreakdowns: logs.length,
        avgResponseTimeMin: avgResponse,
        avgRepairTimeMin: avgRepair,
      },
      records: enriched
    });
  } catch (error) {
    console.error('Response Time Error:', error);
    res.status(500).json({ error: 'Failed to fetch response time report' });
  }
};

// ============================================================================
// MAINTENANCE COST REPORT
// ============================================================================

export const getMaintenanceCost = async (req: Request, res: Response) => {
  try {
    const { fy, equipmentTag } = req.query;
    const { startDate, endDate, fyLabel } = getFYBounds(fy as string);

    const caseWhere: any = {
      maintenanceRelated: true,
      createdAt: { gte: startDate, lte: endDate },
    };
    if (equipmentTag) caseWhere.equipmentTag = String(equipmentTag);

    const [cases, workOrderTeams, laborRates] = await Promise.all([
      prisma.case.findMany({
        where: caseWhere,
        select: {
          id: true, title: true, category: true, poValue: true, prValue: true,
          currentStage: true, equipmentTag: true, createdAt: true, vendor: true
        }
      }),
      prisma.workOrderTeam.findMany({
        where: { workOrder: { createdAt: { gte: startDate, lte: endDate } } },
        include: { workOrder: { select: { functionalLocation: { select: { currentAssetId: true } } } } }
      }),
      prisma.laborRate.findMany({ where: { isActive: true } }),
    ]);

    const avgDailyRate = laborRates.length > 0
      ? laborRates.reduce((s, r) => s + r.dailyRate, 0) / laborRates.length
      : 1500;

    const closedStages = new Set(['PO Released', 'GRV', 'Payment', 'Closed', 'Receipt']);

    const sparesCases = cases.filter(c => c.category === 'SPARES');
    const servicesCases = cases.filter(c => c.category === 'SERVICES');

    const sparesTotal = sparesCases.reduce((s, c) =>
      s + (closedStages.has(c.currentStage) ? (c.poValue || c.prValue || 0) : (c.prValue || 0)), 0);
    const servicesTotal = servicesCases.reduce((s, c) =>
      s + (closedStages.has(c.currentStage) ? (c.poValue || c.prValue || 0) : (c.prValue || 0)), 0);

    const totalLaborHours = workOrderTeams.reduce((s, t) => s + (t.hoursWorked || 0), 0);
    const laborTotal = Math.round((totalLaborHours / 8) * avgDailyRate);

    // By equipment
    const byEquipment: Record<string, { spares: number; services: number; labor: number }> = {};
    cases.forEach(c => {
      const tag = c.equipmentTag || 'UNTAGGED';
      if (!byEquipment[tag]) byEquipment[tag] = { spares: 0, services: 0, labor: 0 };
      const val = closedStages.has(c.currentStage) ? (c.poValue || c.prValue || 0) : (c.prValue || 0);
      if (c.category === 'SPARES') byEquipment[tag].spares += val;
      if (c.category === 'SERVICES') byEquipment[tag].services += val;
    });

    // By month
    const byMonth: Record<string, { spares: number; services: number }> = {};
    cases.forEach(c => {
      const key = c.createdAt.toISOString().slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { spares: 0, services: 0 };
      const val = closedStages.has(c.currentStage) ? (c.poValue || c.prValue || 0) : (c.prValue || 0);
      if (c.category === 'SPARES') byMonth[key].spares += val;
      if (c.category === 'SERVICES') byMonth[key].services += val;
    });

    const topEquipment = Object.entries(byEquipment)
      .map(([tag, costs]) => ({ tag, ...costs, total: costs.spares + costs.services + costs.labor }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      fy: fyLabel,
      period: { from: startDate, to: endDate },
      summary: {
        spares: Math.round(sparesTotal),
        services: Math.round(servicesTotal),
        labor: laborTotal,
        total: Math.round(sparesTotal + servicesTotal + laborTotal),
        currency: 'INR',
        laborHours: Math.round(totalLaborHours),
      },
      byMonth,
      topEquipment,
      cases: cases.length,
    });
  } catch (error) {
    console.error('Cost Report Error:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance cost' });
  }
};

// ============================================================================
// LABOR RATE CRUD
// ============================================================================

export const getLaborRates = async (req: Request, res: Response) => {
  try {
    const rates = await prisma.laborRate.findMany({ orderBy: [{ department: 'asc' }, { effectiveFrom: 'desc' }] });
    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labor rates' });
  }
};

export const createLaborRate = async (req: Request, res: Response) => {
  try {
    const rate = await prisma.laborRate.create({ data: req.body });
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create labor rate' });
  }
};

export const updateLaborRate = async (req: Request, res: Response) => {
  try {
    const rate = await prisma.laborRate.update({ where: { id: req.params.id }, data: req.body });
    res.json(rate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update labor rate' });
  }
};

export const deleteLaborRate = async (req: Request, res: Response) => {
  try {
    await prisma.laborRate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete labor rate' });
  }
};

// ============================================================================
// EXCEL EXPORT — KPI Report
// ============================================================================

export const exportKPIReport = async (req: Request, res: Response) => {
  try {
    const ExcelJS = require('exceljs');
    const { from, to } = req.query;
    const { startDate, endDate } = getDateBounds(from as string, to as string);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ONGC Maintenance Management System';

    // Sheet 1: Summary KPIs (simple placeholder — real data fetched via getKPISummary pattern)
    const sheet = workbook.addWorksheet('KPI Summary');
    sheet.columns = [
      { header: 'KPI', key: 'kpi', width: 35 },
      { header: 'Value', key: 'value', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Period', key: 'period', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.addRow({ kpi: 'Report Period From', value: startDate.toDateString(), unit: '', period: '' });
    sheet.addRow({ kpi: 'Report Period To', value: endDate.toDateString(), unit: '', period: '' });
    sheet.addRow({});
    sheet.addRow({ kpi: '-- Use the KPI API endpoint for full computed values --', value: '', unit: '', period: '' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=KPI_Report_${startDate.toISOString().slice(0,10)}.xlsx`);

    await workbook.xlsx.write(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export KPI report' });
  }
};
