import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { ensureOperationalCatalog, toLogDate } from '../src/services/operationsCatalog';

const prisma = new PrismaClient();

const DEMO_PREFIX = '[DEMO]';
const DEMO_USER = 'demo-seed';
const DEMO_PASSWORD = 'demo123';

const baseDate = new Date();
baseDate.setHours(10, 0, 0, 0);

const at = (dayOffset: number, hour = 10, minute = 0) => {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const dayOnly = (dayOffset: number) => toLogDate(at(dayOffset));
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const bytes = (content: string) => Buffer.byteLength(content, 'utf8');

const getMetricPayload = (entries: Record<string, number | string | boolean | null | undefined>) =>
  Object.entries(entries)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([code, value]) => ({ code, value }));

async function ensureDepartment(companyId: string, name: string) {
  const existing = await prisma.department.findFirst({ where: { companyId, name } });
  if (existing) return existing;
  return prisma.department.create({ data: { companyId, name } });
}

async function upsertUser(params: {
  username: string;
  role: string;
  departmentId?: string;
  isExternal?: boolean;
  companyName?: string;
  phone?: string;
  jobTitle?: string;
  canCreateWorkOrder?: boolean;
  canCloseWorkOrder?: boolean;
}) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      password,
      role: params.role,
      departmentId: params.departmentId,
      isExternal: params.isExternal ?? false,
      companyName: params.companyName,
      phone: params.phone,
      jobTitle: params.jobTitle,
      canCreateWorkOrder: params.canCreateWorkOrder ?? false,
      canCloseWorkOrder: params.canCloseWorkOrder ?? false,
      lastLogin: null,
    },
    create: {
      username: params.username,
      password,
      role: params.role,
      departmentId: params.departmentId,
      isExternal: params.isExternal ?? false,
      companyName: params.companyName,
      phone: params.phone,
      jobTitle: params.jobTitle,
      canCreateWorkOrder: params.canCreateWorkOrder ?? false,
      canCloseWorkOrder: params.canCloseWorkOrder ?? false,
    },
  });
}

async function upsertOperationalLog(params: {
  key: string;
  logDate: Date;
  shift: string;
  installationId: string;
  equipmentTag: string;
  runtimeHours: number;
  downtimeHours: number;
  standbyHours: number;
  cumulativeHours: number;
  operatingState: string;
  availabilityStatus: string;
  sourceMode?: string;
  sourceStatus?: string;
  profileCode: string;
  enteredBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  remarks?: string;
  qualityScore?: number;
  metrics: Array<{ code: string; value: number | string | boolean }>;
  metricIdMap: Map<string, string>;
}) {
  const log = await prisma.operationalLog.upsert({
    where: {
      logDate_shift_equipmentTag: {
        logDate: params.logDate,
        shift: params.shift,
        equipmentTag: params.equipmentTag,
      },
    },
    update: {
      granularity: 'DAILY',
      sourceMode: params.sourceMode || 'MANUAL',
      sourceStatus: params.sourceStatus || 'APPROVED',
      assetClass: 'RUNNING_EQUIPMENT',
      profileCode: params.profileCode,
      installationId: params.installationId,
      runtimeHours: params.runtimeHours,
      downtimeHours: params.downtimeHours,
      standbyHours: params.standbyHours,
      cumulativeHours: params.cumulativeHours,
      operatingState: params.operatingState,
      availabilityStatus: params.availabilityStatus,
      enteredBy: params.enteredBy,
      reviewedBy: params.reviewedBy,
      approvedBy: params.approvedBy,
      approvedAt: params.approvedBy ? new Date() : null,
      remarks: params.remarks,
      qualityScore: params.qualityScore,
    },
    create: {
      id: `demo-operational-${params.key}`,
      logDate: params.logDate,
      shift: params.shift,
      granularity: 'DAILY',
      sourceMode: params.sourceMode || 'MANUAL',
      sourceStatus: params.sourceStatus || 'APPROVED',
      assetClass: 'RUNNING_EQUIPMENT',
      profileCode: params.profileCode,
      installationId: params.installationId,
      equipmentTag: params.equipmentTag,
      runtimeHours: params.runtimeHours,
      downtimeHours: params.downtimeHours,
      standbyHours: params.standbyHours,
      cumulativeHours: params.cumulativeHours,
      operatingState: params.operatingState,
      availabilityStatus: params.availabilityStatus,
      enteredBy: params.enteredBy,
      reviewedBy: params.reviewedBy,
      approvedBy: params.approvedBy,
      approvedAt: params.approvedBy ? new Date() : null,
      remarks: params.remarks,
      qualityScore: params.qualityScore,
    },
  });

  await prisma.operationalLogMetric.deleteMany({
    where: { operationalLogId: log.id },
  });

  for (const metric of params.metrics) {
    const definitionId = params.metricIdMap.get(metric.code);
    if (!definitionId) continue;

    await prisma.operationalLogMetric.create({
      data: {
        id: `demo-operational-metric-${params.key}-${metric.code}`,
        operationalLogId: log.id,
        metricDefinitionId: definitionId,
        valueNumber: typeof metric.value === 'number' ? metric.value : null,
        valueBoolean: typeof metric.value === 'boolean' ? metric.value : null,
        valueText: typeof metric.value === 'string' ? metric.value : null,
        readingTimestamp: params.logDate,
        sourceQuality: 'VALIDATED',
        sourceTag: `${params.equipmentTag}:${metric.code}`,
      },
    });
  }

  return log;
}

async function upsertCalibrationEvent(params: {
  id: string;
  certificateNo: string;
  instrumentTagId: string;
  standardUsedId: string;
  calibrationDate: Date;
  previousCalDate?: Date;
  nextDueDate: Date;
  performedBy: string;
  approvedBy: string;
  remarks: string;
  maxErrorFoundPct: number;
  maxErrorLeftPct: number;
  overallResultAsFound: string;
  overallResultAsLeft: string;
  points: Array<{
    id: string;
    sequence: number;
    stepPercent: number;
    inputApplied: number;
    expectedReading: number;
    asFoundReading: number;
    asLeftReading: number;
  }>;
}) {
  const event = await prisma.calibrationEvent.upsert({
    where: { certificateNo: params.certificateNo },
    update: {
      instrumentTagId: params.instrumentTagId,
      standardUsedId: params.standardUsedId,
      calibrationDate: params.calibrationDate,
      previousCalDate: params.previousCalDate,
      nextDueDate: params.nextDueDate,
      ambientTemp: 27.5,
      humidity: 48,
      atmosphericPressure: 1007,
      overallResultAsFound: params.overallResultAsFound,
      overallResultAsLeft: params.overallResultAsLeft,
      maxErrorFoundPct: params.maxErrorFoundPct,
      maxErrorLeftPct: params.maxErrorLeftPct,
      status: 'APPROVED',
      adjustmentMade: true,
      repairRequired: false,
      performedBy: params.performedBy,
      approvedBy: params.approvedBy,
      approvalDate: addDays(params.calibrationDate, 1),
      remarks: params.remarks,
      reportFileUrl: `/reports/${params.certificateNo}.pdf`,
    },
    create: {
      id: params.id,
      certificateNo: params.certificateNo,
      instrumentTagId: params.instrumentTagId,
      standardUsedId: params.standardUsedId,
      calibrationDate: params.calibrationDate,
      previousCalDate: params.previousCalDate,
      nextDueDate: params.nextDueDate,
      ambientTemp: 27.5,
      humidity: 48,
      atmosphericPressure: 1007,
      overallResultAsFound: params.overallResultAsFound,
      overallResultAsLeft: params.overallResultAsLeft,
      maxErrorFoundPct: params.maxErrorFoundPct,
      maxErrorLeftPct: params.maxErrorLeftPct,
      status: 'APPROVED',
      adjustmentMade: true,
      repairRequired: false,
      performedBy: params.performedBy,
      approvedBy: params.approvedBy,
      approvalDate: addDays(params.calibrationDate, 1),
      remarks: params.remarks,
      reportFileUrl: `/reports/${params.certificateNo}.pdf`,
    },
  });

  await prisma.calibrationPoint.deleteMany({ where: { eventId: event.id } });

  for (const point of params.points) {
    const span = Math.max(params.points[params.points.length - 1].expectedReading, 1);
    await prisma.calibrationPoint.create({
      data: {
        id: point.id,
        eventId: event.id,
        sequence: point.sequence,
        stepPercent: point.stepPercent,
        direction: 'UP',
        inputApplied: point.inputApplied,
        inputUnit: 'SCMH',
        expectedReading: point.expectedReading,
        expectedUnit: 'SCMH',
        asFoundReading: point.asFoundReading,
        asFoundError: Number((((point.asFoundReading - point.expectedReading) / span) * 100).toFixed(2)),
        asFoundResult: Math.abs(point.asFoundReading - point.expectedReading) <= span * 0.01 ? 'PASS' : 'FAIL',
        asLeftReading: point.asLeftReading,
        asLeftError: Number((((point.asLeftReading - point.expectedReading) / span) * 100).toFixed(2)),
        asLeftResult: Math.abs(point.asLeftReading - point.expectedReading) <= span * 0.005 ? 'PASS' : 'FAIL',
      },
    });
  }

  return event;
}

async function main() {
  console.log('Seeding demo data...');

  const company = await prisma.company.upsert({
    where: { name: 'ANKLESHWAR ASSET' },
    update: {},
    create: { name: 'ANKLESHWAR ASSET' },
  });

  const departments = {
    mechanical: await ensureDepartment(company.id, 'MECHANICAL'),
    electrical: await ensureDepartment(company.id, 'ELECTRICAL'),
    instrumentation: await ensureDepartment(company.id, 'INSTRUMENTATION'),
    moh: await ensureDepartment(company.id, 'MOH'),
    workshop: await ensureDepartment(company.id, 'WORKSHOP'),
  };

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  const users = {
    hod: await upsertUser({
      username: 'maintenance.hod',
      role: 'HOD',
      departmentId: departments.mechanical.id,
      phone: '+91-9876500101',
      jobTitle: 'Maintenance Head',
      canCreateWorkOrder: true,
      canCloseWorkOrder: true,
    }),
    instrumentEngineer: await upsertUser({
      username: 'instrument.eng',
      role: 'ENGINEER',
      departmentId: departments.instrumentation.id,
      phone: '+91-9876500102',
      jobTitle: 'Instrumentation Engineer',
      canCreateWorkOrder: true,
      canCloseWorkOrder: true,
    }),
    fieldSupervisor: await upsertUser({
      username: 'field.supervisor',
      role: 'SUPERVISOR',
      departmentId: departments.mechanical.id,
      phone: '+91-9876500103',
      jobTitle: 'Field Supervisor',
      canCreateWorkOrder: true,
      canCloseWorkOrder: false,
    }),
    procurementOfficer: await upsertUser({
      username: 'procurement.officer',
      role: 'USER',
      departmentId: departments.workshop.id,
      phone: '+91-9876500104',
      jobTitle: 'Procurement Officer',
    }),
    contractorCoordinator: await upsertUser({
      username: 'cms.contractor',
      role: 'CONTRACTOR_COORDINATOR',
      isExternal: true,
      companyName: 'CMS CONTRACT SERVICES',
      phone: '+91-9876500105',
      jobTitle: 'Contract Coordinator',
      canCreateWorkOrder: true,
    }),
    contractorTech: await upsertUser({
      username: 'cms.tech.01',
      role: 'CONTRACTOR_TECHNICIAN',
      isExternal: true,
      companyName: 'CMS CONTRACT SERVICES',
      phone: '+91-9876500106',
      jobTitle: 'Field Technician',
    }),
  };

  await prisma.manpower.upsert({
    where: { employeeId: 'M-1001' },
    update: { name: 'Rakesh Parmar', department: 'Mechanical', section: 'Rotating', designation: 'Senior Technician', isActive: true },
    create: { employeeId: 'M-1001', name: 'Rakesh Parmar', department: 'Mechanical', section: 'Rotating', designation: 'Senior Technician' },
  });
  await prisma.manpower.upsert({
    where: { employeeId: 'M-1002' },
    update: { name: 'Amit Solanki', department: 'Mechanical', section: 'Utilities', designation: 'Technician', isActive: true },
    create: { employeeId: 'M-1002', name: 'Amit Solanki', department: 'Mechanical', section: 'Utilities', designation: 'Technician' },
  });
  await prisma.manpower.upsert({
    where: { employeeId: 'I-2001' },
    update: { name: 'Ketan Shah', department: 'Instrumentation', section: 'Calibration', designation: 'Calibration Technician', isActive: true },
    create: { employeeId: 'I-2001', name: 'Ketan Shah', department: 'Instrumentation', section: 'Calibration', designation: 'Calibration Technician' },
  });

  await prisma.calibrationPerformer.upsert({
    where: { employeeId: 'CAL-2001' },
    update: { name: 'Arvind Patel', employmentType: 'Regular', company: 'ONGC', designation: 'Calibration Engineer' },
    create: { employeeId: 'CAL-2001', name: 'Arvind Patel', employmentType: 'Regular', company: 'ONGC', designation: 'Calibration Engineer' },
  });
  await prisma.calibrationPerformer.upsert({
    where: { employeeId: 'CAL-2002' },
    update: { name: 'Deepak Rana', employmentType: 'Contractual', company: 'CMS CONTRACT SERVICES', designation: 'Calibration Specialist' },
    create: { employeeId: 'CAL-2002', name: 'Deepak Rana', employmentType: 'Contractual', company: 'CMS CONTRACT SERVICES', designation: 'Calibration Specialist' },
  });

  for (const rate of [
    { department: 'Mechanical', designation: 'Senior Technician', dailyRate: 2200 },
    { department: 'Mechanical', designation: 'Technician', dailyRate: 1800 },
    { department: 'Instrumentation', designation: 'Calibration Technician', dailyRate: 2100 },
  ]) {
    await prisma.laborRate.upsert({
      where: {
        department_designation_effectiveFrom: {
          department: rate.department,
          designation: rate.designation,
          effectiveFrom: toLogDate('2026-04-01'),
        },
      },
      update: { dailyRate: rate.dailyRate, isActive: true },
      create: { ...rate, effectiveFrom: toLogDate('2026-04-01'), currency: 'INR', isActive: true },
    });
  }

  const installation = await prisma.installation.findUniqueOrThrow({
    where: { installationId: 'ANK-GGS-2' },
  });

  const equipmentTags = {
    compressor: 'ANK-GGS-2-AIR-COMP-A',
    compressorMotor: 'ANK-GGS-2-AIR-COMP-A-MOTO',
    firePump: 'ANK-GGS-2-FIRE-PUMP',
    fireEngine: 'ANK-GGS-2-FIRE-PUMP-ENGI',
    odpPump: 'ANK-GGS-2-ODP1-PUMP',
    odpMotor: 'ANK-GGS-2-ODP1-MOTO',
    dgSet: 'ANK-GGS-2-DG-SET',
  };

  const instrumentTags = {
    flow1501: '1501-2',
    flow1502: '1502-2',
    flow1503: '1503-2',
    flow1371: '1371-2',
  };

  const equipmentTypeMap = new Map<string, string>();
  for (const type of [
    { name: 'AIR_COMPRESSOR', category: 'RUNNING', description: 'Rotary air compressor package' },
    { name: 'ELECTRIC_MOTOR', category: 'RUNNING', description: 'Electrical motor driver' },
    { name: 'FIRE_PUMP', category: 'RUNNING', description: 'Fire water pump package' },
    { name: 'PROCESS_PUMP', category: 'RUNNING', description: 'Produced water transfer pump' },
    { name: 'GENERATOR', category: 'RUNNING', description: 'Diesel generator set' },
  ]) {
    const record = await prisma.equipmentType.upsert({
      where: { name: type.name },
      update: { category: type.category, description: type.description },
      create: type,
    });
    equipmentTypeMap.set(type.name, record.id);
  }

  for (const type of [
    { name: 'FLOW_METER', description: 'Gas and utility flow meters' },
    { name: 'PRESSURE_TRANSMITTER', description: 'Pressure transmitters and gauges' },
  ]) {
    await prisma.instrumentType.upsert({
      where: { name: type.name },
      update: { description: type.description },
      create: type,
    });
  }

  for (const meterType of [
    { name: 'ORIFICE', configSchema: { pressureTaps: true, betaRatio: true } },
    { name: 'ULTRASONIC', configSchema: { pathCount: true, diagnostics: true } },
  ]) {
    await prisma.meterType.upsert({
      where: { name: meterType.name },
      update: { configSchema: meterType.configSchema },
      create: meterType,
    });
  }

  for (const product of [
    { name: 'Natural Gas', description: 'Associated gas stream' },
    { name: 'Condensate', description: 'Condensate transfer service' },
  ]) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: { description: product.description },
      create: product,
    });
  }

  const equipmentUpdates = [
    {
      equipmentTag: equipmentTags.compressor,
      equipmentTypeName: 'AIR_COMPRESSOR',
      equipmentTypeId: equipmentTypeMap.get('AIR_COMPRESSOR'),
      serviceLine: 'Compressed Air',
      powerRating: '75 kW',
      description: 'Air Compressor A',
      specifications: { ratedPressureBar: 8.5, ratedFlowM3Hr: 1450, rpm: 2980 },
      criticality: 'A',
    },
    {
      equipmentTag: equipmentTags.compressorMotor,
      equipmentTypeName: 'ELECTRIC_MOTOR',
      equipmentTypeId: equipmentTypeMap.get('ELECTRIC_MOTOR'),
      serviceLine: 'Motor Driver',
      powerRating: '90 kW',
      description: 'Air Compressor A Motor',
      specifications: { voltage: 415, amps: 148, rpm: 2980 },
      criticality: 'A',
    },
    {
      equipmentTag: equipmentTags.firePump,
      equipmentTypeName: 'FIRE_PUMP',
      equipmentTypeId: equipmentTypeMap.get('FIRE_PUMP'),
      serviceLine: 'Fire Water',
      powerRating: '37 kW',
      description: 'Fire Pump-1',
      specifications: { ratedPressureBar: 11, ratedFlowM3Hr: 420 },
      criticality: 'A',
    },
    {
      equipmentTag: equipmentTags.fireEngine,
      equipmentTypeName: 'FIRE_PUMP',
      equipmentTypeId: equipmentTypeMap.get('FIRE_PUMP'),
      serviceLine: 'Fire Water',
      powerRating: 'Diesel Engine',
      description: 'Fire Pump-1 Engine',
      specifications: { fuel: 'Diesel', ratedRpm: 1800 },
      criticality: 'A',
    },
    {
      equipmentTag: equipmentTags.odpPump,
      equipmentTypeName: 'PROCESS_PUMP',
      equipmentTypeId: equipmentTypeMap.get('PROCESS_PUMP'),
      serviceLine: 'Produced Water Transfer',
      powerRating: '30 kW',
      description: 'ODP-1 Pump',
      specifications: { ratedPressureBar: 6.2, ratedFlowM3Hr: 180 },
      criticality: 'B',
    },
    {
      equipmentTag: equipmentTags.odpMotor,
      equipmentTypeName: 'ELECTRIC_MOTOR',
      equipmentTypeId: equipmentTypeMap.get('ELECTRIC_MOTOR'),
      serviceLine: 'Pump Driver',
      powerRating: '30 kW',
      description: 'ODP-1 Motor',
      specifications: { voltage: 415, amps: 55, rpm: 1480 },
      criticality: 'B',
    },
    {
      equipmentTag: equipmentTags.dgSet,
      equipmentTypeName: 'GENERATOR',
      equipmentTypeId: equipmentTypeMap.get('GENERATOR'),
      serviceLine: 'Emergency Power',
      powerRating: '125 kVA',
      description: 'DG set',
      specifications: { kva: 125, voltage: 415, fuelTankL: 450 },
      criticality: 'B',
    },
  ];

  for (const item of equipmentUpdates) {
    await prisma.runningEquipmentMaster.update({
      where: { equipmentTag: item.equipmentTag },
      data: {
        equipmentTypeName: item.equipmentTypeName,
        equipmentTypeId: item.equipmentTypeId,
        serviceLine: item.serviceLine,
        powerRating: item.powerRating,
        description: item.description,
        specifications: item.specifications,
        criticality: item.criticality,
        mountingLocation: 'ANK-GGS-2',
        drawingRef: 'P&ID/ANK/GGS2/ROT/001',
      },
    });
  }

  for (const instrument of [
    { tagId: instrumentTags.flow1501, description: 'Gas To CTF Main Meter', serviceLine: 'Gas To CTF', rangeMin: 0, rangeMax: 5000, unit: 'SCMH', criticality: 'A' },
    { tagId: instrumentTags.flow1502, description: 'Gas To CTF Standby Meter', serviceLine: 'Gas To CTF', rangeMin: 0, rangeMax: 8000, unit: 'SCMH', criticality: 'A' },
    { tagId: instrumentTags.flow1503, description: 'Gas To Gas Lift Meter', serviceLine: 'Gas To Gas Lift', rangeMin: 0, rangeMax: 2400, unit: 'SCMH', criticality: 'B' },
    { tagId: instrumentTags.flow1371, description: 'MP Test Separator Gas Flow Meter', serviceLine: 'MP Test Separator', rangeMin: 0, rangeMax: 2500, unit: 'SCMH', criticality: 'B' },
  ]) {
    await prisma.instrumentMaster.update({
      where: { tagId: instrument.tagId },
      data: {
        description: instrument.description,
        serviceLine: instrument.serviceLine,
        rangeMin: instrument.rangeMin,
        rangeMax: instrument.rangeMax,
        unit: instrument.unit,
        criticality: instrument.criticality,
        mountingLocation: 'Metering Skid',
        drawingRef: 'P&ID/ANK/GGS2/INS/015',
        healthStatus: 'OK',
      },
    });
  }

  const standards = {
    flowStandard: await prisma.calibrationStandard.upsert({
      where: { tagId: 'STD-FLOW-001' },
      update: {
        description: 'Portable ultrasonic gas flow calibrator',
        category: 'Field',
        dueDate: addDays(baseDate, 180),
        lastCalDate: addDays(baseDate, -45),
        parameters: ['flow'],
        reportUrl: '/manuals/instrumentation/demo-flow-standard-cert.pdf',
        isActive: true,
      },
      create: {
        tagId: 'STD-FLOW-001',
        description: 'Portable ultrasonic gas flow calibrator',
        make: 'Yokogawa',
        model: 'CAL-UGF-500',
        category: 'Field',
        modelYear: 2024,
        dueDate: addDays(baseDate, 180),
        lastCalDate: addDays(baseDate, -45),
        parameters: ['flow'],
        reportUrl: '/manuals/instrumentation/demo-flow-standard-cert.pdf',
        isActive: true,
      },
    }),
    pressureStandard: await prisma.calibrationStandard.upsert({
      where: { tagId: 'STD-PRES-001' },
      update: {
        description: 'Digital pressure standard',
        category: 'Lab',
        dueDate: addDays(baseDate, 220),
        lastCalDate: addDays(baseDate, -30),
        parameters: ['pressure'],
        reportUrl: '/manuals/instrumentation/demo-pressure-standard-cert.pdf',
        isActive: true,
      },
      create: {
        tagId: 'STD-PRES-001',
        description: 'Digital pressure standard',
        make: 'Fluke',
        model: '729 Pro',
        category: 'Lab',
        modelYear: 2025,
        dueDate: addDays(baseDate, 220),
        lastCalDate: addDays(baseDate, -30),
        parameters: ['pressure'],
        reportUrl: '/manuals/instrumentation/demo-pressure-standard-cert.pdf',
        isActive: true,
      },
    }),
  };

  const site = await prisma.site.upsert({
    where: { siteId: 'ANK-GGS-2' },
    update: { name: 'ANK GGS-2', location: installation.location, isActive: true },
    create: { siteId: 'ANK-GGS-2', name: 'ANK GGS-2', location: installation.location, isActive: true },
  });

  const area = await prisma.area.upsert({
    where: { areaId: 'ANK-GGS-2-OPS' },
    update: { name: 'Operations Area', siteId: site.id },
    create: { areaId: 'ANK-GGS-2-OPS', name: 'Operations Area', siteId: site.id },
  });

  const systems = {
    compressor: await prisma.system.upsert({
      where: { systemTag: 'ANK-GGS-2-COMP-SYS' },
      update: { name: 'Compressor System', areaId: area.id },
      create: { systemTag: 'ANK-GGS-2-COMP-SYS', name: 'Compressor System', areaId: area.id },
    }),
    fire: await prisma.system.upsert({
      where: { systemTag: 'ANK-GGS-2-FIRE-SYS' },
      update: { name: 'Fire Water System', areaId: area.id },
      create: { systemTag: 'ANK-GGS-2-FIRE-SYS', name: 'Fire Water System', areaId: area.id },
    }),
    process: await prisma.system.upsert({
      where: { systemTag: 'ANK-GGS-2-ODP-SYS' },
      update: { name: 'Produced Water Transfer', areaId: area.id },
      create: { systemTag: 'ANK-GGS-2-ODP-SYS', name: 'Produced Water Transfer', areaId: area.id },
    }),
    instruments: await prisma.system.upsert({
      where: { systemTag: 'ANK-GGS-2-INST-SYS' },
      update: { name: 'Metering & Instrumentation', areaId: area.id },
      create: { systemTag: 'ANK-GGS-2-INST-SYS', name: 'Metering & Instrumentation', areaId: area.id },
    }),
  };

  const fls: Record<string, any> = {
    compressorSkid: await prisma.functionalLocation.upsert({
      where: { flId: 'ANK-GGS-2-K101' },
      update: { name: 'Air Compressor Skid A', description: 'Main utility air compressor train', flType: 'SKID', systemId: systems.compressor.id, parentFlId: null },
      create: { flId: 'ANK-GGS-2-K101', name: 'Air Compressor Skid A', description: 'Main utility air compressor train', flType: 'SKID', systemId: systems.compressor.id },
    }),
    fireSkid: await prisma.functionalLocation.upsert({
      where: { flId: 'ANK-GGS-2-P501' },
      update: { name: 'Fire Pump Package', description: 'Fire water pump and engine train', flType: 'SKID', systemId: systems.fire.id, parentFlId: null },
      create: { flId: 'ANK-GGS-2-P501', name: 'Fire Pump Package', description: 'Fire water pump and engine train', flType: 'SKID', systemId: systems.fire.id },
    }),
    processSkid: await prisma.functionalLocation.upsert({
      where: { flId: 'ANK-GGS-2-P601' },
      update: { name: 'ODP-1 Pumping Train', description: 'Produced water transfer package', flType: 'SKID', systemId: systems.process.id, parentFlId: null },
      create: { flId: 'ANK-GGS-2-P601', name: 'ODP-1 Pumping Train', description: 'Produced water transfer package', flType: 'SKID', systemId: systems.process.id },
    }),
  };

  fls.compressorMotor = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-K101-M' },
    update: { name: 'Compressor Motor', description: 'Driver motor for compressor A', flType: 'POSITION', positionType: 'DRIVER', systemId: systems.compressor.id, parentFlId: fls.compressorSkid.id },
    create: { flId: 'ANK-GGS-2-K101-M', name: 'Compressor Motor', description: 'Driver motor for compressor A', flType: 'POSITION', positionType: 'DRIVER', systemId: systems.compressor.id, parentFlId: fls.compressorSkid.id },
  });
  fls.compressorDriven = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-K101-C' },
    update: { name: 'Compressor Package', description: 'Compressor element A', flType: 'POSITION', positionType: 'DRIVEN', systemId: systems.compressor.id, parentFlId: fls.compressorSkid.id },
    create: { flId: 'ANK-GGS-2-K101-C', name: 'Compressor Package', description: 'Compressor element A', flType: 'POSITION', positionType: 'DRIVEN', systemId: systems.compressor.id, parentFlId: fls.compressorSkid.id },
  });
  fls.fireEngine = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-P501-E' },
    update: { name: 'Fire Pump Engine', description: 'Diesel fire pump engine', flType: 'POSITION', positionType: 'DRIVER', systemId: systems.fire.id, parentFlId: fls.fireSkid.id },
    create: { flId: 'ANK-GGS-2-P501-E', name: 'Fire Pump Engine', description: 'Diesel fire pump engine', flType: 'POSITION', positionType: 'DRIVER', systemId: systems.fire.id, parentFlId: fls.fireSkid.id },
  });
  fls.firePump = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-P501-P' },
    update: { name: 'Fire Pump', description: 'Fire water pump train', flType: 'POSITION', positionType: 'DRIVEN', systemId: systems.fire.id, parentFlId: fls.fireSkid.id },
    create: { flId: 'ANK-GGS-2-P501-P', name: 'Fire Pump', description: 'Fire water pump train', flType: 'POSITION', positionType: 'DRIVEN', systemId: systems.fire.id, parentFlId: fls.fireSkid.id },
  });
  fls.processMotor = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-P601-M' },
    update: { name: 'ODP-1 Motor', description: 'Transfer pump motor', flType: 'POSITION', positionType: 'DRIVER', systemId: systems.process.id, parentFlId: fls.processSkid.id },
    create: { flId: 'ANK-GGS-2-P601-M', name: 'ODP-1 Motor', description: 'Transfer pump motor', flType: 'POSITION', positionType: 'DRIVER', systemId: systems.process.id, parentFlId: fls.processSkid.id },
  });
  fls.processPump = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-P601-P' },
    update: { name: 'ODP-1 Pump', description: 'Produced water transfer pump', flType: 'POSITION', positionType: 'DRIVEN', systemId: systems.process.id, parentFlId: fls.processSkid.id },
    create: { flId: 'ANK-GGS-2-P601-P', name: 'ODP-1 Pump', description: 'Produced water transfer pump', flType: 'POSITION', positionType: 'DRIVEN', systemId: systems.process.id, parentFlId: fls.processSkid.id },
  });
  fls.flowMeter = await prisma.functionalLocation.upsert({
    where: { flId: 'ANK-GGS-2-FI1501' },
    update: { name: 'FI-1501-2 Gas To CTF Meter', description: 'Custody transfer gas meter', flType: 'PROTECTION', systemId: systems.instruments.id, parentFlId: null },
    create: { flId: 'ANK-GGS-2-FI1501', name: 'FI-1501-2 Gas To CTF Meter', description: 'Custody transfer gas meter', flType: 'PROTECTION', systemId: systems.instruments.id },
  });

  const assets = {
    compressor: await prisma.asset.upsert({
      where: { assetCode: 'DEMO-K101-COMP' },
      update: { assetClass: 'COMPRESSOR', manufacturer: 'Atlas Copco', model: 'GA75', status: 'INSTALLED', currentFlId: fls.compressorDriven.id, specifications: { ratedFlowM3Hr: 1450, pressureBar: 8.5 } },
      create: { assetCode: 'DEMO-K101-COMP', assetClass: 'COMPRESSOR', manufacturer: 'Atlas Copco', model: 'GA75', status: 'INSTALLED', currentFlId: fls.compressorDriven.id, specifications: { ratedFlowM3Hr: 1450, pressureBar: 8.5 }, criticality: 'A' },
    }),
    motor: await prisma.asset.upsert({
      where: { assetCode: 'DEMO-K101-MOTOR' },
      update: { assetClass: 'MOTOR', manufacturer: 'ABB', model: 'M3BP', status: 'INSTALLED', currentFlId: fls.compressorMotor.id, specifications: { kw: 90, voltage: 415 } },
      create: { assetCode: 'DEMO-K101-MOTOR', assetClass: 'MOTOR', manufacturer: 'ABB', model: 'M3BP', status: 'INSTALLED', currentFlId: fls.compressorMotor.id, specifications: { kw: 90, voltage: 415 }, criticality: 'A' },
    }),
    firePump: await prisma.asset.upsert({
      where: { assetCode: 'DEMO-P501-PUMP' },
      update: { assetClass: 'PUMP', manufacturer: 'Kirloskar', model: 'FWS-420', status: 'INSTALLED', currentFlId: fls.firePump.id, specifications: { flowM3Hr: 420, pressureBar: 11 } },
      create: { assetCode: 'DEMO-P501-PUMP', assetClass: 'PUMP', manufacturer: 'Kirloskar', model: 'FWS-420', status: 'INSTALLED', currentFlId: fls.firePump.id, specifications: { flowM3Hr: 420, pressureBar: 11 }, criticality: 'A' },
    }),
    processPump: await prisma.asset.upsert({
      where: { assetCode: 'DEMO-P601-PUMP' },
      update: { assetClass: 'PUMP', manufacturer: 'Crompton', model: 'ODP1', status: 'INSTALLED', currentFlId: fls.processPump.id, specifications: { flowM3Hr: 180, pressureBar: 6.2 } },
      create: { assetCode: 'DEMO-P601-PUMP', assetClass: 'PUMP', manufacturer: 'Crompton', model: 'ODP1', status: 'INSTALLED', currentFlId: fls.processPump.id, specifications: { flowM3Hr: 180, pressureBar: 6.2 }, criticality: 'B' },
    }),
    flowMeter: await prisma.asset.upsert({
      where: { assetCode: 'DEMO-FI1501' },
      update: { assetClass: 'INSTRUMENT', manufacturer: 'Emerson', model: 'Daniel', status: 'INSTALLED', currentFlId: fls.flowMeter.id, specifications: { range: '0-5000 SCMH', service: 'Gas To CTF' } },
      create: { assetCode: 'DEMO-FI1501', assetClass: 'INSTRUMENT', manufacturer: 'Emerson', model: 'Daniel', status: 'INSTALLED', currentFlId: fls.flowMeter.id, specifications: { range: '0-5000 SCMH', service: 'Gas To CTF' }, criticality: 'A' },
    }),
  };

  for (const [flKey, asset] of [
    [fls.compressorDriven.id, assets.compressor.id],
    [fls.compressorMotor.id, assets.motor.id],
    [fls.firePump.id, assets.firePump.id],
    [fls.processPump.id, assets.processPump.id],
    [fls.flowMeter.id, assets.flowMeter.id],
  ] as const) {
    await prisma.functionalLocation.update({
      where: { id: flKey },
      data: { currentAssetId: asset },
    });
  }

  for (const install of [
    { id: 'demo-install-comp', assetId: assets.compressor.id, flId: fls.compressorDriven.id, installDate: at(-540) },
    { id: 'demo-install-motor', assetId: assets.motor.id, flId: fls.compressorMotor.id, installDate: at(-540) },
    { id: 'demo-install-fire', assetId: assets.firePump.id, flId: fls.firePump.id, installDate: at(-420) },
    { id: 'demo-install-process', assetId: assets.processPump.id, flId: fls.processPump.id, installDate: at(-365) },
    { id: 'demo-install-meter', assetId: assets.flowMeter.id, flId: fls.flowMeter.id, installDate: at(-280) },
  ]) {
    await prisma.assetInstallation.upsert({
      where: { id: install.id },
      update: install,
      create: install,
    });
  }

  for (const assignment of [
    { flId: fls.compressorMotor.id, assetTag: equipmentTags.compressorMotor, assetType: 'RUNNING_EQUIPMENT', function: 'DRIVER', trainId: 'TRAIN-K101', sequence: 1, position: 'DRIVE_END' },
    { flId: fls.compressorDriven.id, assetTag: equipmentTags.compressor, assetType: 'RUNNING_EQUIPMENT', function: 'DRIVEN', trainId: 'TRAIN-K101', sequence: 2, position: 'DISCHARGE' },
    { flId: fls.fireEngine.id, assetTag: equipmentTags.fireEngine, assetType: 'RUNNING_EQUIPMENT', function: 'DRIVER', trainId: 'TRAIN-P501', sequence: 1, position: 'ENGINE' },
    { flId: fls.firePump.id, assetTag: equipmentTags.firePump, assetType: 'RUNNING_EQUIPMENT', function: 'DRIVEN', trainId: 'TRAIN-P501', sequence: 2, position: 'OUTLET' },
    { flId: fls.processMotor.id, assetTag: equipmentTags.odpMotor, assetType: 'RUNNING_EQUIPMENT', function: 'DRIVER', trainId: 'TRAIN-P601', sequence: 1, position: 'DRIVE_END' },
    { flId: fls.processPump.id, assetTag: equipmentTags.odpPump, assetType: 'RUNNING_EQUIPMENT', function: 'DRIVEN', trainId: 'TRAIN-P601', sequence: 2, position: 'OUTLET' },
    { flId: fls.flowMeter.id, assetTag: instrumentTags.flow1501, assetType: 'INSTRUMENT', function: 'SENSOR', trainId: 'METER-1501', sequence: 1, position: 'OUTLET' },
  ]) {
    await prisma.fLAssetAssignment.upsert({
      where: { flId_assetTag: { flId: assignment.flId, assetTag: assignment.assetTag } },
      update: assignment,
      create: assignment,
    });
  }

  const strategies = {
    compressor: await prisma.maintenanceStrategy.upsert({
      where: { name: 'DEMO Compressor Quarterly PM' },
      update: { assetClass: 'COMPRESSOR', description: 'Quarterly preventive maintenance for utility air compressor', isActive: true },
      create: { name: 'DEMO Compressor Quarterly PM', assetClass: 'COMPRESSOR', description: 'Quarterly preventive maintenance for utility air compressor', isActive: true },
    }),
    firePump: await prisma.maintenanceStrategy.upsert({
      where: { name: 'DEMO Fire Pump Monthly Test' },
      update: { assetClass: 'PUMP', description: 'Monthly fire pump and engine readiness test', isActive: true },
      create: { name: 'DEMO Fire Pump Monthly Test', assetClass: 'PUMP', description: 'Monthly fire pump and engine readiness test', isActive: true },
    }),
    flowMeter: await prisma.maintenanceStrategy.upsert({
      where: { name: 'DEMO Meter Health Verification' },
      update: { assetClass: 'INSTRUMENT', description: 'Routine field verification before due calibration', isActive: true },
      create: { name: 'DEMO Meter Health Verification', assetClass: 'INSTRUMENT', description: 'Routine field verification before due calibration', isActive: true },
    }),
  };

  for (const task of [
    { id: 'demo-task-comp-1', strategyId: strategies.compressor.id, taskCode: 'CHK-LUBE', description: 'Check lubricant quality and top up', sequence: 10, estimatedHours: 1.5, skillRequired: 'MECHANICAL' },
    { id: 'demo-task-comp-2', strategyId: strategies.compressor.id, taskCode: 'CHK-FLTR', description: 'Inspect and replace intake filter', sequence: 20, estimatedHours: 1.2, skillRequired: 'MECHANICAL' },
    { id: 'demo-task-fire-1', strategyId: strategies.firePump.id, taskCode: 'RUN-TEST', description: 'Conduct no-load fire pump test', sequence: 10, estimatedHours: 1.0, skillRequired: 'MECHANICAL' },
    { id: 'demo-task-fire-2', strategyId: strategies.firePump.id, taskCode: 'ENG-CHECK', description: 'Verify diesel engine cranking and fuel level', sequence: 20, estimatedHours: 0.8, skillRequired: 'MECHANICAL' },
    { id: 'demo-task-meter-1', strategyId: strategies.flowMeter.id, taskCode: 'LINE-CHECK', description: 'Inspect impulse lines and fittings', sequence: 10, estimatedHours: 0.5, skillRequired: 'INSTRUMENTATION' },
  ]) {
    await prisma.strategyTask.upsert({
      where: { id: task.id },
      update: task,
      create: task,
    });
  }

  const assignments = {
    compressor: await prisma.maintenancePlanAssignment.upsert({
      where: { flId_strategyId: { flId: fls.compressorDriven.id, strategyId: strategies.compressor.id } },
      update: { triggerType: 'TIME', intervalValue: 90, intervalUnit: 'DAYS', lastDoneDate: at(-50), nextDueDate: at(40), alertLeadDays: 14, isActive: true },
      create: { flId: fls.compressorDriven.id, strategyId: strategies.compressor.id, triggerType: 'TIME', intervalValue: 90, intervalUnit: 'DAYS', lastDoneDate: at(-50), nextDueDate: at(40), alertLeadDays: 14, isActive: true },
    }),
    firePump: await prisma.maintenancePlanAssignment.upsert({
      where: { flId_strategyId: { flId: fls.firePump.id, strategyId: strategies.firePump.id } },
      update: { triggerType: 'TIME', intervalValue: 30, intervalUnit: 'DAYS', lastDoneDate: at(-15), nextDueDate: at(15), alertLeadDays: 7, isActive: true },
      create: { flId: fls.firePump.id, strategyId: strategies.firePump.id, triggerType: 'TIME', intervalValue: 30, intervalUnit: 'DAYS', lastDoneDate: at(-15), nextDueDate: at(15), alertLeadDays: 7, isActive: true },
    }),
    flowMeter: await prisma.maintenancePlanAssignment.upsert({
      where: { flId_strategyId: { flId: fls.flowMeter.id, strategyId: strategies.flowMeter.id } },
      update: { triggerType: 'TIME', intervalValue: 180, intervalUnit: 'DAYS', lastDoneDate: at(-75), nextDueDate: at(105), alertLeadDays: 14, isActive: true },
      create: { flId: fls.flowMeter.id, strategyId: strategies.flowMeter.id, triggerType: 'TIME', intervalValue: 180, intervalUnit: 'DAYS', lastDoneDate: at(-75), nextDueDate: at(105), alertLeadDays: 14, isActive: true },
    }),
  };

  const contract = await prisma.contract.upsert({
    where: { contractNumber: 'DEMO-CMS-2026-001' },
    update: {
      workspaceSlug: 'cms-demo',
      workspaceLabel: 'CMS Contract Workspace',
      title: 'CMS Instrument Maintenance Contract',
      scope: 'Instrument upkeep, contractor reporting, and scoped work order execution support for ANK-GGS-2.',
      workType: 'MAINTENANCE',
      contractorName: 'CMS CONTRACT SERVICES',
      contractorCode: 'CMS-ANK-2026',
      contactPerson: 'N. Srinivasan',
      contactEmail: 'cms.contract@demo.local',
      contactPhone: '+91-9876500111',
      contractValue: 4250000,
      currency: 'INR',
      paymentTerms: 'Monthly RA bills against verified reports',
      startDate: at(-30),
      endDate: addDays(baseDate, 240),
      status: 'ACTIVE',
      externalAccessEnabled: true,
      shareAllInstallations: false,
      shareAllInstrumentTypes: true,
      shareAllEquipmentScopes: false,
      dashboardMode: 'CONTRACT',
      installationId: installation.installationId,
      departmentId: departments.instrumentation.id,
      documentRef: 'CMS/ANK/GGS2/2026/01',
      ongcOfficer: users.instrumentEngineer.username,
      approvedBy: users.hod.username,
      approvalDate: at(-28),
      remarks: 'Demo contractor workspace for CMS external execution.',
      createdBy: admin.username,
    },
    create: {
      id: 'demo-contract-cms',
      contractNumber: 'DEMO-CMS-2026-001',
      workspaceSlug: 'cms-demo',
      workspaceLabel: 'CMS Contract Workspace',
      title: 'CMS Instrument Maintenance Contract',
      scope: 'Instrument upkeep, contractor reporting, and scoped work order execution support for ANK-GGS-2.',
      workType: 'MAINTENANCE',
      contractorName: 'CMS CONTRACT SERVICES',
      contractorCode: 'CMS-ANK-2026',
      contactPerson: 'N. Srinivasan',
      contactEmail: 'cms.contract@demo.local',
      contactPhone: '+91-9876500111',
      contractValue: 4250000,
      currency: 'INR',
      paymentTerms: 'Monthly RA bills against verified reports',
      startDate: at(-30),
      endDate: addDays(baseDate, 240),
      status: 'ACTIVE',
      externalAccessEnabled: true,
      shareAllInstallations: false,
      shareAllInstrumentTypes: true,
      shareAllEquipmentScopes: false,
      dashboardMode: 'CONTRACT',
      installationId: installation.installationId,
      departmentId: departments.instrumentation.id,
      documentRef: 'CMS/ANK/GGS2/2026/01',
      ongcOfficer: users.instrumentEngineer.username,
      approvedBy: users.hod.username,
      approvalDate: at(-28),
      remarks: 'Demo contractor workspace for CMS external execution.',
      createdBy: admin.username,
    },
  });

  await prisma.contractUserAccess.upsert({
    where: { contractId_userId: { contractId: contract.id, userId: users.contractorCoordinator.id } },
    update: { accessRole: 'CONTRACTOR_COORDINATOR', scopeMode: 'CONTRACT', canViewDashboard: true, canCreateRequests: true, canGenerateWorkOrders: true, canSubmitReports: true, canReviewReports: false, canCloseWorkOrders: false, canManageUsers: false, isActive: true, invitedBy: admin.username, activatedAt: at(-25) },
    create: { contractId: contract.id, userId: users.contractorCoordinator.id, accessRole: 'CONTRACTOR_COORDINATOR', scopeMode: 'CONTRACT', canViewDashboard: true, canCreateRequests: true, canGenerateWorkOrders: true, canSubmitReports: true, canReviewReports: false, canCloseWorkOrders: false, canManageUsers: false, isActive: true, invitedBy: admin.username, activatedAt: at(-25) },
  });
  await prisma.contractUserAccess.upsert({
    where: { contractId_userId: { contractId: contract.id, userId: users.contractorTech.id } },
    update: { accessRole: 'CONTRACTOR_TECHNICIAN', scopeMode: 'CONTRACT', canViewDashboard: true, canCreateRequests: false, canGenerateWorkOrders: false, canSubmitReports: true, canReviewReports: false, canCloseWorkOrders: false, canManageUsers: false, isActive: true, invitedBy: users.contractorCoordinator.username, activatedAt: at(-20) },
    create: { contractId: contract.id, userId: users.contractorTech.id, accessRole: 'CONTRACTOR_TECHNICIAN', scopeMode: 'CONTRACT', canViewDashboard: true, canCreateRequests: false, canGenerateWorkOrders: false, canSubmitReports: true, canReviewReports: false, canCloseWorkOrders: false, canManageUsers: false, isActive: true, invitedBy: users.contractorCoordinator.username, activatedAt: at(-20) },
  });
  await prisma.contractUserAccess.upsert({
    where: { contractId_userId: { contractId: contract.id, userId: users.instrumentEngineer.id } },
    update: { accessRole: 'ONGC_REVIEWER', scopeMode: 'HYBRID', canViewDashboard: true, canCreateRequests: true, canGenerateWorkOrders: true, canSubmitReports: false, canReviewReports: true, canCloseWorkOrders: true, canManageUsers: true, isActive: true, invitedBy: admin.username, activatedAt: at(-28) },
    create: { contractId: contract.id, userId: users.instrumentEngineer.id, accessRole: 'ONGC_REVIEWER', scopeMode: 'HYBRID', canViewDashboard: true, canCreateRequests: true, canGenerateWorkOrders: true, canSubmitReports: false, canReviewReports: true, canCloseWorkOrders: true, canManageUsers: true, isActive: true, invitedBy: admin.username, activatedAt: at(-28) },
  });

  await prisma.contractInstallationScope.upsert({
    where: { contractId_installationId: { contractId: contract.id, installationId: installation.id } },
    update: { accessLevel: 'EXECUTE', canRaiseRequests: true, canGenerateWorkOrders: true, canSubmitReports: true },
    create: { contractId: contract.id, installationId: installation.id, accessLevel: 'EXECUTE', canRaiseRequests: true, canGenerateWorkOrders: true, canSubmitReports: true },
  });
  await prisma.contractInstrumentTypeScope.upsert({
    where: { contractId_instrumentType: { contractId: contract.id, instrumentType: 'FLOW_METER' } },
    update: { serviceLine: 'Gas Metering', accessLevel: 'UPDATE', canEditMasterData: false, canSubmitReports: true },
    create: { contractId: contract.id, instrumentType: 'FLOW_METER', serviceLine: 'Gas Metering', accessLevel: 'UPDATE', canEditMasterData: false, canSubmitReports: true },
  });
  await prisma.contractEquipmentScope.upsert({
    where: { contractId_scopeType_scopeValue: { contractId: contract.id, scopeType: 'TAG', scopeValue: equipmentTags.compressor } },
    update: { accessLevel: 'EXECUTE', canEditMasterData: false, canSubmitReports: true },
    create: { contractId: contract.id, scopeType: 'TAG', scopeValue: equipmentTags.compressor, accessLevel: 'EXECUTE', canEditMasterData: false, canSubmitReports: true },
  });
  await prisma.contractFunctionalLocationScope.upsert({
    where: { contractId_flId: { contractId: contract.id, flId: fls.flowMeter.id } },
    update: { accessLevel: 'EXECUTE' },
    create: { contractId: contract.id, flId: fls.flowMeter.id, accessLevel: 'EXECUTE' },
  });
  await prisma.contractMilestone.upsert({
    where: { id: 'demo-contract-milestone-1' },
    update: { contractId: contract.id, title: 'Contract Mobilization Complete', description: 'Deployed technician and reporting pack', dueDate: at(-5), paymentPct: 10, paymentAmt: 425000, status: 'COMPLETED', completedAt: at(-3), remarks: 'Verified by ONGC instrumentation team' },
    create: { id: 'demo-contract-milestone-1', contractId: contract.id, title: 'Contract Mobilization Complete', description: 'Deployed technician and reporting pack', dueDate: at(-5), paymentPct: 10, paymentAmt: 425000, status: 'COMPLETED', completedAt: at(-3), remarks: 'Verified by ONGC instrumentation team' },
  });
  await prisma.contractMilestone.upsert({
    where: { id: 'demo-contract-milestone-2' },
    update: { contractId: contract.id, title: 'Quarterly Meter Health Review', description: 'Submit consolidated condition and calibration compliance summary', dueDate: addDays(baseDate, 12), paymentPct: 15, paymentAmt: 637500, status: 'PENDING', completedAt: null, remarks: 'Demo milestone for dashboard visibility' },
    create: { id: 'demo-contract-milestone-2', contractId: contract.id, title: 'Quarterly Meter Health Review', description: 'Submit consolidated condition and calibration compliance summary', dueDate: addDays(baseDate, 12), paymentPct: 15, paymentAmt: 637500, status: 'PENDING', remarks: 'Demo milestone for dashboard visibility' },
  });
  await prisma.contractDocument.upsert({
    where: { id: 'demo-contract-doc-1' },
    update: { contractId: contract.id, title: 'CMS Scope Summary', docType: 'CONTRACT', originalName: 'demo-cms-scope-summary.txt', storedName: 'demo-cms-scope-summary.txt', filePath: '/app/storage/contracts/demo-cms-scope-summary.txt', fileSize: bytes('CMS contract scope summary demo document.'), mimeType: 'text/plain', uploadedBy: admin.username, uploadedAt: at(-29) },
    create: { id: 'demo-contract-doc-1', contractId: contract.id, title: 'CMS Scope Summary', docType: 'CONTRACT', originalName: 'demo-cms-scope-summary.txt', storedName: 'demo-cms-scope-summary.txt', filePath: '/app/storage/contracts/demo-cms-scope-summary.txt', fileSize: bytes('CMS contract scope summary demo document.'), mimeType: 'text/plain', uploadedBy: admin.username, uploadedAt: at(-29) },
  });

  for (const budget of [
    { departmentId: departments.mechanical.id, fy: '2026-2027', category: 'SPARES', amount: 2800000 },
    { departmentId: departments.instrumentation.id, fy: '2026-2027', category: 'SERVICES', amount: 1650000 },
    { departmentId: departments.workshop.id, fy: '2026-2027', category: 'CAPEX', amount: 950000 },
  ]) {
    await prisma.budget.upsert({
      where: { departmentId_fy_category: { departmentId: budget.departmentId, fy: budget.fy, category: budget.category } },
      update: { amount: budget.amount, isIndicative: false },
      create: budget,
    });
  }

  const procurementCases = [
    {
      id: 'demo-case-compressor',
      title: `${DEMO_PREFIX} Compressor Overhaul Spares`,
      type: 'SPARES',
      currentStage: 'PO Released',
      createdBy: users.procurementOfficer.username,
      vendor: 'Atlas Copco Services',
      vendorCode: 'AC-110',
      prValue: 680000,
      poValue: 725000,
      currency: 'INR',
      prNumber: 'PR/ANK/26041',
      poNumber: 'PO/ANK/26041',
      sanctionFileNumber: 'SAN/MECH/2026/11',
      tenderingFileNumber: 'TEND/MECH/2026/18',
      procurementMethod: 'LIMITED',
      category: 'SPARES',
      value: 725000,
      tag: equipmentTags.compressor,
      processedBy: users.procurementOfficer.username,
      departmentId: departments.mechanical.id,
      equipmentTag: equipmentTags.compressor,
      maintenanceRelated: true,
    },
    {
      id: 'demo-case-cms-service',
      title: `${DEMO_PREFIX} CMS Contract Metering Support`,
      type: 'SERVICES',
      currentStage: 'Tender Floating',
      createdBy: users.procurementOfficer.username,
      vendor: 'CMS CONTRACT SERVICES',
      vendorCode: 'CMS-ANK',
      prValue: 4250000,
      poValue: null,
      currency: 'INR',
      prNumber: 'PR/ANK/26058',
      poNumber: null,
      sanctionFileNumber: 'SAN/INST/2026/22',
      tenderingFileNumber: 'TEND/INST/2026/09',
      procurementMethod: 'OPEN',
      category: 'SERVICES',
      value: 4250000,
      tag: instrumentTags.flow1501,
      processedBy: users.procurementOfficer.username,
      departmentId: departments.instrumentation.id,
      equipmentTag: instrumentTags.flow1501,
      maintenanceRelated: true,
    },
    {
      id: 'demo-case-fire-engine',
      title: `${DEMO_PREFIX} Fire Pump Engine Injector Kit`,
      type: 'PETTY',
      currentStage: 'Receipt',
      createdBy: users.procurementOfficer.username,
      vendor: 'Kirloskar Emergency Systems',
      vendorCode: 'KES-445',
      prValue: 98000,
      poValue: 104500,
      currency: 'INR',
      prNumber: 'PR/ANK/26063',
      poNumber: 'PO/ANK/26063',
      sanctionFileNumber: 'SAN/FIRE/2026/04',
      tenderingFileNumber: null,
      procurementMethod: 'PETTY',
      category: 'SPARES',
      value: 104500,
      tag: equipmentTags.fireEngine,
      processedBy: users.procurementOfficer.username,
      departmentId: departments.mechanical.id,
      equipmentTag: equipmentTags.fireEngine,
      maintenanceRelated: true,
    },
  ];

  for (const entry of procurementCases) {
    await prisma.case.upsert({
      where: { id: entry.id },
      update: entry,
      create: entry,
    });
  }

  for (const comment of [
    { id: 'demo-case-comment-1', caseId: 'demo-case-compressor', userId: users.procurementOfficer.id, content: 'Technical bid cleared and vendor confirmed compressor overhaul kit availability.', timestamp: at(-14), stageSnapshot: 'Technical Evaluation' },
    { id: 'demo-case-comment-2', caseId: 'demo-case-compressor', userId: users.hod.id, content: 'Proceed with order placement before PM window in May.', timestamp: at(-9), stageSnapshot: 'PO Released' },
    { id: 'demo-case-comment-3', caseId: 'demo-case-cms-service', userId: users.instrumentEngineer.id, content: 'Scope aligned with CMS contractor workspace rollout for demo.', timestamp: at(-7), stageSnapshot: 'Tender Floating' },
  ]) {
    await prisma.caseComment.upsert({
      where: { id: comment.id },
      update: comment,
      create: comment,
    });
  }

  const maintenanceRequests = {
    compressor: await prisma.maintenanceRequest.upsert({
      where: { reqNumber: 'DEMO-MR-001' },
      update: {
        title: `${DEMO_PREFIX} Air Compressor A discharge temperature high`,
        description: 'Observed elevated discharge temperature and intermittent vibration spike on compressor A.',
        equipmentTag: equipmentTags.compressor,
        flId: fls.compressorDriven.id,
        installationId: installation.id,
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'CONVERTED',
        requestOrigin: 'CMS_WORKSPACE',
        assetClass: 'RUNNING_EQUIPMENT',
        requestedBy: users.contractorCoordinator.username,
        createdByUserId: users.contractorCoordinator.id,
        contractId: contract.id,
        requestedAt: at(-2, 8, 15),
        approvedBy: users.instrumentEngineer.username,
        approvedAt: at(-2, 9, 10),
        remarks: 'Raised from contractor observation during daily walkdown.',
      },
      create: {
        id: 'demo-mr-compressor',
        reqNumber: 'DEMO-MR-001',
        title: `${DEMO_PREFIX} Air Compressor A discharge temperature high`,
        description: 'Observed elevated discharge temperature and intermittent vibration spike on compressor A.',
        equipmentTag: equipmentTags.compressor,
        flId: fls.compressorDriven.id,
        installationId: installation.id,
        requestType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'CONVERTED',
        requestOrigin: 'CMS_WORKSPACE',
        assetClass: 'RUNNING_EQUIPMENT',
        requestedBy: users.contractorCoordinator.username,
        createdByUserId: users.contractorCoordinator.id,
        contractId: contract.id,
        requestedAt: at(-2, 8, 15),
        approvedBy: users.instrumentEngineer.username,
        approvedAt: at(-2, 9, 10),
        remarks: 'Raised from contractor observation during daily walkdown.',
      },
    }),
    firePump: await prisma.maintenanceRequest.upsert({
      where: { reqNumber: 'DEMO-MR-002' },
      update: {
        title: `${DEMO_PREFIX} Fire pump weekly readiness check`,
        description: 'Schedule functional test and seal inspection for fire pump package.',
        equipmentTag: equipmentTags.firePump,
        flId: fls.firePump.id,
        installationId: installation.id,
        requestType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'PENDING',
        requestOrigin: 'INTERNAL',
        assetClass: 'RUNNING_EQUIPMENT',
        requestedBy: users.fieldSupervisor.username,
        createdByUserId: users.fieldSupervisor.id,
        requestedAt: at(-1, 11, 0),
        remarks: 'Routine weekly readiness verification.',
      },
      create: {
        id: 'demo-mr-fire-pump',
        reqNumber: 'DEMO-MR-002',
        title: `${DEMO_PREFIX} Fire pump weekly readiness check`,
        description: 'Schedule functional test and seal inspection for fire pump package.',
        equipmentTag: equipmentTags.firePump,
        flId: fls.firePump.id,
        installationId: installation.id,
        requestType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'PENDING',
        requestOrigin: 'INTERNAL',
        assetClass: 'RUNNING_EQUIPMENT',
        requestedBy: users.fieldSupervisor.username,
        createdByUserId: users.fieldSupervisor.id,
        requestedAt: at(-1, 11, 0),
        remarks: 'Routine weekly readiness verification.',
      },
    }),
    instrument: await prisma.maintenanceRequest.upsert({
      where: { reqNumber: 'DEMO-MR-003' },
      update: {
        title: `${DEMO_PREFIX} FI-1501 field verification after drift alert`,
        description: 'Calibration drift suspected from meter comparison; perform verification and report.',
        equipmentTag: instrumentTags.flow1501,
        flId: fls.flowMeter.id,
        installationId: installation.id,
        requestType: 'INSPECTION',
        priority: 'HIGH',
        status: 'APPROVED',
        requestOrigin: 'CMS_WORKSPACE',
        assetClass: 'INSTRUMENT',
        requestedBy: users.contractorCoordinator.username,
        createdByUserId: users.contractorCoordinator.id,
        contractId: contract.id,
        requestedAt: at(-3, 9, 0),
        approvedBy: users.instrumentEngineer.username,
        approvedAt: at(-3, 10, 20),
        remarks: 'Supports meter health and calibration history demo.',
      },
      create: {
        id: 'demo-mr-instrument',
        reqNumber: 'DEMO-MR-003',
        title: `${DEMO_PREFIX} FI-1501 field verification after drift alert`,
        description: 'Calibration drift suspected from meter comparison; perform verification and report.',
        equipmentTag: instrumentTags.flow1501,
        flId: fls.flowMeter.id,
        installationId: installation.id,
        requestType: 'INSPECTION',
        priority: 'HIGH',
        status: 'APPROVED',
        requestOrigin: 'CMS_WORKSPACE',
        assetClass: 'INSTRUMENT',
        requestedBy: users.contractorCoordinator.username,
        createdByUserId: users.contractorCoordinator.id,
        contractId: contract.id,
        requestedAt: at(-3, 9, 0),
        approvedBy: users.instrumentEngineer.username,
        approvedAt: at(-3, 10, 20),
        remarks: 'Supports meter health and calibration history demo.',
      },
    }),
  };

  const workOrders = {
    compressor: await prisma.workOrder.upsert({
      where: { woNumber: 'DEMO-WO-001' },
      update: {
        flId: fls.compressorDriven.id,
        assignmentId: assignments.compressor.id,
        woType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        requestOrigin: 'CMS_WORKSPACE',
        executionStage: 'REPORT_SUBMITTED',
        executionUpdatedAt: at(-1, 17, 30),
        contractId: contract.id,
        assignedContractorCompany: 'CMS CONTRACT SERVICES',
        description: 'Inspect compressor element, clean cooler bundle, and validate vibration after load adjustment.',
        scheduledDate: at(-1, 8, 0),
        startDate: at(-1, 9, 15),
        completionDate: null,
        meterReading: 8234,
        labourHours: 10,
        downtime: 2.5,
        remarks: 'Report submitted pending ONGC verification.',
        assignedBy: users.instrumentEngineer.username,
        assignedAt: at(-1, 8, 20),
        createdBy: users.contractorCoordinator.username,
        createdByUserId: users.contractorCoordinator.id,
        maintenanceRequestId: maintenanceRequests.compressor.id,
      },
      create: {
        id: 'demo-wo-compressor',
        woNumber: 'DEMO-WO-001',
        flId: fls.compressorDriven.id,
        assignmentId: assignments.compressor.id,
        woType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        requestOrigin: 'CMS_WORKSPACE',
        executionStage: 'REPORT_SUBMITTED',
        executionUpdatedAt: at(-1, 17, 30),
        contractId: contract.id,
        assignedContractorCompany: 'CMS CONTRACT SERVICES',
        description: 'Inspect compressor element, clean cooler bundle, and validate vibration after load adjustment.',
        scheduledDate: at(-1, 8, 0),
        startDate: at(-1, 9, 15),
        meterReading: 8234,
        labourHours: 10,
        downtime: 2.5,
        remarks: 'Report submitted pending ONGC verification.',
        assignedBy: users.instrumentEngineer.username,
        assignedAt: at(-1, 8, 20),
        createdBy: users.contractorCoordinator.username,
        createdByUserId: users.contractorCoordinator.id,
        maintenanceRequestId: maintenanceRequests.compressor.id,
      },
    }),
    firePump: await prisma.workOrder.upsert({
      where: { woNumber: 'DEMO-WO-002' },
      update: {
        flId: fls.firePump.id,
        assignmentId: assignments.firePump.id,
        woType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'OPEN',
        requestOrigin: 'INTERNAL',
        executionStage: 'ASSIGNED',
        executionUpdatedAt: at(0, 7, 45),
        description: 'Monthly fire pump readiness test and seal inspection.',
        scheduledDate: addDays(baseDate, 2),
        remarks: 'Ready for execution during weekly fire water test window.',
        assignedBy: users.fieldSupervisor.username,
        assignedAt: at(0, 7, 45),
        createdBy: users.fieldSupervisor.username,
        createdByUserId: users.fieldSupervisor.id,
      },
      create: {
        id: 'demo-wo-fire-pump',
        woNumber: 'DEMO-WO-002',
        flId: fls.firePump.id,
        assignmentId: assignments.firePump.id,
        woType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'OPEN',
        requestOrigin: 'INTERNAL',
        executionStage: 'ASSIGNED',
        executionUpdatedAt: at(0, 7, 45),
        description: 'Monthly fire pump readiness test and seal inspection.',
        scheduledDate: addDays(baseDate, 2),
        remarks: 'Ready for execution during weekly fire water test window.',
        assignedBy: users.fieldSupervisor.username,
        assignedAt: at(0, 7, 45),
        createdBy: users.fieldSupervisor.username,
        createdByUserId: users.fieldSupervisor.id,
      },
    }),
    processPump: await prisma.workOrder.upsert({
      where: { woNumber: 'DEMO-WO-003' },
      update: {
        flId: fls.processPump.id,
        assignmentId: assignments.firePump.id,
        woType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'CLOSED',
        requestOrigin: 'INTERNAL',
        executionStage: 'CLOSED',
        executionUpdatedAt: at(-6, 16, 30),
        description: 'ODP-1 pump motor insulation check and coupling alignment.',
        scheduledDate: at(-7, 8, 0),
        startDate: at(-7, 9, 0),
        completionDate: at(-6, 16, 10),
        meterReading: 4110,
        labourHours: 12,
        downtime: 3,
        remarks: 'Completed without abnormal findings.',
        assignedBy: users.fieldSupervisor.username,
        assignedAt: at(-7, 7, 30),
        closedBy: users.hod.username,
        createdBy: users.fieldSupervisor.username,
        createdByUserId: users.fieldSupervisor.id,
      },
      create: {
        id: 'demo-wo-process-pump',
        woNumber: 'DEMO-WO-003',
        flId: fls.processPump.id,
        assignmentId: assignments.firePump.id,
        woType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'CLOSED',
        requestOrigin: 'INTERNAL',
        executionStage: 'CLOSED',
        executionUpdatedAt: at(-6, 16, 30),
        description: 'ODP-1 pump motor insulation check and coupling alignment.',
        scheduledDate: at(-7, 8, 0),
        startDate: at(-7, 9, 0),
        completionDate: at(-6, 16, 10),
        meterReading: 4110,
        labourHours: 12,
        downtime: 3,
        remarks: 'Completed without abnormal findings.',
        assignedBy: users.fieldSupervisor.username,
        assignedAt: at(-7, 7, 30),
        closedBy: users.hod.username,
        createdBy: users.fieldSupervisor.username,
        createdByUserId: users.fieldSupervisor.id,
      },
    }),
  };

  await prisma.maintenanceRequest.update({
    where: { id: maintenanceRequests.compressor.id },
    data: { workOrderId: workOrders.compressor.id },
  });

  for (const checklist of [
    { id: 'demo-wo-checklist-1', workOrderId: workOrders.compressor.id, sequence: 10, taskCode: 'COOLER-CLEAN', description: 'Clean compressor cooler bundle', isCompleted: true, completedBy: users.contractorTech.username, completedAt: at(-1, 13, 10), remarks: 'Deposits removed and airflow restored' },
    { id: 'demo-wo-checklist-2', workOrderId: workOrders.compressor.id, sequence: 20, taskCode: 'VIB-VERIFY', description: 'Verify post-maintenance vibration at full load', isCompleted: true, completedBy: users.contractorTech.username, completedAt: at(-1, 16, 45), remarks: 'Vibration reduced to acceptable range' },
    { id: 'demo-wo-checklist-3', workOrderId: workOrders.firePump.id, sequence: 10, taskCode: 'SEAL-CHECK', description: 'Inspect pump seal and glands', isCompleted: false },
    { id: 'demo-wo-checklist-4', workOrderId: workOrders.processPump.id, sequence: 10, taskCode: 'ALIGNMENT', description: 'Perform coupling alignment check', isCompleted: true, completedBy: 'Rakesh Parmar', completedAt: at(-6, 15, 50), remarks: 'Alignment within tolerance' },
  ]) {
    await prisma.workOrderChecklist.upsert({
      where: { id: checklist.id },
      update: checklist,
      create: checklist,
    });
  }

  for (const member of [
    { id: 'demo-wo-team-1', workOrderId: workOrders.compressor.id, userId: users.contractorCoordinator.id, employeeName: 'N. Srinivasan', designation: 'Contract Coordinator', department: 'Instrumentation', role: 'SUPERVISOR', isContractor: true, companyName: 'CMS CONTRACT SERVICES', startTime: at(-1, 9, 10), endTime: at(-1, 17, 30), hoursWorked: 8.2 },
    { id: 'demo-wo-team-2', workOrderId: workOrders.compressor.id, userId: users.contractorTech.id, employeeName: 'Milan Chauhan', designation: 'Field Technician', department: 'Instrumentation', role: 'CONTRACTOR', isContractor: true, companyName: 'CMS CONTRACT SERVICES', startTime: at(-1, 9, 20), endTime: at(-1, 17, 0), hoursWorked: 7.7 },
    { id: 'demo-wo-team-3', workOrderId: workOrders.processPump.id, employeeId: 'M-1001', employeeName: 'Rakesh Parmar', designation: 'Senior Technician', department: 'Mechanical', role: 'TECHNICIAN', isContractor: false, startTime: at(-7, 9, 0), endTime: at(-6, 16, 10), hoursWorked: 12 },
  ]) {
    await prisma.workOrderTeam.upsert({
      where: { id: member.id },
      update: member,
      create: member,
    });
  }

  for (const log of [
    { id: 'demo-wo-exec-1', workOrderId: workOrders.compressor.id, contractId: contract.id, stage: 'ASSIGNED', previousStage: 'REQUESTED', remarks: 'WO assigned to CMS contractor coordinator', performedById: users.instrumentEngineer.id, performedByName: 'instrument.eng', performedByRole: 'ENGINEER', sourceApp: 'WEB_APP', createdAt: at(-1, 8, 20) },
    { id: 'demo-wo-exec-2', workOrderId: workOrders.compressor.id, contractId: contract.id, stage: 'DEPLOYED', previousStage: 'ASSIGNED', remarks: 'Team mobilized at compressor package', performedById: users.contractorCoordinator.id, performedByName: 'cms.contractor', performedByRole: 'CONTRACTOR_COORDINATOR', sourceApp: 'CONTRACTOR_APP', createdAt: at(-1, 9, 20) },
    { id: 'demo-wo-exec-3', workOrderId: workOrders.compressor.id, contractId: contract.id, stage: 'REPORT_SUBMITTED', previousStage: 'DEPLOYED', remarks: 'Field report and evidence uploaded for review', performedById: users.contractorTech.id, performedByName: 'cms.tech.01', performedByRole: 'CONTRACTOR_TECHNICIAN', sourceApp: 'CONTRACTOR_APP', createdAt: at(-1, 17, 15) },
    { id: 'demo-wo-exec-4', workOrderId: workOrders.processPump.id, stage: 'CLOSED', previousStage: 'WORK_DONE', remarks: 'Closed after PM completion and verification', performedById: users.hod.id, performedByName: 'maintenance.hod', performedByRole: 'HOD', sourceApp: 'WEB_APP', createdAt: at(-6, 16, 30) },
  ]) {
    await prisma.workOrderExecutionLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }

  await prisma.wOAttachment.upsert({
    where: { id: 'demo-wo-attachment-1' },
    update: {
      workOrderId: workOrders.compressor.id,
      fileName: 'demo-compressor-field-report.txt',
      fileUrl: `wo-attachments/${workOrders.compressor.id}/demo-compressor-field-report.txt`,
      fileType: 'DOCUMENT',
      mimeType: 'text/plain',
      fileSize: bytes('Demo compressor field report attachment.'),
      caption: 'Field execution report',
      uploadedBy: users.contractorTech.username,
      uploadedAt: at(-1, 17, 20),
    },
    create: {
      id: 'demo-wo-attachment-1',
      workOrderId: workOrders.compressor.id,
      fileName: 'demo-compressor-field-report.txt',
      fileUrl: `wo-attachments/${workOrders.compressor.id}/demo-compressor-field-report.txt`,
      fileType: 'DOCUMENT',
      mimeType: 'text/plain',
      fileSize: bytes('Demo compressor field report attachment.'),
      caption: 'Field execution report',
      uploadedBy: users.contractorTech.username,
      uploadedAt: at(-1, 17, 20),
    },
  });

  const manpowerByEmployee = new Map(
    (await prisma.manpower.findMany({ where: { employeeId: { in: ['M-1001', 'M-1002', 'I-2001'] } } })).map((item) => [item.employeeId, item]),
  );

  const maintenanceLogs = [
    {
      id: 'demo-maint-log-1',
      date: at(-2),
      installationId: installation.id,
      department: 'Mechanical',
      section: 'Rotating',
      jobType: 'BD',
      reportCriticality: 2,
      equipmentTag: equipmentTags.compressor,
      equipmentTypeName: 'AIR_COMPRESSOR',
      serviceLine: 'RUNNING_EQUIPMENT',
      notificationNo: 'DEMO-ML-001',
      description: 'Attended high discharge temperature and cooler fouling on Air Compressor A.',
      status: 'Closed',
      startTime: at(-2, 9, 10),
      endTime: at(-2, 14, 40),
      durationHours: 5.5,
      remarks: 'Returned to service after cooler cleaning and coupling check.',
      bdReportTime: at(-2, 8, 30),
      teamReportTime: at(-2, 9, 5),
      jobCompletionTime: at(-2, 14, 30),
      createdBy: DEMO_USER,
      teamIds: ['M-1001', 'M-1002'],
    },
    {
      id: 'demo-maint-log-2',
      date: at(-5),
      installationId: installation.id,
      department: 'Mechanical',
      section: 'Utilities',
      jobType: 'PM',
      reportCriticality: 1,
      equipmentTag: equipmentTags.firePump,
      equipmentTypeName: 'FIRE_PUMP',
      serviceLine: 'RUNNING_EQUIPMENT',
      notificationNo: 'DEMO-ML-002',
      description: 'Performed weekly fire pump readiness run and seal inspection.',
      status: 'Closed',
      startTime: at(-5, 10, 0),
      endTime: at(-5, 11, 15),
      durationHours: 1.25,
      remarks: 'No leakage or abnormal vibration observed.',
      createdBy: DEMO_USER,
      teamIds: ['M-1002'],
    },
    {
      id: 'demo-maint-log-3',
      date: at(-3),
      installationId: installation.id,
      department: 'Instrumentation',
      section: 'Calibration',
      jobType: 'PM',
      reportCriticality: 2,
      equipmentTag: instrumentTags.flow1501,
      equipmentTypeName: 'FLOW_METER',
      serviceLine: 'INSTRUMENT',
      notificationNo: 'DEMO-ML-003',
      description: 'Impulse line check and pre-calibration verification for FI-1501-2.',
      status: 'Closed',
      startTime: at(-3, 11, 0),
      endTime: at(-3, 12, 30),
      durationHours: 1.5,
      remarks: 'Meter ready for scheduled calibration and history review.',
      createdBy: DEMO_USER,
      teamIds: ['I-2001'],
    },
  ];

  for (const item of maintenanceLogs) {
    await prisma.maintenanceLog.upsert({
      where: { id: item.id },
      update: {
        date: item.date,
        installationId: item.installationId,
        department: item.department,
        section: item.section,
        jobType: item.jobType,
        reportCriticality: item.reportCriticality,
        equipmentTag: item.equipmentTag,
        equipmentTypeName: item.equipmentTypeName,
        serviceLine: item.serviceLine,
        notificationNo: item.notificationNo,
        description: item.description,
        status: item.status,
        startTime: item.startTime,
        endTime: item.endTime,
        durationHours: item.durationHours,
        remarks: item.remarks,
        bdReportTime: item.bdReportTime,
        teamReportTime: item.teamReportTime,
        jobCompletionTime: item.jobCompletionTime,
        createdBy: item.createdBy,
      },
      create: {
        id: item.id,
        date: item.date,
        installationId: item.installationId,
        department: item.department,
        section: item.section,
        jobType: item.jobType,
        reportCriticality: item.reportCriticality,
        equipmentTag: item.equipmentTag,
        equipmentTypeName: item.equipmentTypeName,
        serviceLine: item.serviceLine,
        notificationNo: item.notificationNo,
        description: item.description,
        status: item.status,
        startTime: item.startTime,
        endTime: item.endTime,
        durationHours: item.durationHours,
        remarks: item.remarks,
        bdReportTime: item.bdReportTime,
        teamReportTime: item.teamReportTime,
        jobCompletionTime: item.jobCompletionTime,
        createdBy: item.createdBy,
      },
    });

    for (const employeeId of item.teamIds) {
      const manpower = manpowerByEmployee.get(employeeId);
      if (!manpower) continue;
      await prisma.maintenanceLogTeam.upsert({
        where: { maintenanceLogId_manpowerId: { maintenanceLogId: item.id, manpowerId: manpower.id } },
        update: {},
        create: { maintenanceLogId: item.id, manpowerId: manpower.id },
      });
    }
  }

  await ensureOperationalCatalog(prisma);
  const metricIdMap = new Map(
    (await prisma.operationalMetricDefinition.findMany()).map((metric) => [metric.code, metric.id]),
  );

  const equipmentLogSeeds = [
    { id: 'demo-eqlog-comp-1', date: dayOnly(-6), shift: 'DAY', equipmentTag: equipmentTags.compressor, runStatus: true, totalRunHours: 20, cumulativeMeterReading: 8120, parameters: { dischargeTemp: 96, vibration: 7.4 }, remarks: `${DEMO_PREFIX} Compressor daily run log` },
    { id: 'demo-eqlog-comp-2', date: dayOnly(-5), shift: 'DAY', equipmentTag: equipmentTags.compressor, runStatus: true, totalRunHours: 22, cumulativeMeterReading: 8142, parameters: { dischargeTemp: 93, vibration: 6.8 }, remarks: `${DEMO_PREFIX} Compressor daily run log` },
    { id: 'demo-eqlog-comp-3', date: dayOnly(-4), shift: 'DAY', equipmentTag: equipmentTags.compressor, runStatus: false, totalRunHours: 18, cumulativeMeterReading: 8160, parameters: { dischargeTemp: 102, vibration: 8.1 }, remarks: `${DEMO_PREFIX} Compressor daily run log` },
    { id: 'demo-eqlog-comp-4', date: dayOnly(-3), shift: 'DAY', equipmentTag: equipmentTags.compressor, runStatus: true, totalRunHours: 21, cumulativeMeterReading: 8181, parameters: { dischargeTemp: 90, vibration: 6.2 }, remarks: `${DEMO_PREFIX} Compressor daily run log` },
    { id: 'demo-eqlog-pump-1', date: dayOnly(-4), shift: 'DAY', equipmentTag: equipmentTags.firePump, runStatus: true, totalRunHours: 1.2, cumulativeMeterReading: 332, parameters: { dischargePressure: 10.9, vibration: 3.1 }, remarks: `${DEMO_PREFIX} Fire pump readiness log` },
    { id: 'demo-eqlog-odp-1', date: dayOnly(-6), shift: 'DAY', equipmentTag: equipmentTags.odpPump, runStatus: true, totalRunHours: 18, cumulativeMeterReading: 4025, parameters: { flowRate: 170, vibration: 4.2 }, remarks: `${DEMO_PREFIX} Process pump run log` },
  ];

  for (const log of equipmentLogSeeds) {
    await prisma.equipmentLog.upsert({
      where: { id: log.id },
      update: {
        date: log.date,
        shift: log.shift,
        equipmentTag: log.equipmentTag,
        runStatus: log.runStatus,
        startTime: addDays(log.date, 0),
        stopTime: addDays(log.date, 0),
        totalRunHours: log.totalRunHours,
        cumulativeMeterReading: log.cumulativeMeterReading,
        parameters: log.parameters,
        remarks: log.remarks,
        assignedBy: 'Operations',
      },
      create: {
        ...log,
        startTime: addDays(log.date, 0),
        stopTime: addDays(log.date, 0),
        assignedBy: 'Operations',
      },
    });
  }

  const operationalLogs = [
    {
      key: 'comp-day-1',
      logDate: dayOnly(-6),
      shift: 'DAY',
      installationId: installation.id,
      equipmentTag: equipmentTags.compressor,
      runtimeHours: 20,
      downtimeHours: 1,
      standbyHours: 3,
      cumulativeHours: 8120,
      operatingState: 'RUNNING',
      availabilityStatus: 'AVAILABLE',
      profileCode: 'COMPRESSOR_STANDARD',
      enteredBy: users.contractorCoordinator.username,
      reviewedBy: users.instrumentEngineer.username,
      approvedBy: users.instrumentEngineer.username,
      remarks: `${DEMO_PREFIX} Compressor performance stable with minor vibration warning.`,
      qualityScore: 94,
      metrics: getMetricPayload({
        runtime_hours: 20,
        downtime_hours: 1,
        suction_pressure: 1.3,
        discharge_pressure: 8.2,
        suction_temp: 34,
        discharge_temp: 95,
        oil_pressure: 4.4,
        vibration: 7.4,
        load_pct: 84,
        flow_rate: 1420,
      }),
    },
    {
      key: 'comp-day-2',
      logDate: dayOnly(-5),
      shift: 'DAY',
      installationId: installation.id,
      equipmentTag: equipmentTags.compressor,
      runtimeHours: 22,
      downtimeHours: 0.5,
      standbyHours: 1.5,
      cumulativeHours: 8142,
      operatingState: 'RUNNING',
      availabilityStatus: 'AVAILABLE',
      profileCode: 'COMPRESSOR_STANDARD',
      enteredBy: users.contractorCoordinator.username,
      reviewedBy: users.instrumentEngineer.username,
      approvedBy: users.instrumentEngineer.username,
      remarks: `${DEMO_PREFIX} Compressor recovered after cooler cleaning plan.`,
      qualityScore: 96,
      metrics: getMetricPayload({
        runtime_hours: 22,
        downtime_hours: 0.5,
        suction_pressure: 1.2,
        discharge_pressure: 8.1,
        suction_temp: 33,
        discharge_temp: 92,
        oil_pressure: 4.5,
        vibration: 6.8,
        load_pct: 82,
        flow_rate: 1455,
      }),
    },
    {
      key: 'fire-day-1',
      logDate: dayOnly(-4),
      shift: 'DAY',
      installationId: installation.id,
      equipmentTag: equipmentTags.firePump,
      runtimeHours: 1.2,
      downtimeHours: 0,
      standbyHours: 22.8,
      cumulativeHours: 332,
      operatingState: 'STANDBY',
      availabilityStatus: 'AVAILABLE',
      profileCode: 'PUMP_STANDARD',
      enteredBy: users.fieldSupervisor.username,
      reviewedBy: users.hod.username,
      approvedBy: users.hod.username,
      remarks: `${DEMO_PREFIX} Fire pump run test completed successfully.`,
      qualityScore: 98,
      metrics: getMetricPayload({
        runtime_hours: 1.2,
        suction_pressure: 0.4,
        discharge_pressure: 10.9,
        flow_rate: 410,
        bearing_temp: 62,
        vibration: 3.1,
      }),
    },
    {
      key: 'odp-day-1',
      logDate: dayOnly(-6),
      shift: 'DAY',
      installationId: installation.id,
      equipmentTag: equipmentTags.odpPump,
      runtimeHours: 18,
      downtimeHours: 2,
      standbyHours: 4,
      cumulativeHours: 4025,
      operatingState: 'RUNNING',
      availabilityStatus: 'DEGRADED',
      profileCode: 'PUMP_STANDARD',
      enteredBy: users.fieldSupervisor.username,
      reviewedBy: users.hod.username,
      approvedBy: users.hod.username,
      remarks: `${DEMO_PREFIX} ODP pump shows elevated vibration, PM completed next day.`,
      qualityScore: 88,
      metrics: getMetricPayload({
        runtime_hours: 18,
        downtime_hours: 2,
        suction_pressure: 1.1,
        discharge_pressure: 6.0,
        flow_rate: 170,
        bearing_temp: 76,
        vibration: 4.2,
      }),
    },
  ];

  const createdOperationalLogs: Record<string, string> = {};
  for (const log of operationalLogs) {
    const created = await upsertOperationalLog({
      ...log,
      metrics: log.metrics as Array<{ code: string; value: number | string | boolean }>,
      metricIdMap,
    });
    createdOperationalLogs[log.key] = created.id;
  }

  for (const compression of [
    { date: dayOnly(-6), shift: 'DAY', compressorId: equipmentTags.compressor, operationalLogId: createdOperationalLogs['comp-day-1'], inputGasVolume: 15200, outputGasVolume: 14780, fuelGasVolume: 210, gasCompressed: 14780, runHours: 20, flowRate: 1420, suctionPressure: 1.3, dischargePressure: 8.2, suctionTemp: 34, dischargeTemp: 95, lubeOilPressure: 4.4, lubeOilTemp: 63, jacketWaterTemp: 71, vibration: 7.4, loadPct: 84, efficiencyPct: 91.2, tripCount: 0, remarks: `${DEMO_PREFIX} Compressor throughput log` },
    { date: dayOnly(-5), shift: 'DAY', compressorId: equipmentTags.compressor, operationalLogId: createdOperationalLogs['comp-day-2'], inputGasVolume: 15850, outputGasVolume: 15320, fuelGasVolume: 205, gasCompressed: 15320, runHours: 22, flowRate: 1455, suctionPressure: 1.2, dischargePressure: 8.1, suctionTemp: 33, dischargeTemp: 92, lubeOilPressure: 4.5, lubeOilTemp: 61, jacketWaterTemp: 70, vibration: 6.8, loadPct: 82, efficiencyPct: 92.5, tripCount: 0, remarks: `${DEMO_PREFIX} Compressor throughput log` },
  ]) {
    await prisma.gasCompressionLog.upsert({
      where: {
        date_shift_compressorId: {
          date: compression.date,
          shift: compression.shift,
          compressorId: compression.compressorId,
        },
      },
      update: {
        sourceMode: 'HYBRID',
        installationId: installation.id,
        operationalLogId: compression.operationalLogId,
        inputGasVolume: compression.inputGasVolume,
        outputGasVolume: compression.outputGasVolume,
        fuelGasVolume: compression.fuelGasVolume,
        gasCompressed: compression.gasCompressed,
        runHours: compression.runHours,
        flowRate: compression.flowRate,
        suctionPressure: compression.suctionPressure,
        dischargePressure: compression.dischargePressure,
        suctionTemp: compression.suctionTemp,
        dischargeTemp: compression.dischargeTemp,
        lubeOilPressure: compression.lubeOilPressure,
        lubeOilTemp: compression.lubeOilTemp,
        jacketWaterTemp: compression.jacketWaterTemp,
        vibration: compression.vibration,
        loadPct: compression.loadPct,
        efficiencyPct: compression.efficiencyPct,
        tripCount: compression.tripCount,
        remarks: compression.remarks,
      },
      create: {
        id: `demo-gas-log-${compression.shift.toLowerCase()}-${compression.date.toISOString().slice(0, 10)}`,
        date: compression.date,
        shift: compression.shift,
        sourceMode: 'HYBRID',
        compressorId: compression.compressorId,
        installationId: installation.id,
        operationalLogId: compression.operationalLogId,
        inputGasVolume: compression.inputGasVolume,
        outputGasVolume: compression.outputGasVolume,
        fuelGasVolume: compression.fuelGasVolume,
        gasCompressed: compression.gasCompressed,
        runHours: compression.runHours,
        flowRate: compression.flowRate,
        suctionPressure: compression.suctionPressure,
        dischargePressure: compression.dischargePressure,
        suctionTemp: compression.suctionTemp,
        dischargeTemp: compression.dischargeTemp,
        lubeOilPressure: compression.lubeOilPressure,
        lubeOilTemp: compression.lubeOilTemp,
        jacketWaterTemp: compression.jacketWaterTemp,
        vibration: compression.vibration,
        loadPct: compression.loadPct,
        efficiencyPct: compression.efficiencyPct,
        tripCount: compression.tripCount,
        remarks: compression.remarks,
      },
    });
  }

  const calEvent1501 = await upsertCalibrationEvent({
    id: 'demo-cal-event-1501',
    certificateNo: 'DEMO-CAL-1501-001',
    instrumentTagId: instrumentTags.flow1501,
    standardUsedId: standards.flowStandard.tagId,
    calibrationDate: at(-32, 11, 0),
    previousCalDate: at(-395, 10, 0),
    nextDueDate: addDays(baseDate, 333),
    performedBy: 'Arvind Patel',
    approvedBy: users.instrumentEngineer.username,
    remarks: 'Adjusted pulse factor after minor positive drift.',
    maxErrorFoundPct: 1.35,
    maxErrorLeftPct: 0.22,
    overallResultAsFound: 'FAIL',
    overallResultAsLeft: 'PASS',
    points: [
      { id: 'demo-cal-1501-point-1', sequence: 1, stepPercent: 0, inputApplied: 0, expectedReading: 0, asFoundReading: 20, asLeftReading: 0 },
      { id: 'demo-cal-1501-point-2', sequence: 2, stepPercent: 25, inputApplied: 1250, expectedReading: 1250, asFoundReading: 1268, asLeftReading: 1254 },
      { id: 'demo-cal-1501-point-3', sequence: 3, stepPercent: 50, inputApplied: 2500, expectedReading: 2500, asFoundReading: 2532, asLeftReading: 2504 },
      { id: 'demo-cal-1501-point-4', sequence: 4, stepPercent: 75, inputApplied: 3750, expectedReading: 3750, asFoundReading: 3791, asLeftReading: 3755 },
      { id: 'demo-cal-1501-point-5', sequence: 5, stepPercent: 100, inputApplied: 5000, expectedReading: 5000, asFoundReading: 5060, asLeftReading: 5008 },
    ],
  });
  const calEvent1371 = await upsertCalibrationEvent({
    id: 'demo-cal-event-1371',
    certificateNo: 'DEMO-CAL-1371-001',
    instrumentTagId: instrumentTags.flow1371,
    standardUsedId: standards.flowStandard.tagId,
    calibrationDate: at(-74, 12, 0),
    previousCalDate: at(-420, 12, 0),
    nextDueDate: addDays(baseDate, 290),
    performedBy: 'Deepak Rana',
    approvedBy: users.instrumentEngineer.username,
    remarks: 'Within tolerance; no adjustment required.',
    maxErrorFoundPct: 0.42,
    maxErrorLeftPct: 0.42,
    overallResultAsFound: 'PASS',
    overallResultAsLeft: 'PASS',
    points: [
      { id: 'demo-cal-1371-point-1', sequence: 1, stepPercent: 0, inputApplied: 0, expectedReading: 0, asFoundReading: 0, asLeftReading: 0 },
      { id: 'demo-cal-1371-point-2', sequence: 2, stepPercent: 25, inputApplied: 625, expectedReading: 625, asFoundReading: 627, asLeftReading: 627 },
      { id: 'demo-cal-1371-point-3', sequence: 3, stepPercent: 50, inputApplied: 1250, expectedReading: 1250, asFoundReading: 1252, asLeftReading: 1252 },
      { id: 'demo-cal-1371-point-4', sequence: 4, stepPercent: 75, inputApplied: 1875, expectedReading: 1875, asFoundReading: 1877, asLeftReading: 1877 },
      { id: 'demo-cal-1371-point-5', sequence: 5, stepPercent: 100, inputApplied: 2500, expectedReading: 2500, asFoundReading: 2506, asLeftReading: 2506 },
    ],
  });

  for (const history of [
    { id: 'demo-unified-1501-internal', instrumentTagId: instrumentTags.flow1501, calDate: calEvent1501.calibrationDate, resultStatus: 'PASS', sourceSystem: 'INTERNAL', internalEventId: calEvent1501.id, performedBy: calEvent1501.performedBy, maxError: calEvent1501.maxErrorLeftPct },
    { id: 'demo-unified-1371-internal', instrumentTagId: instrumentTags.flow1371, calDate: calEvent1371.calibrationDate, resultStatus: 'PASS', sourceSystem: 'INTERNAL', internalEventId: calEvent1371.id, performedBy: calEvent1371.performedBy, maxError: calEvent1371.maxErrorLeftPct },
    { id: 'demo-unified-1502-auto', instrumentTagId: instrumentTags.flow1502, calDate: at(-18, 15, 0), resultStatus: 'PASS', sourceSystem: 'AUTOMATED', externalCertRef: 'DEMO-AUTO-1502-001', externalPdfLink: '/external/demo-1502-auto.pdf', performedBy: 'Beamex Sync', maxError: 0.18 },
  ]) {
    await prisma.unifiedCalibrationHistory.upsert({
      where: { id: history.id },
      update: history,
      create: history,
    });
  }

  for (const log of [
    {
      id: 'demo-cal-log-1501',
      instrumentTagId: instrumentTags.flow1501,
      masterStdId: standards.flowStandard.tagId,
      lastCalDate: at(-395, 10, 0),
      currentCalDate: calEvent1501.calibrationDate,
      nextDueDate: calEvent1501.nextDueDate,
      result: 'PASS',
      performedBy: calEvent1501.performedBy,
      reportFileUrl: '/reports/DEMO-CAL-1501-001.pdf',
      fivePointData: { result: 'Adjusted and passed', certificateNo: calEvent1501.certificateNo },
    },
    {
      id: 'demo-cal-log-1371',
      instrumentTagId: instrumentTags.flow1371,
      masterStdId: standards.flowStandard.tagId,
      lastCalDate: at(-420, 12, 0),
      currentCalDate: calEvent1371.calibrationDate,
      nextDueDate: calEvent1371.nextDueDate,
      result: 'PASS',
      performedBy: calEvent1371.performedBy,
      reportFileUrl: '/reports/DEMO-CAL-1371-001.pdf',
      fivePointData: { result: 'As found passed', certificateNo: calEvent1371.certificateNo },
    },
  ]) {
    await prisma.calibrationLog.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }

  for (const report of [
    {
      id: 'demo-contract-report-1',
      contractId: contract.id,
      workOrderId: workOrders.compressor.id,
      maintenanceRequestId: maintenanceRequests.compressor.id,
      installationId: installation.id,
      assetClass: 'RUNNING_EQUIPMENT',
      assetTag: equipmentTags.compressor,
      runningEquipmentTag: equipmentTags.compressor,
      reportType: 'COMPLETION',
      reportStatus: 'SUBMITTED',
      severity: 'HIGH',
      title: `${DEMO_PREFIX} Compressor A corrective work completion report`,
      summary: 'Cooler cleaned, vibration reduced, and discharge temperature normalized.',
      findings: { coolerCondition: 'Fouled', beltCondition: 'Acceptable', vibrationBefore: 8.1, vibrationAfter: 6.2 },
      measurements: { dischargeTempBefore: 102, dischargeTempAfter: 92, runtimeVerifiedHours: 22 },
      recommendations: 'Monitor vibration for next 3 days and align PM filter replacement with next shutdown.',
      actionTaken: 'Cooler cleaning and load adjustment',
      evidence: [{ file: 'demo-compressor-field-report.txt', caption: 'Field work summary' }],
      submittedById: users.contractorTech.id,
      reviewedById: users.instrumentEngineer.id,
      submittedAt: at(-1, 17, 20),
      sourceApp: 'CONTRACTOR_APP',
    },
    {
      id: 'demo-contract-report-2',
      contractId: contract.id,
      maintenanceRequestId: maintenanceRequests.instrument.id,
      installationId: installation.id,
      assetClass: 'INSTRUMENT',
      assetTag: instrumentTags.flow1501,
      instrumentTagId: instrumentTags.flow1501,
      reportType: 'INSPECTION',
      reportStatus: 'APPROVED',
      severity: 'MEDIUM',
      title: `${DEMO_PREFIX} FI-1501-2 condition verification report`,
      summary: 'Meter remains fit for service after drift correction and impulse line cleanup.',
      findings: { impulseLineCondition: 'Cleaned', transmitterHealth: 'Good', certificateReference: calEvent1501.certificateNo },
      measurements: { lastCalibrationError: 0.22, linePressureBar: 6.8, flowObservedSCMH: 3120 },
      recommendations: 'Continue quarterly health verification under CMS workspace.',
      actionTaken: 'Inspection and follow-up calibration review',
      evidence: [{ certificateNo: calEvent1501.certificateNo }],
      submittedById: users.contractorCoordinator.id,
      reviewedById: users.instrumentEngineer.id,
      submittedAt: at(-2, 18, 0),
      reviewedAt: at(-1, 9, 30),
      sourceApp: 'CONTRACTOR_APP',
    },
  ]) {
    await prisma.contractorReport.upsert({
      where: { id: report.id },
      update: report,
      create: report,
    });
  }

  for (const training of [
    {
      id: 'demo-training-1',
      installationId: installation.id,
      trainingType: 'TECHNICAL',
      title: `${DEMO_PREFIX} Compressor Reliability Refresher`,
      description: 'Condition monitoring basics and response workflow for rotating equipment.',
      trainerName: 'R. Venkatesh',
      startDate: at(-12, 10, 0),
      endDate: at(-12, 15, 0),
      durationHours: 5,
      venue: 'ANK-GGS-2 Control Room',
      maxAttendees: 20,
      status: 'COMPLETED',
      remarks: 'Hands-on session linked to current compressor corrective trends.',
      createdBy: DEMO_USER,
    },
    {
      id: 'demo-training-2',
      installationId: installation.id,
      trainingType: 'HSE',
      title: `${DEMO_PREFIX} Contractor Work Permit Orientation`,
      description: 'Mandatory orientation for external workforce using CMS workspace.',
      trainerName: 'Safety Cell',
      startDate: addDays(baseDate, 4),
      endDate: addDays(baseDate, 4),
      durationHours: 3,
      venue: 'Training Hall',
      maxAttendees: 15,
      status: 'SCHEDULED',
      remarks: 'Supports contractor mini-app rollout.',
      createdBy: DEMO_USER,
    },
  ]) {
    await prisma.trainingRecord.upsert({
      where: { id: training.id },
      update: training,
      create: training,
    });
  }

  for (const attendee of [
    { id: 'demo-attendee-1', trainingId: 'demo-training-1', employeeId: 'M-1001', employeeName: 'Rakesh Parmar', department: 'Mechanical', attended: true, score: 86, certified: true, feedback: 'Useful compressor case study.' },
    { id: 'demo-attendee-2', trainingId: 'demo-training-1', employeeId: 'I-2001', employeeName: 'Ketan Shah', department: 'Instrumentation', attended: true, score: 91, certified: true, feedback: 'Helped align reporting with calibration workflow.' },
    { id: 'demo-attendee-3', trainingId: 'demo-training-2', employeeId: 'CMS-01', employeeName: 'Milan Chauhan', department: 'Contractor', attended: false, certified: false },
  ]) {
    await prisma.trainingAttendee.upsert({
      where: { id: attendee.id },
      update: attendee,
      create: attendee,
    });
  }

  for (let offset = -6; offset <= 0; offset += 1) {
    await prisma.dailyEnergyLog.upsert({
      where: { installationId_date: { installationId: installation.id, date: dayOnly(offset) } },
      update: {
        fuelType: 'DIESEL',
        fuelQuantity: 120 + offset * -2,
        fuelUnit: 'LITERS',
        fuelCost: 11800 + offset * -150,
        electricityKwh: 840 + offset * -12,
        electricityCost: 6720 + offset * -96,
        generatorHours: offset === -3 ? 2.5 : 0,
        remarks: `${DEMO_PREFIX} Daily energy entry`,
        loggedBy: users.fieldSupervisor.username,
      },
      create: {
        installationId: installation.id,
        date: dayOnly(offset),
        fuelType: 'DIESEL',
        fuelQuantity: 120 + offset * -2,
        fuelUnit: 'LITERS',
        fuelCost: 11800 + offset * -150,
        electricityKwh: 840 + offset * -12,
        electricityCost: 6720 + offset * -96,
        generatorHours: offset === -3 ? 2.5 : 0,
        remarks: `${DEMO_PREFIX} Daily energy entry`,
        loggedBy: users.fieldSupervisor.username,
      },
    });
  }

  await prisma.monthlyElectricityBill.upsert({
    where: { installationId_month_year: { installationId: installation.id, month: baseDate.getMonth() + 1, year: baseDate.getFullYear() } },
    update: {
      unitsConsumed: 24850,
      demandKva: 112,
      billAmount: 186400,
      taxAmount: 22368,
      totalAmount: 208768,
      billNumber: 'MSEB/ANK/042026/118',
      billDate: at(-8),
      dueDate: addDays(baseDate, 7),
      status: 'PENDING',
      remarks: `${DEMO_PREFIX} Current month bill`,
      createdBy: users.procurementOfficer.username,
    },
    create: {
      installationId: installation.id,
      month: baseDate.getMonth() + 1,
      year: baseDate.getFullYear(),
      unitsConsumed: 24850,
      demandKva: 112,
      billAmount: 186400,
      taxAmount: 22368,
      totalAmount: 208768,
      billNumber: 'MSEB/ANK/042026/118',
      billDate: at(-8),
      dueDate: addDays(baseDate, 7),
      status: 'PENDING',
      remarks: `${DEMO_PREFIX} Current month bill`,
      createdBy: users.procurementOfficer.username,
    },
  });

  for (const job of [
    { id: 'demo-workshop-1', jobNumber: 'WS-DEMO-001', shopType: 'MACHINE', installationId: installation.id, title: `${DEMO_PREFIX} Compressor cooler frame repair`, description: 'Repair minor corrosion on cooler support frame before next PM outage.', requestedBy: users.fieldSupervisor.username, requestDate: at(-4), priority: 'HIGH', estimatedHours: 10, actualHours: 8, materialCost: 12000, laborCost: 8600, totalCost: 20600, status: 'COMPLETED', assignedTo: 'Workshop Team A', startDate: at(-3, 9, 0), completedDate: at(-2, 17, 0), equipmentTag: equipmentTags.compressor, workOrderRef: workOrders.compressor.woNumber, remarks: 'Fabrication completed and fitted during outage.', createdBy: DEMO_USER },
    { id: 'demo-workshop-2', jobNumber: 'WS-DEMO-002', shopType: 'ELECTRICAL', installationId: installation.id, title: `${DEMO_PREFIX} Fire pump starter panel inspection`, description: 'Inspect starter panel and replace worn-out cable lugs.', requestedBy: users.fieldSupervisor.username, requestDate: at(-1), priority: 'NORMAL', estimatedHours: 4, actualHours: null, materialCost: 3500, laborCost: null, totalCost: null, status: 'IN_PROGRESS', assignedTo: 'Electrical Cell', equipmentTag: equipmentTags.firePump, createdBy: DEMO_USER },
  ]) {
    await prisma.workshopJob.upsert({
      where: { jobNumber: job.jobNumber },
      update: job,
      create: job,
    });
  }

  await prisma.mOHRecord.upsert({
    where: { mohNumber: 'MOH-DEMO-001' },
    update: {
      installationId: installation.id,
      equipmentId: assets.processPump.id,
      equipmentTag: equipmentTags.odpPump,
      equipmentName: 'ODP-1 Pump',
      lastMOHDate: at(-410),
      currentRunHours: 4025,
      dCheckInterval: 5000,
      nextMOHDue: addDays(baseDate, 60),
      status: 'PLANNED',
      priority: 'HIGH',
      plannedStartDate: addDays(baseDate, 30),
      estimatedCost: 650000,
      procurementCaseId: 'demo-case-compressor',
      workOrderId: workOrders.processPump.id,
      scopeOfWork: 'Seal replacement, bearing check, and shaft run-out measurement.',
      findings: 'Vibration increasing slowly over last 60 days.',
      actionsTaken: 'Detailed planning initiated.',
      assignedTo: users.hod.username,
      createdBy: DEMO_USER,
    },
    create: {
      id: 'demo-moh-1',
      mohNumber: 'MOH-DEMO-001',
      installationId: installation.id,
      equipmentId: assets.processPump.id,
      equipmentTag: equipmentTags.odpPump,
      equipmentName: 'ODP-1 Pump',
      lastMOHDate: at(-410),
      currentRunHours: 4025,
      dCheckInterval: 5000,
      nextMOHDue: addDays(baseDate, 60),
      status: 'PLANNED',
      priority: 'HIGH',
      plannedStartDate: addDays(baseDate, 30),
      estimatedCost: 650000,
      procurementCaseId: 'demo-case-compressor',
      workOrderId: workOrders.processPump.id,
      scopeOfWork: 'Seal replacement, bearing check, and shaft run-out measurement.',
      findings: 'Vibration increasing slowly over last 60 days.',
      actionsTaken: 'Detailed planning initiated.',
      assignedTo: users.hod.username,
      createdBy: DEMO_USER,
    },
  });

  await prisma.discussion.upsert({
    where: { id: 'demo-discussion-1' },
    update: {
      title: `${DEMO_PREFIX} Compressor reliability follow-up`,
      content: 'Should we shift cooler cleaning to a monthly condition-based trigger based on discharge temperature trend?',
      category: 'TECHNICAL',
      authorId: users.instrumentEngineer.id,
      authorName: users.instrumentEngineer.username,
      isPinned: true,
      viewCount: 32,
    },
    create: {
      id: 'demo-discussion-1',
      title: `${DEMO_PREFIX} Compressor reliability follow-up`,
      content: 'Should we shift cooler cleaning to a monthly condition-based trigger based on discharge temperature trend?',
      category: 'TECHNICAL',
      authorId: users.instrumentEngineer.id,
      authorName: users.instrumentEngineer.username,
      isPinned: true,
      viewCount: 32,
    },
  });
  await prisma.discussionReply.upsert({
    where: { id: 'demo-discussion-reply-1' },
    update: { discussionId: 'demo-discussion-1', content: 'Yes, the demo operations log now has enough temperature history to justify it.', authorId: users.hod.id, authorName: users.hod.username },
    create: { id: 'demo-discussion-reply-1', discussionId: 'demo-discussion-1', content: 'Yes, the demo operations log now has enough temperature history to justify it.', authorId: users.hod.id, authorName: users.hod.username },
  });
  await prisma.discussionReply.upsert({
    where: { id: 'demo-discussion-reply-2' },
    update: { discussionId: 'demo-discussion-1', content: 'Contractor report can also include cooler delta-T for early warning.', authorId: users.contractorCoordinator.id, authorName: users.contractorCoordinator.username },
    create: { id: 'demo-discussion-reply-2', discussionId: 'demo-discussion-1', content: 'Contractor report can also include cooler delta-T for early warning.', authorId: users.contractorCoordinator.id, authorName: users.contractorCoordinator.username },
  });
  await prisma.discussionReaction.upsert({
    where: { discussionId_userId: { discussionId: 'demo-discussion-1', userId: users.contractorCoordinator.id } },
    update: { reactionType: 'HELPFUL' },
    create: { discussionId: 'demo-discussion-1', userId: users.contractorCoordinator.id, reactionType: 'HELPFUL' },
  });
  await prisma.replyReaction.upsert({
    where: { replyId_userId: { replyId: 'demo-discussion-reply-1', userId: users.instrumentEngineer.id } },
    update: { reactionType: 'LIKE' },
    create: { replyId: 'demo-discussion-reply-1', userId: users.instrumentEngineer.id, reactionType: 'LIKE' },
  });

  await prisma.feedback.upsert({
    where: { id: 'demo-feedback-1' },
    update: {
      title: `${DEMO_PREFIX} Add contractor dashboard export`,
      description: 'Contractor workspace would benefit from a simple PDF/Excel export of submitted reports and open work orders.',
      category: 'FEATURE',
      priority: 'HIGH',
      authorId: users.contractorCoordinator.id,
      authorName: users.contractorCoordinator.username,
      status: 'UNDER_REVIEW',
      upvotes: 2,
      downvotes: 0,
    },
    create: {
      id: 'demo-feedback-1',
      title: `${DEMO_PREFIX} Add contractor dashboard export`,
      description: 'Contractor workspace would benefit from a simple PDF/Excel export of submitted reports and open work orders.',
      category: 'FEATURE',
      priority: 'HIGH',
      authorId: users.contractorCoordinator.id,
      authorName: users.contractorCoordinator.username,
      status: 'UNDER_REVIEW',
      upvotes: 2,
      downvotes: 0,
    },
  });
  await prisma.feedbackReaction.upsert({
    where: { feedbackId_userId: { feedbackId: 'demo-feedback-1', userId: users.instrumentEngineer.id } },
    update: { voteType: 'UP' },
    create: { feedbackId: 'demo-feedback-1', userId: users.instrumentEngineer.id, voteType: 'UP' },
  });
  await prisma.feedbackReaction.upsert({
    where: { feedbackId_userId: { feedbackId: 'demo-feedback-1', userId: users.hod.id } },
    update: { voteType: 'UP' },
    create: { feedbackId: 'demo-feedback-1', userId: users.hod.id, voteType: 'UP' },
  });
  await prisma.feedbackComment.upsert({
    where: { id: 'demo-feedback-comment-1' },
    update: { feedbackId: 'demo-feedback-1', content: 'Agreed. This would help monthly contractor review meetings.', authorId: users.hod.id, authorName: users.hod.username },
    create: { id: 'demo-feedback-comment-1', feedbackId: 'demo-feedback-1', content: 'Agreed. This would help monthly contractor review meetings.', authorId: users.hod.id, authorName: users.hod.username },
  });

  const manualFolders = await prisma.manualFolder.findMany({
    where: {
      OR: [
        { category: 'mechanical', name: 'Equipment Manuals' },
        { category: 'electrical', name: 'Motor Manuals' },
        { category: 'instrumentation', name: 'Transmitter Manuals' },
      ],
    },
  });
  const manualFolderMap = new Map(manualFolders.map((folder) => [`${folder.category}:${folder.name}`, folder]));

  for (const document of [
    { id: 'demo-manual-1', folderKey: 'mechanical:Equipment Manuals', originalName: 'demo-air-compressor-maintenance-guide.txt', storedName: 'demo-air-compressor-maintenance-guide.txt', repositoryPath: 'mechanical/demo-air-compressor-maintenance-guide.txt', uploadedById: admin.id },
    { id: 'demo-manual-2', folderKey: 'electrical:Motor Manuals', originalName: 'demo-motor-megger-procedure.txt', storedName: 'demo-motor-megger-procedure.txt', repositoryPath: 'electrical/demo-motor-megger-procedure.txt', uploadedById: admin.id },
    { id: 'demo-manual-3', folderKey: 'instrumentation:Transmitter Manuals', originalName: 'demo-flow-meter-loop-check.txt', storedName: 'demo-flow-meter-loop-check.txt', repositoryPath: 'instrumentation/demo-flow-meter-loop-check.txt', uploadedById: users.instrumentEngineer.id },
  ]) {
    const folder = manualFolderMap.get(document.folderKey);
    if (!folder) continue;
    await prisma.repositoryDocument.upsert({
      where: { id: document.id },
      update: {
        folderId: folder.id,
        originalName: document.originalName,
        storedName: document.storedName,
        mimeType: 'text/plain',
        extension: '.txt',
        size: bytes(document.originalName),
        repositoryPath: document.repositoryPath,
        uploadedById: document.uploadedById,
      },
      create: {
        id: document.id,
        folderId: folder.id,
        originalName: document.originalName,
        storedName: document.storedName,
        mimeType: 'text/plain',
        extension: '.txt',
        size: bytes(document.originalName),
        repositoryPath: document.repositoryPath,
        uploadedById: document.uploadedById,
      },
    });
  }

  for (const presentation of [
    { id: 'demo-presentation-1', title: `${DEMO_PREFIX} Monthly Maintenance Review`, category: 'MANAGEMENT', description: 'Summary note for the monthly maintenance review deck.', originalName: 'demo-maintenance-monthly-review.txt', storedName: 'demo-maintenance-monthly-review.txt', filePath: '/app/storage/presentations/demo-maintenance-monthly-review.txt', fileSize: bytes('Monthly maintenance review demo note.'), mimeType: 'text/plain', author: 'Maintenance Cell', version: '1.0', tags: ['maintenance', 'monthly', 'demo'], installationId: installation.id, isPublic: true, uploadedBy: admin.username },
    { id: 'demo-presentation-2', title: `${DEMO_PREFIX} Contractor HSE Toolbox Talk`, category: 'SAFETY', description: 'Contractor safety talk note for demo presentations module.', originalName: 'demo-hse-toolbox-talk.txt', storedName: 'demo-hse-toolbox-talk.txt', filePath: '/app/storage/presentations/demo-hse-toolbox-talk.txt', fileSize: bytes('Contractor toolbox talk demo note.'), mimeType: 'text/plain', author: 'Safety Cell', version: '1.0', tags: ['safety', 'contractor', 'demo'], installationId: installation.id, isPublic: true, uploadedBy: admin.username },
  ]) {
    await prisma.presentation.upsert({
      where: { id: presentation.id },
      update: presentation,
      create: presentation,
    });
  }

  for (const notification of [
    { dedupeKey: 'demo-overdue-wo', userId: admin.id, username: admin.username, role: admin.role, module: 'workorders', type: 'OVERDUE_WO', title: `${DEMO_PREFIX} Work order review pending`, message: 'DEMO-WO-001 has report submitted and is waiting for verification.', severity: 'HIGH', entityType: 'WorkOrder', entityId: workOrders.compressor.id, status: 'UNREAD', scheduledFor: at(0, 8, 0), metadata: { woNumber: workOrders.compressor.woNumber } },
    { dedupeKey: 'demo-calibration-due', userId: users.instrumentEngineer.id, username: users.instrumentEngineer.username, role: users.instrumentEngineer.role, module: 'calibration', type: 'CAL_DUE', title: `${DEMO_PREFIX} Meter verification follow-up`, message: `Review calibration history for ${instrumentTags.flow1501} after recent adjustment.`, severity: 'MEDIUM', entityType: 'Instrument', entityId: instrumentTags.flow1501, status: 'UNREAD', scheduledFor: at(1, 9, 0), metadata: { instrumentTag: instrumentTags.flow1501 } },
    { dedupeKey: 'demo-pm-due', userId: users.fieldSupervisor.id, username: users.fieldSupervisor.username, role: users.fieldSupervisor.role, module: 'maintenance', type: 'PM_DUE', title: `${DEMO_PREFIX} Fire pump PM upcoming`, message: 'Fire pump monthly readiness test is due within 15 days.', severity: 'INFO', entityType: 'MaintenancePlan', entityId: assignments.firePump.id, status: 'UNREAD', scheduledFor: at(0, 7, 30), metadata: { flId: fls.firePump.flId } },
  ]) {
    await prisma.notification.upsert({
      where: { dedupeKey: notification.dedupeKey },
      update: notification,
      create: notification,
    });
  }

  await prisma.inspectionRound.upsert({
    where: { id: 'demo-inspection-round-1' },
    update: {
      name: `${DEMO_PREFIX} Compressor & Fire Water Daily Round`,
      description: 'Critical rotating equipment and safety system walkdown.',
      flIds: [
        { flId: fls.compressorDriven.id, flName: fls.compressorDriven.flId, description: fls.compressorDriven.name },
        { flId: fls.firePump.id, flName: fls.firePump.flId, description: fls.firePump.name },
        { flId: fls.flowMeter.id, flName: fls.flowMeter.flId, description: fls.flowMeter.name },
      ],
      frequency: 'DAILY',
      assignedDept: 'Operations',
      isActive: true,
      createdBy: users.fieldSupervisor.username,
    },
    create: {
      id: 'demo-inspection-round-1',
      name: `${DEMO_PREFIX} Compressor & Fire Water Daily Round`,
      description: 'Critical rotating equipment and safety system walkdown.',
      flIds: [
        { flId: fls.compressorDriven.id, flName: fls.compressorDriven.flId, description: fls.compressorDriven.name },
        { flId: fls.firePump.id, flName: fls.firePump.flId, description: fls.firePump.name },
        { flId: fls.flowMeter.id, flName: fls.flowMeter.flId, description: fls.flowMeter.name },
      ],
      frequency: 'DAILY',
      assignedDept: 'Operations',
      isActive: true,
      createdBy: users.fieldSupervisor.username,
    },
  });

  await prisma.inspectionExecution.upsert({
    where: { id: 'demo-inspection-execution-1' },
    update: {
      roundId: 'demo-inspection-round-1',
      executedBy: users.fieldSupervisor.username,
      executedAt: at(-1, 7, 15),
      completedAt: at(-1, 7, 45),
      status: 'COMPLETED',
      readings: [
        { flId: fls.compressorDriven.id, flName: fls.compressorDriven.flId, value: 92, unit: 'degC', status: 'WARNING', notes: 'Discharge temp trending high before work order verification.', photoUrl: null },
        { flId: fls.firePump.id, flName: fls.firePump.flId, value: 10.9, unit: 'bar', status: 'OK', notes: 'Fire pump test satisfactory.', photoUrl: null },
        { flId: fls.flowMeter.id, flName: fls.flowMeter.flId, value: 3120, unit: 'SCMH', status: 'OK', notes: 'Meter reading matches expected throughput.', photoUrl: null },
      ],
      flaggedItems: [
        { flId: fls.compressorDriven.id, flName: fls.compressorDriven.flId, note: 'Monitor discharge temperature until report verified.', severity: 'WARNING' },
      ],
    },
    create: {
      id: 'demo-inspection-execution-1',
      roundId: 'demo-inspection-round-1',
      executedBy: users.fieldSupervisor.username,
      executedAt: at(-1, 7, 15),
      completedAt: at(-1, 7, 45),
      status: 'COMPLETED',
      readings: [
        { flId: fls.compressorDriven.id, flName: fls.compressorDriven.flId, value: 92, unit: 'degC', status: 'WARNING', notes: 'Discharge temp trending high before work order verification.', photoUrl: null },
        { flId: fls.firePump.id, flName: fls.firePump.flId, value: 10.9, unit: 'bar', status: 'OK', notes: 'Fire pump test satisfactory.', photoUrl: null },
        { flId: fls.flowMeter.id, flName: fls.flowMeter.flId, value: 3120, unit: 'SCMH', status: 'OK', notes: 'Meter reading matches expected throughput.', photoUrl: null },
      ],
      flaggedItems: [
        { flId: fls.compressorDriven.id, flName: fls.compressorDriven.flId, note: 'Monitor discharge temperature until report verified.', severity: 'WARNING' },
      ],
    },
  });

  await prisma.auditObservation.upsert({
    where: { observationNo: 'DEMO-AUD-001' },
    update: {
      agency: 'Internal Audit',
      auditDate: at(-20),
      installationId: installation.installationId,
      department: 'Instrumentation',
      service: 'Metering',
      category: 'Calibration Compliance',
      severity: 'MEDIUM',
      observation: 'Close-out evidence for contractor calibration work must be linked to the work order and certificate number.',
      reference: 'IA/2026/MTR/04',
      targetDate: addDays(baseDate, 20),
      reportedBy: users.hod.username,
      assignedTo: users.instrumentEngineer.username,
      remarks: 'Tracked through CMS workspace demo.',
      status: 'OPEN',
    },
    create: {
      id: 'demo-audit-observation-1',
      observationNo: 'DEMO-AUD-001',
      agency: 'Internal Audit',
      auditDate: at(-20),
      installationId: installation.installationId,
      department: 'Instrumentation',
      service: 'Metering',
      category: 'Calibration Compliance',
      severity: 'MEDIUM',
      observation: 'Close-out evidence for contractor calibration work must be linked to the work order and certificate number.',
      reference: 'IA/2026/MTR/04',
      targetDate: addDays(baseDate, 20),
      reportedBy: users.hod.username,
      assignedTo: users.instrumentEngineer.username,
      remarks: 'Tracked through CMS workspace demo.',
      status: 'OPEN',
    },
  });
  await prisma.auditAction.upsert({
    where: { id: 'demo-audit-action-1' },
    update: { observationId: 'demo-audit-observation-1', actionNo: 1, description: 'Update contractor report template with certificate linkage field.', assignedTo: users.instrumentEngineer.username, targetDate: addDays(baseDate, 10), status: 'IN_PROGRESS', remarks: 'Backend and contractor UI mapping in progress.' },
    create: { id: 'demo-audit-action-1', observationId: 'demo-audit-observation-1', actionNo: 1, description: 'Update contractor report template with certificate linkage field.', assignedTo: users.instrumentEngineer.username, targetDate: addDays(baseDate, 10), status: 'IN_PROGRESS', remarks: 'Backend and contractor UI mapping in progress.' },
  });
  await prisma.auditAction.upsert({
    where: { id: 'demo-audit-action-2' },
    update: { observationId: 'demo-audit-observation-1', actionNo: 2, description: 'Review contractor close-out sample in monthly meeting.', assignedTo: users.hod.username, targetDate: addDays(baseDate, 18), status: 'PENDING', remarks: 'Scheduled for monthly review.' },
    create: { id: 'demo-audit-action-2', observationId: 'demo-audit-observation-1', actionNo: 2, description: 'Review contractor close-out sample in monthly meeting.', assignedTo: users.hod.username, targetDate: addDays(baseDate, 18), status: 'PENDING', remarks: 'Scheduled for monthly review.' },
  });

  for (const auditLog of [
    { id: 'demo-activity-log-1', userId: users.contractorCoordinator.id, username: users.contractorCoordinator.username, role: users.contractorCoordinator.role, module: 'contracts', action: 'CREATE_REQUEST', method: 'POST', path: '/api/maintenance-requests', entityType: 'MaintenanceRequest', entityId: maintenanceRequests.compressor.id, statusCode: 201, details: { reqNumber: maintenanceRequests.compressor.reqNumber } },
    { id: 'demo-activity-log-2', userId: users.instrumentEngineer.id, username: users.instrumentEngineer.username, role: users.instrumentEngineer.role, module: 'workorders', action: 'ASSIGN_WO', method: 'POST', path: '/api/workorders', entityType: 'WorkOrder', entityId: workOrders.compressor.id, statusCode: 201, details: { woNumber: workOrders.compressor.woNumber } },
    { id: 'demo-activity-log-3', userId: users.contractorTech.id, username: users.contractorTech.username, role: users.contractorTech.role, module: 'reports', action: 'SUBMIT_REPORT', method: 'POST', path: '/api/contracts/reports', entityType: 'ContractorReport', entityId: 'demo-contract-report-1', statusCode: 201, details: { reportType: 'COMPLETION' } },
    { id: 'demo-activity-log-4', userId: users.fieldSupervisor.id, username: users.fieldSupervisor.username, role: users.fieldSupervisor.role, module: 'inspections', action: 'COMPLETE_ROUND', method: 'POST', path: '/api/inspections/executions/demo-inspection-execution-1/complete', entityType: 'InspectionExecution', entityId: 'demo-inspection-execution-1', statusCode: 200, details: { round: 'Compressor & Fire Water Daily Round' } },
  ]) {
    await prisma.activityAuditLog.upsert({
      where: { id: auditLog.id },
      update: auditLog,
      create: auditLog,
    });
  }

  const counts = {
    users: await prisma.user.count(),
    cases: await prisma.case.count(),
    maintenanceRequests: await prisma.maintenanceRequest.count(),
    workOrders: await prisma.workOrder.count(),
    maintenanceLogs: await prisma.maintenanceLog.count(),
    calibrationEvents: await prisma.calibrationEvent.count(),
    operationalLogs: await prisma.operationalLog.count(),
    contractorReports: await prisma.contractorReport.count(),
    trainings: await prisma.trainingRecord.count(),
    discussions: await prisma.discussion.count(),
    presentations: await prisma.presentation.count(),
    inspections: await prisma.inspectionRound.count(),
  };

  console.log('Demo data seed complete.');
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(async (error) => {
    console.error('Demo seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
