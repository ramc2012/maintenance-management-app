import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// ISO 14224 STANDARD FAILURE CODES - Complete Seed Data
// ============================================================================

export const seedISO14224Codes = async (req: Request, res: Response) => {
  try {
    // =========================================================================
    // 1. ISO 14224 9-LEVEL HIERARCHY
    // =========================================================================
    const levels = [
      { id: 1, name: 'Industry', description: 'Top level industry classification', example: 'Petrochemical, Power Generation' },
      { id: 2, name: 'Business Category', description: 'Business segment', example: 'Upstream, Downstream, Midstream' },
      { id: 3, name: 'Installation', description: 'Physical site or facility', example: 'Vadodara Plant A, Mumbai Refinery' },
      { id: 4, name: 'Plant/Unit', description: 'Major processing unit', example: 'Utility Block, CDU-1, FCC Unit' },
      { id: 5, name: 'Section/System', description: 'Process system', example: 'Cooling Water System, Fuel Gas System' },
      { id: 6, name: 'Equipment Unit', description: 'Main equipment item (tag level)', example: 'P-101 Pump Skid, K-201 Compressor' },
      { id: 7, name: 'Subunit', description: 'Major component of equipment', example: 'Motor, Pump End, Gearbox' },
      { id: 8, name: 'Maintainable Item', description: 'Replaceable component', example: 'Bearing, Seal, Impeller, Coupling' },
      { id: 9, name: 'Part', description: 'Individual part/spare', example: 'O-Ring, Ball Bearing, Gasket' }
    ];
    
    for (const level of levels) {
      await prisma.iSO14224Level.upsert({
        where: { id: level.id },
        create: level,
        update: level
      });
    }

    // =========================================================================
    // 2. FAILURE MODES (What you SEE - Symptoms) - ISO 14224 Table B.6
    // =========================================================================
    const failureModes = [
      // General Failure Modes
      { code: 'AIR', name: 'Abnormal Instrument Reading', assetClass: null },
      { code: 'BRD', name: 'Breakdown', assetClass: null },
      { code: 'ELP', name: 'External Leakage - Process Medium', assetClass: null },
      { code: 'ELU', name: 'External Leakage - Utility Medium', assetClass: null },
      { code: 'ERO', name: 'Erratic Output', assetClass: null },
      { code: 'FTC', name: 'Fail to Close', assetClass: 'VALVE' },
      { code: 'FTF', name: 'Fail to Function on Demand', assetClass: null },
      { code: 'FTO', name: 'Fail to Open', assetClass: 'VALVE' },
      { code: 'FTR', name: 'Fail to Regulate', assetClass: 'VALVE' },
      { code: 'FTS', name: 'Fail to Start', assetClass: 'MOTOR' },
      { code: 'HIO', name: 'High Output', assetClass: null },
      { code: 'IHT', name: 'Insufficient Heat Transfer', assetClass: 'HEAT_EXCHANGER' },
      { code: 'ILP', name: 'Internal Leakage - Process Medium', assetClass: null },
      { code: 'INL', name: 'Internal Leakage', assetClass: 'VALVE' },
      { code: 'LOO', name: 'Low Output', assetClass: null },
      { code: 'NOI', name: 'Noise', assetClass: null },
      { code: 'OHE', name: 'Overheating', assetClass: null },
      { code: 'PLU', name: 'Plugged/Choked', assetClass: null },
      { code: 'PDE', name: 'Parameter Deviation', assetClass: null },
      { code: 'SER', name: 'Spurious/Erratic Operation', assetClass: null },
      { code: 'STP', name: 'Fail to Stop', assetClass: 'MOTOR' },
      { code: 'STD', name: 'Structural Deficiency', assetClass: null },
      { code: 'UST', name: 'Unable to Start', assetClass: null },
      { code: 'VIB', name: 'Vibration', assetClass: 'ROTATING' },
      { code: 'OTH', name: 'Other', assetClass: null },
      { code: 'UNK', name: 'Unknown', assetClass: null }
    ];
    
    for (const fm of failureModes) {
      await prisma.failureMode.upsert({
        where: { code: fm.code },
        create: fm,
        update: fm
      });
    }

    // =========================================================================
    // 3. FAILURE MECHANISMS (Physics - WHY it broke) - ISO 14224 Table B.7
    // =========================================================================
    const failureMechanisms = [
      // Mechanical
      { id: 'COR', code: 'COR', name: 'Corrosion', category: 'Mechanical', description: 'General, galvanic, pitting, crevice, stress corrosion cracking' },
      { id: 'ERO', code: 'ERO', name: 'Erosion', category: 'Mechanical', description: 'Material loss due to fluid/particle impact' },
      { id: 'FAT', code: 'FAT', name: 'Fatigue', category: 'Mechanical', description: 'Cyclic stress induced cracking' },
      { id: 'WEA', code: 'WEA', name: 'Wear', category: 'Mechanical', description: 'Abrasive, adhesive, fretting wear' },
      { id: 'OVS', code: 'OVS', name: 'Overstress', category: 'Mechanical', description: 'Mechanical overload exceeding design limits' },
      { id: 'DEF', code: 'DEF', name: 'Deformation', category: 'Mechanical', description: 'Permanent change in shape' },
      { id: 'BRI', code: 'BRI', name: 'Brittle Fracture', category: 'Mechanical', description: 'Sudden fracture without deformation' },
      { id: 'BUR', code: 'BUR', name: 'Bursting', category: 'Mechanical', description: 'Pressure vessel rupture' },
      { id: 'CAV', code: 'CAV', name: 'Cavitation', category: 'Mechanical', description: 'Vapor bubble collapse damage' },
      { id: 'FOL', code: 'FOL', name: 'Foreign Object', category: 'Mechanical', description: 'Damage from foreign material' },
      { id: 'CRE', code: 'CRE', name: 'Creep', category: 'Mechanical', description: 'Time-dependent deformation at high temp' },
      
      // Electrical
      { id: 'SHO', code: 'SHO', name: 'Short Circuit', category: 'Electrical', description: 'Unintended electrical path' },
      { id: 'OPC', code: 'OPC', name: 'Open Circuit', category: 'Electrical', description: 'Broken electrical path' },
      { id: 'GRO', code: 'GRO', name: 'Ground/Earth Fault', category: 'Electrical', description: 'Unintended path to ground' },
      { id: 'INS', code: 'INS', name: 'Insulation Breakdown', category: 'Electrical', description: 'Loss of dielectric strength' },
      { id: 'OVE', code: 'OVE', name: 'Overheating (Electrical)', category: 'Electrical', description: 'Excessive heat in electrical components' },
      { id: 'ARC', code: 'ARC', name: 'Arcing/Sparking', category: 'Electrical', description: 'Electrical discharge through air' },
      
      // Instrumentation
      { id: 'DRI', code: 'DRI', name: 'Drift', category: 'Instrumentation', description: 'Gradual change in calibration' },
      { id: 'SIG', code: 'SIG', name: 'Signal Error', category: 'Instrumentation', description: 'Incorrect signal transmission' },
      { id: 'SOF', code: 'SOF', name: 'Software Error', category: 'Instrumentation', description: 'Programming or logic fault' },
      { id: 'NOC', code: 'NOC', name: 'No Communication', category: 'Instrumentation', description: 'Communication link failure' },
      
      // Material
      { id: 'MAT', code: 'MAT', name: 'Material Defect', category: 'Material', description: 'Inherent material flaw' },
      { id: 'HYD', code: 'HYD', name: 'Hydrogen Damage', category: 'Material', description: 'Hydrogen embrittlement or blistering' },
      { id: 'SCC', code: 'SCC', name: 'Stress Corrosion Cracking', category: 'Material', description: 'Combined stress and corrosive environment' },
      
      // External
      { id: 'CON', code: 'CON', name: 'Contamination', category: 'External', description: 'Foreign substance ingress' },
      { id: 'BLO', code: 'BLO', name: 'Blockage', category: 'External', description: 'Flow path obstruction' },
      { id: 'ICE', code: 'ICE', name: 'Icing/Freezing', category: 'External', description: 'Ice formation damage' },
      
      { id: 'OTH', code: 'OTH', name: 'Other', category: 'General', description: 'Other mechanism not listed' },
      { id: 'UNK', code: 'UNK', name: 'Unknown', category: 'General', description: 'Mechanism could not be determined' }
    ];
    
    for (const fm of failureMechanisms) {
      await prisma.failureMechanism.upsert({
        where: { code: fm.code },
        create: fm,
        update: fm
      });
    }

    // =========================================================================
    // 4. CAUSE CODES (Root Cause - WHY it happened) - ISO 14224 Table B.8
    // =========================================================================
    const causeCodes = [
      // Design Related
      { code: 'DES', name: 'Design Error' },
      { code: 'CAP', name: 'Inadequate Capacity' },
      { code: 'MAT', name: 'Wrong Material Selection' },
      { code: 'SPE', name: 'Specification Error' },
      
      // Manufacturing Related
      { code: 'MFG', name: 'Manufacturing/Fabrication Error' },
      { code: 'QAL', name: 'Quality Assurance Failure' },
      { code: 'WLD', name: 'Welding/Joining Defect' },
      { code: 'ASM', name: 'Wrong Assembly' },
      
      // Installation Related
      { code: 'INS', name: 'Installation Error' },
      { code: 'ALI', name: 'Misalignment' },
      { code: 'MOU', name: 'Mounting/Support Error' },
      { code: 'CON', name: 'Wrong Connections' },
      
      // Operation Related
      { code: 'OPE', name: 'Operating Error' },
      { code: 'OVL', name: 'Overload/Overspeed' },
      { code: 'PRO', name: 'Procedural Error' },
      { code: 'ABU', name: 'Abuse/Misuse' },
      { code: 'OPS', name: 'Operating Outside Limits' },
      { code: 'STA', name: 'Start-up/Shutdown Error' },
      
      // Maintenance Related
      { code: 'MAI', name: 'Maintenance Error' },
      { code: 'LUB', name: 'No/Wrong Lubrication' },
      { code: 'REP', name: 'Repair/Replacement Error' },
      { code: 'INS', name: 'Inspection Failure' },
      { code: 'SPA', name: 'Wrong Spare Parts' },
      
      // Management Related
      { code: 'MAN', name: 'Management/Organization' },
      { code: 'TRN', name: 'Not Adequately Trained' },
      { code: 'DOC', name: 'Inadequate Procedures/Documents' },
      { code: 'SUP', name: 'Inadequate Supervision' },
      
      // External/Normal
      { code: 'NOR', name: 'Normal Wear and Tear' },
      { code: 'AGE', name: 'Aging/End of Life' },
      { code: 'EXT', name: 'External Event' },
      { code: 'ENV', name: 'Environmental Conditions' },
      { code: 'SAB', name: 'Sabotage/Vandalism' },
      
      { code: 'OTH', name: 'Other' },
      { code: 'UNK', name: 'Unknown' }
    ];
    
    for (const cc of causeCodes) {
      await prisma.causeCode.upsert({
        where: { code: cc.code },
        create: cc,
        update: cc
      });
    }

    // =========================================================================
    // 5. ACTION CODES (What was done)
    // =========================================================================
    const actionCodes = [
      { code: 'ADJ', name: 'Adjustment' },
      { code: 'ALI', name: 'Realignment' },
      { code: 'CAL', name: 'Recalibration' },
      { code: 'CLE', name: 'Cleaning' },
      { code: 'GRE', name: 'Lubrication/Greasing' },
      { code: 'INS', name: 'Inspection Only' },
      { code: 'MOD', name: 'Modification' },
      { code: 'OVH', name: 'Overhaul' },
      { code: 'REP', name: 'Repair' },
      { code: 'RPL', name: 'Replacement' },
      { code: 'RST', name: 'Reset' },
      { code: 'TES', name: 'Testing' },
      { code: 'TIG', name: 'Tightening' },
      { code: 'NOP', name: 'No Action/Run to Failure' },
      { code: 'OTH', name: 'Other' }
    ];
    
    for (const ac of actionCodes) {
      await prisma.actionCode.upsert({
        where: { code: ac.code },
        create: ac,
        update: ac
      });
    }

    res.json({
      message: 'ISO 14224 Standard Codes Seeded Successfully',
      counts: {
        levels: levels.length,
        failureModes: failureModes.length,
        failureMechanisms: failureMechanisms.length,
        causeCodes: causeCodes.length,
        actionCodes: actionCodes.length
      }
    });
  } catch (error) {
    console.error('ISO 14224 Seed Error:', error);
    res.status(500).json({ error: 'Failed to seed ISO 14224 codes' });
  }
};

// ============================================================================
// GET FAILURE CODES FOR DROPDOWN POPULATION
// ============================================================================

export const getFailureModes = async (req: Request, res: Response) => {
  try {
    const { assetClass } = req.query;
    const where: any = {};
    if (assetClass) {
      where.OR = [
        { assetClass: null },
        { assetClass: String(assetClass) }
      ];
    }
    const modes = await prisma.failureMode.findMany({ where, orderBy: { code: 'asc' } });
    res.json(modes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failure modes' });
  }
};

export const getFailureMechanisms = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = String(category);
    const mechanisms = await prisma.failureMechanism.findMany({ where, orderBy: { code: 'asc' } });
    res.json(mechanisms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failure mechanisms' });
  }
};

export const getCauseCodes = async (req: Request, res: Response) => {
  try {
    const causes = await prisma.causeCode.findMany({ orderBy: { code: 'asc' } });
    res.json(causes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cause codes' });
  }
};

export const getActionCodes = async (req: Request, res: Response) => {
  try {
    const actions = await prisma.actionCode.findMany({ orderBy: { code: 'asc' } });
    res.json(actions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch action codes' });
  }
};

export const getISO14224Levels = async (req: Request, res: Response) => {
  try {
    const levels = await prisma.iSO14224Level.findMany({ orderBy: { id: 'asc' } });
    res.json(levels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ISO 14224 levels' });
  }
};

// ============================================================================
// MTBF CALCULATION (Mean Time Between Failures)
// ============================================================================

export const calculateMTBF = async (req: Request, res: Response) => {
  try {
    const { flId, startDate, endDate } = req.query;
    
    // Get all failures for this FL
    const workOrders = await prisma.workOrder.findMany({
      where: {
        flId: String(flId),
        woType: 'CORRECTIVE',
        status: 'CLOSED',
        completionDate: {
          gte: startDate ? new Date(String(startDate)) : undefined,
          lte: endDate ? new Date(String(endDate)) : undefined
        }
      },
      orderBy: { completionDate: 'asc' }
    });
    
    if (workOrders.length < 2) {
      return res.json({ mtbf: null, message: 'Need at least 2 failures to calculate MTBF' });
    }
    
    // Calculate time between failures
    let totalTime = 0;
    for (let i = 1; i < workOrders.length; i++) {
      const prev = workOrders[i - 1].completionDate;
      const curr = workOrders[i].completionDate;
      if (prev && curr) {
        totalTime += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24); // Days
      }
    }
    
    const mtbf = totalTime / (workOrders.length - 1);
    
    res.json({
      flId,
      failureCount: workOrders.length,
      mtbfDays: mtbf.toFixed(1),
      mtbfMonths: (mtbf / 30).toFixed(1),
      period: { startDate, endDate }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate MTBF' });
  }
};

// ============================================================================
// RCM ANALYSIS CRUD
// ============================================================================

export const getRCMAnalysis = async (req: Request, res: Response) => {
  try {
    const { strategyId } = req.query;
    const where: any = {};
    if (strategyId) where.strategyId = String(strategyId);
    
    const analyses = await prisma.rCMAnalysis.findMany({
      where,
      include: { strategy: true, failureMode: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RCM analyses' });
  }
};

export const createRCMAnalysis = async (req: Request, res: Response) => {
  try {
    const analysis = await prisma.rCMAnalysis.create({
      data: req.body,
      include: { strategy: true, failureMode: true }
    });
    res.json(analysis);
  } catch (error) {
    console.error('RCM Creation Error:', error);
    res.status(500).json({ error: 'Failed to create RCM analysis' });
  }
};

export const updateRCMAnalysis = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const analysis = await prisma.rCMAnalysis.update({
      where: { id },
      data: req.body,
      include: { strategy: true, failureMode: true }
    });
    res.json(analysis);
  } catch (error) {
    console.error('RCM Update Error:', error);
    res.status(500).json({ error: 'Failed to update RCM analysis' });
  }
};

export const deleteRCMAnalysis = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.rCMAnalysis.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete RCM analysis' });
  }
};

export const getRCMByStrategy = async (req: Request, res: Response) => {
  try {
    const { strategyId } = req.params;
    const analyses = await prisma.rCMAnalysis.findMany({
      where: { strategyId },
      include: { failureMode: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RCM for strategy' });
  }
};
