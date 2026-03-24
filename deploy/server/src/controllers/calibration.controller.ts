import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// CALIBRATION EVENTS CRUD
// ============================================================================

export const getCalibrationEvents = async (req: Request, res: Response) => {
  try {
    const { instrumentTagId, status } = req.query;
    const where: any = {};
    if (instrumentTagId) where.instrumentTagId = String(instrumentTagId);
    if (status) where.status = String(status);
    
    const events = await prisma.calibrationEvent.findMany({
      where,
      include: {
        instrument: true,
        standardUsed: true,
        points: { orderBy: { sequence: 'asc' } }
      },
      orderBy: { calibrationDate: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calibration events' });
  }
};

export const getCalibrationEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await prisma.calibrationEvent.findUnique({
      where: { id },
      include: {
        instrument: true,
        standardUsed: true,
        points: { orderBy: [{ sequence: 'asc' }, { direction: 'asc' }] }
      }
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calibration event' });
  }
};

// Generate unique Certificate Number
const generateCertificateNo = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `CAL-${year}-`;
  const count = await prisma.calibrationEvent.count({
    where: { certificateNo: { startsWith: prefix } }
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

export const createCalibrationEvent = async (req: Request, res: Response) => {
  try {
    const certificateNo = await generateCertificateNo();
    
    const instrument = await prisma.instrumentMaster.findUnique({
      where: { tagId: req.body.instrumentTagId }
    });
    
    if (!instrument) {
      return res.status(404).json({ error: 'Instrument not found' });
    }
    
    const standard = await prisma.calibrationStandard.findUnique({
      where: { tagId: req.body.standardUsedId }
    });
    
    if (!standard) {
      return res.status(404).json({ error: 'Reference standard not found' });
    }
    
    // Check if standard is valid (use dueDate field from existing schema)
    const today = new Date();
    if (standard.dueDate && new Date(standard.dueDate) < today) {
      return res.status(400).json({ 
        error: 'Reference standard certificate has expired',
        expiredDate: standard.dueDate
      });
    }
    
    const calDate = new Date(req.body.calibrationDate || today);
    const nextDueDate = new Date(calDate);
    // Use calibrationFreqMonths from existing schema
    const intervalDays = (instrument.calibrationFreqMonths || 12) * 30;
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);
    
    const event = await prisma.calibrationEvent.create({
      data: {
        ...req.body,
        certificateNo,
        nextDueDate,
        overallResultAsFound: 'PENDING',
        overallResultAsLeft: 'PENDING'
      },
      include: { instrument: true, standardUsed: true }
    });
    
    res.json(event);
  } catch (error) {
    console.error('Create Calibration Event Error:', error);
    res.status(500).json({ error: 'Failed to create calibration event' });
  }
};

export const updateCalibrationEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await prisma.calibrationEvent.update({
      where: { id },
      data: req.body,
      include: { instrument: true, standardUsed: true, points: true }
    });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update calibration event' });
  }
};

// ============================================================================
// CALIBRATION POINTS (5-POINT CHECK)
// ============================================================================

export const addCalibrationPoint = async (req: Request, res: Response) => {
  try {
    const point = await prisma.calibrationPoint.create({ data: req.body });
    res.json(point);
  } catch (error) {
    console.error('Add Calibration Point Error:', error);
    res.status(500).json({ error: 'Failed to add calibration point' });
  }
};

export const addMultiplePoints = async (req: Request, res: Response) => {
  try {
    const { eventId, points } = req.body;
    
    const created = await prisma.calibrationPoint.createMany({
      data: points.map((p: any) => ({ ...p, eventId }))
    });
    
    res.json({ count: created.count });
  } catch (error) {
    console.error('Add Multiple Points Error:', error);
    res.status(500).json({ error: 'Failed to add calibration points' });
  }
};

// ============================================================================
// AUTO-CALCULATE PASS/FAIL
// ============================================================================

export const calculateResults = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const event = await prisma.calibrationEvent.findUnique({
      where: { id },
      include: { 
        instrument: true, 
        points: { orderBy: { sequence: 'asc' } }
      }
    });
    
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const instrument = event.instrument;
    // Use existing schema fields: rangeMin, rangeMax
    const rangeMin = instrument.rangeMin ?? 0;
    const rangeMax = instrument.rangeMax ?? 100;
    const span = rangeMax - rangeMin;
    // Default tolerance 0.5% since accuracyTolerancePct doesn't exist yet
    const tolerance = 0.5;
    
    let maxErrorFound = 0;
    let maxErrorLeft = 0;
    let anyFoundFail = false;
    let anyLeftFail = false;
    let adjustmentMade = false;
    
    for (const point of event.points) {
      const asFoundError = span > 0 
        ? Math.abs((point.asFoundReading - point.expectedReading) / span * 100)
        : 0;
      const asFoundResult = asFoundError <= tolerance ? 'PASS' : 'FAIL';
      
      if (asFoundError > maxErrorFound) maxErrorFound = asFoundError;
      if (asFoundResult === 'FAIL') anyFoundFail = true;
      
      let asLeftError: number | null = null;
      let asLeftResult: string | null = null;
      
      if (point.asLeftReading !== null) {
        adjustmentMade = true;
        asLeftError = span > 0 
          ? Math.abs((point.asLeftReading - point.expectedReading) / span * 100)
          : 0;
        asLeftResult = asLeftError <= tolerance ? 'PASS' : 'FAIL';
        
        if (asLeftError > maxErrorLeft) maxErrorLeft = asLeftError;
        if (asLeftResult === 'FAIL') anyLeftFail = true;
      }
      
      await prisma.calibrationPoint.update({
        where: { id: point.id },
        data: {
          asFoundError,
          asFoundResult,
          asLeftError,
          asLeftResult
        }
      });
    }
    
    const overallResultAsFound = anyFoundFail ? 'FAIL' : 'PASS';
    const overallResultAsLeft = adjustmentMade 
      ? (anyLeftFail ? 'FAIL' : 'PASS')
      : (anyFoundFail ? 'OUT_OF_TOLERANCE' : 'PASS');
    
    const updatedEvent = await prisma.calibrationEvent.update({
      where: { id },
      data: {
        overallResultAsFound,
        overallResultAsLeft,
        maxErrorFoundPct: maxErrorFound,
        maxErrorLeftPct: adjustmentMade ? maxErrorLeft : null,
        adjustmentMade
      },
      include: { instrument: true, points: true }
    });
    
    res.json({
      message: 'Calculation complete',
      overallResultAsFound,
      overallResultAsLeft,
      maxErrorFoundPct: maxErrorFound,
      maxErrorLeftPct: maxErrorLeft,
      tolerance,
      event: updatedEvent
    });
  } catch (error) {
    console.error('Calculate Results Error:', error);
    res.status(500).json({ error: 'Failed to calculate results' });
  }
};

// ============================================================================
// APPROVE / SIGN-OFF
// ============================================================================

export const approveEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    const event = await prisma.calibrationEvent.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvalDate: new Date()
      }
    });
    
    res.json({ message: 'Event approved', event });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve event' });
  }
};

// ============================================================================
// DUE / OVERDUE INSTRUMENTS
// ============================================================================

export const getDueInstruments = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all instruments with their latest calibration history
    const instruments = await prisma.instrumentMaster.findMany({
      include: {
        installation: true,
        UnifiedCalibrationHistory: {
          orderBy: { calDate: 'desc' },
          take: 1
        }
      }
    });

    const dueInstruments = instruments.filter(inst => {
      if (inst.UnifiedCalibrationHistory.length === 0) return false;
      const lastCal = inst.UnifiedCalibrationHistory[0];
      const nextDue = new Date(lastCal.calDate);
      nextDue.setMonth(nextDue.getMonth() + (inst.calibrationFreqMonths || 12));
      return nextDue >= now && nextDue <= thirtyDaysFromNow;
    }).map(inst => {
      const lastCal = inst.UnifiedCalibrationHistory[0];
      const nextDue = new Date(lastCal.calDate);
      nextDue.setMonth(nextDue.getMonth() + (inst.calibrationFreqMonths || 12));
      return {
        tagId: inst.tagId,
        type: inst.type,
        description: inst.description,
        lastCalDate: lastCal.calDate,
        nextDueDate: nextDue,
        installation: inst.installation?.location
      };
    });

    res.json(dueInstruments);
  } catch (error) {
    console.error('Due instruments error:', error);
    res.status(500).json({ error: 'Failed to fetch due instruments' });
  }
};

export const getOverdueInstruments = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const instruments = await prisma.instrumentMaster.findMany({
      include: {
        installation: true,
        UnifiedCalibrationHistory: {
          orderBy: { calDate: 'desc' },
          take: 1
        }
      }
    });

    const overdueInstruments = instruments.filter(inst => {
      if (inst.UnifiedCalibrationHistory.length === 0) return true; // Never calibrated = overdue
      const lastCal = inst.UnifiedCalibrationHistory[0];
      const nextDue = new Date(lastCal.calDate);
      nextDue.setMonth(nextDue.getMonth() + (inst.calibrationFreqMonths || 12));
      return nextDue < now;
    }).map(inst => {
      const lastCal = inst.UnifiedCalibrationHistory.length > 0 ? inst.UnifiedCalibrationHistory[0] : null;
      const nextDue = lastCal ? new Date(lastCal.calDate) : null;
      if (nextDue) nextDue.setMonth(nextDue.getMonth() + (inst.calibrationFreqMonths || 12));
      return {
        tagId: inst.tagId,
        type: inst.type,
        description: inst.description,
        lastCalDate: lastCal?.calDate || null,
        nextDueDate: nextDue,
        installation: inst.installation?.location
      };
    });

    res.json(overdueInstruments);
  } catch (error) {
    console.error('Overdue instruments error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue instruments' });
  }
};

// ============================================================================
// CALIBRATION CERTIFICATE (Printable)
// ============================================================================

export const getCertificate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const event = await prisma.calibrationEvent.findUnique({
      where: { id },
      include: {
        instrument: { include: { installation: true } },
        standardUsed: true,
        points: { orderBy: [{ sequence: 'asc' }, { direction: 'asc' }] }
      }
    });
    
    if (!event) return res.status(404).json({ error: 'Certificate not found' });
    
    const certificate = {
      certificateNo: event.certificateNo,
      
      instrument: {
        tagId: event.instrument.tagId,
        description: event.instrument.description,
        manufacturer: event.instrument.make,
        modelNo: event.instrument.model,
        serialNo: event.instrument.serialNo,
        location: event.instrument.installation?.location,
        calibratedRange: `${event.instrument.rangeMin ?? '-'} to ${event.instrument.rangeMax ?? '-'} ${event.instrument.unit ?? ''}`,
        tolerance: `±0.5%`
      },
      
      referenceStandard: {
        tagId: event.standardUsed.tagId,
        description: event.standardUsed.description,
        certificateRef: event.standardUsed.reportUrl,
        validTo: event.standardUsed.dueDate
      },
      
      calibration: {
        date: event.calibrationDate,
        previousDate: event.previousCalDate,
        nextDueDate: event.nextDueDate,
        ambientTemp: event.ambientTemp,
        humidity: event.humidity,
        performedBy: event.performedBy,
        approvedBy: event.approvedBy,
        approvalDate: event.approvalDate
      },
      
      results: {
        overallAsFound: event.overallResultAsFound,
        overallAsLeft: event.overallResultAsLeft,
        maxErrorFound: event.maxErrorFoundPct,
        maxErrorLeft: event.maxErrorLeftPct,
        adjustmentMade: event.adjustmentMade
      },
      
      points: event.points.map(p => ({
        step: p.sequence,
        percent: p.stepPercent,
        direction: p.direction,
        inputApplied: p.inputApplied,
        inputUnit: p.inputUnit,
        expected: p.expectedReading,
        asFound: p.asFoundReading,
        asFoundError: p.asFoundError,
        asFoundResult: p.asFoundResult,
        asLeft: p.asLeftReading,
        asLeftError: p.asLeftError,
        asLeftResult: p.asLeftResult
      })),
      
      remarks: event.remarks
    };
    
    res.json(certificate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
};

// ============================================================================
// HELPER: Generate 5-Point Expected Values
// ============================================================================

export const generate5PointTemplate = async (req: Request, res: Response) => {
  try {
    const { instrumentTagId } = req.query;
    
    const instrument = await prisma.instrumentMaster.findUnique({
      where: { tagId: String(instrumentTagId) }
    });
    
    if (!instrument) return res.status(404).json({ error: 'Instrument not found' });
    
    // Use existing schema fields
    const rangeMin = instrument.rangeMin ?? 0;
    const rangeMax = instrument.rangeMax ?? 100;
    const span = rangeMax - rangeMin;
    
    // Default output range for transmitters (4-20 mA)
    const outputMin = 4;
    const outputMax = 20;
    const outputSpan = outputMax - outputMin;
    
    const steps = [0, 25, 50, 75, 100];
    const points = steps.map((percent, idx) => ({
      sequence: idx + 1,
      stepPercent: percent,
      direction: 'UP',
      inputApplied: rangeMin + (span * percent / 100),
      inputUnit: instrument.unit || '',
      expectedReading: outputMin + (outputSpan * percent / 100),
      expectedUnit: 'mA'
    }));
    
    res.json({
      instrument: {
        tagId: instrument.tagId,
        description: instrument.description,
        calibratedRange: `${rangeMin} - ${rangeMax} ${instrument.unit || ''}`,
        outputRange: `${outputMin} - ${outputMax} mA`,
        tolerance: 0.5
      },
      points
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template' });
  }
};

// ============================================================================
// TIERED CALIBRATION SYSTEM (Hybrid Integration)
// ============================================================================

// Get instruments by calibration system type
export const getInstrumentsByTier = async (req: Request, res: Response) => {
  try {
    const { tier } = req.query; // 'INTERNAL' or 'AUTOMATED'
    const where: any = {};
    if (tier) where.calSystemType = String(tier);
    
    const instruments = await prisma.instrumentMaster.findMany({
      where,
      include: { installation: true, custodyMeter: true },
      orderBy: { tagId: 'asc' }
    });
    
    res.json(instruments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instruments by tier' });
  }
};

// Update instrument calibration tier
export const updateInstrumentTier = async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const { calSystemType } = req.body;
    
    const updated = await prisma.instrumentMaster.update({
      where: { tagId },
      data: { calSystemType }
    });
    
    res.json({ message: `Instrument ${tagId} moved to ${calSystemType} tier`, instrument: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tier' });
  }
};

// Auto-classify custody meters as AUTOMATED tier
export const classifyCustodyAsAutomated = async (req: Request, res: Response) => {
  try {
    // Find all instruments linked to custody meters
    const result = await prisma.instrumentMaster.updateMany({
      where: {
        custodyMeterId: { not: null }
      },
      data: {
        calSystemType: 'AUTOMATED'
      }
    });
    
    res.json({ 
      message: 'Custody transfer instruments classified as AUTOMATED tier',
      count: result.count 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to classify custody meters' });
  }
};

// Create unified history entry (for both INTERNAL and AUTOMATED results)
export const createUnifiedHistoryEntry = async (req: Request, res: Response) => {
  try {
    const entry = await prisma.unifiedCalibrationHistory.create({
      data: req.body,
      include: { instrument: true }
    });
    res.json(entry);
  } catch (error) {
    console.error('Unified History Error:', error);
    res.status(500).json({ error: 'Failed to create unified history entry' });
  }
};

// Import external calibration result (from automated system)
export const importExternalCalibration = async (req: Request, res: Response) => {
  try {
    const { instrumentTagId, calDate, resultStatus, externalCertRef, externalPdfLink, performedBy, maxError } = req.body;
    
    // Create unified history entry
    const entry = await prisma.unifiedCalibrationHistory.create({
      data: {
        instrumentTagId,
        calDate: new Date(calDate),
        resultStatus,
        sourceSystem: 'AUTOMATED',
        externalCertRef,
        externalPdfLink,
        performedBy,
        maxError
      }
    });
    
    // Update instrument's last calibration date
    const instrument = await prisma.instrumentMaster.findUnique({ where: { tagId: instrumentTagId } });
    if (instrument) {
      const nextDue = new Date(calDate);
      nextDue.setMonth(nextDue.getMonth() + (instrument.calibrationFreqMonths || 12));
      // Note: Would update nextDueDate if field exists
    }
    
    res.json({ message: 'External calibration imported', entry });
  } catch (error) {
    console.error('Import External Error:', error);
    res.status(500).json({ error: 'Failed to import external calibration' });
  }
};

// Unified Dashboard: Get compliance stats across both tiers
export const getUnifiedComplianceStats = async (req: Request, res: Response) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Get stats from unified history
    const history = await prisma.unifiedCalibrationHistory.findMany({
      where: {
        calDate: { gte: oneYearAgo }
      },
      include: { instrument: { include: { installation: true } } }
    });
    
    // Group by installation
    const byInstallation: { [key: string]: { pass: number; fail: number; automated: number; internal: number } } = {};
    
    for (const h of history) {
      const loc = h.instrument.installation?.location || 'Unknown';
      if (!byInstallation[loc]) {
        byInstallation[loc] = { pass: 0, fail: 0, automated: 0, internal: 0 };
      }
      if (h.resultStatus === 'PASS') byInstallation[loc].pass++;
      else byInstallation[loc].fail++;
      if (h.sourceSystem === 'AUTOMATED') byInstallation[loc].automated++;
      else byInstallation[loc].internal++;
    }
    
    // Overall stats
    const totalPass = history.filter(h => h.resultStatus === 'PASS').length;
    const totalFail = history.filter(h => h.resultStatus === 'FAIL').length;
    const totalAutomated = history.filter(h => h.sourceSystem === 'AUTOMATED').length;
    const totalInternal = history.filter(h => h.sourceSystem === 'INTERNAL').length;
    
    // Get total instruments count
    const totalInstruments = await prisma.instrumentMaster.count();

    // Get calibrated this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const calibratedThisMonth = await prisma.unifiedCalibrationHistory.count({
      where: { calDate: { gte: startOfMonth } }
    });

    res.json({
      period: { start: oneYearAgo, end: new Date() },
      totalInstruments,
      calibratedThisMonth,
      overall: {
        totalCalibrations: history.length,
        pass: totalPass,
        fail: totalFail,
        complianceRate: history.length > 0 ? ((totalPass / history.length) * 100).toFixed(1) : 0,
        automatedCount: totalAutomated,
        internalCount: totalInternal
      },
      byInstallation
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get compliance stats' });
  }
};

// Get tier distribution summary
export const getTierDistribution = async (req: Request, res: Response) => {
  try {
    const automated = await prisma.instrumentMaster.count({ where: { calSystemType: 'AUTOMATED' } });
    const internal = await prisma.instrumentMaster.count({ where: { calSystemType: 'INTERNAL' } });
    const total = automated + internal;
    
    res.json({
      automated: { count: automated, percentage: total > 0 ? ((automated / total) * 100).toFixed(1) : 0 },
      internal: { count: internal, percentage: total > 0 ? ((internal / total) * 100).toFixed(1) : 0 },
      total,
      recommendation: automated <= total * 0.15 ? 'OPTIMAL' : 'Review tier assignments - Automated tier should be ≤15%'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tier distribution' });
  }
};
