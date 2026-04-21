import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import {
  detectProfileCode,
  ensureOperationalCatalog,
  extractMetricValue,
  normalizeDateKey,
  toLogDate,
} from '../services/operationsCatalog';

const prisma = new PrismaClient();

const buildRangeFilter = (from?: string, to?: string) => {
  if (!from && !to) return undefined;
  const range: any = {};
  if (from) range.gte = toLogDate(from);
  if (to) range.lte = toLogDate(to);
  return range;
};

const titleizeCode = (code: string) =>
  code
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const isNumericLike = (value: any) => value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value));

const serializeOperationalLog = (log: any) => {
  const metrics = [...(log.metrics || [])].sort(
    (left, right) => (left.metricDefinition?.sortOrder || 0) - (right.metricDefinition?.sortOrder || 0),
  );
  const parameters = metrics.reduce((acc: Record<string, any>, metric: any) => {
    acc[metric.metricDefinition.code] = extractMetricValue(metric);
    return acc;
  }, {});

  return {
    id: log.id,
    logDate: normalizeDateKey(log.logDate),
    shift: log.shift,
    granularity: log.granularity,
    sourceMode: log.sourceMode,
    sourceStatus: log.sourceStatus,
    assetClass: log.assetClass,
    profileCode: log.profileCode,
    installationId: log.installationId,
    installationName: log.installation?.installationId,
    equipmentTag: log.equipmentTag,
    equipmentDescription: log.equipment?.description,
    runtimeHours: log.runtimeHours || 0,
    downtimeHours: log.downtimeHours || 0,
    standbyHours: log.standbyHours || 0,
    cumulativeHours: log.cumulativeHours || 0,
    operatingState: log.operatingState,
    availabilityStatus: log.availabilityStatus,
    enteredBy: log.enteredBy,
    reviewedBy: log.reviewedBy,
    approvedBy: log.approvedBy,
    approvedAt: log.approvedAt,
    remarks: log.remarks,
    qualityScore: log.qualityScore,
    parameters,
    metrics: metrics.map((metric: any) => ({
      code: metric.metricDefinition.code,
      label: metric.metricDefinition.label,
      unit: metric.metricDefinition.unit,
      displayGroup: metric.metricDefinition.displayGroup,
      warningMin: metric.metricDefinition.warningMin,
      warningMax: metric.metricDefinition.warningMax,
      alertMin: metric.metricDefinition.alertMin,
      alertMax: metric.metricDefinition.alertMax,
      value: extractMetricValue(metric),
    })),
    compressorProcessLog: log.compressorProcessLog || null,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
};

const serializeProfile = (profile: any) => ({
  id: profile.id,
  code: profile.code,
  name: profile.name,
  description: profile.description,
  assetClass: profile.assetClass,
  logGranularity: profile.logGranularity,
  defaultSourceMode: profile.defaultSourceMode,
  requiresApproval: profile.requiresApproval,
  allowBackdated: profile.allowBackdated,
  active: profile.active,
  matcherKeywords: profile.matcherKeywords || [],
  metrics: (profile.metrics || [])
    .sort((left: any, right: any) => left.sequence - right.sequence)
    .map((link: any) => ({
      code: link.metricDefinition.code,
      label: link.metricDefinition.label,
      unit: link.metricDefinition.unit,
      valueType: link.metricDefinition.valueType,
      captureType: link.metricDefinition.captureType,
      displayGroup: link.metricDefinition.displayGroup,
      warningMin: link.metricDefinition.warningMin,
      warningMax: link.metricDefinition.warningMax,
      alertMin: link.metricDefinition.alertMin,
      alertMax: link.metricDefinition.alertMax,
      required: link.isRequired || link.metricDefinition.isRequired,
      defaultVisible: link.defaultVisible,
      sequence: link.sequence,
    })),
});

const ensureMetricDefinitionsForPayload = async (parameters: Record<string, any>) => {
  const entries = Object.entries(parameters || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return [];

  const codes = entries.map(([code]) => code);
  const existing = await prisma.operationalMetricDefinition.findMany({
    where: { code: { in: codes } },
  });
  const existingCodes = new Set(existing.map((metric) => metric.code));

  for (const [code, value] of entries) {
    if (existingCodes.has(code)) continue;

    await prisma.operationalMetricDefinition.create({
      data: {
        code,
        label: titleizeCode(code),
        valueType: isNumericLike(value) ? 'NUMBER' : typeof value === 'boolean' ? 'BOOLEAN' : 'TEXT',
        captureType: 'MANUAL',
        displayGroup: 'CUSTOM',
        sortOrder: 900,
        isRequired: false,
      },
    });
  }

  return prisma.operationalMetricDefinition.findMany({
    where: { code: { in: codes } },
  });
};

const syncOperationalMetrics = async (operationalLogId: string, parameters: Record<string, any>) => {
  await prisma.operationalLogMetric.deleteMany({
    where: { operationalLogId },
  });

  if (!parameters || Object.keys(parameters).length === 0) return;

  const metricDefinitions = await ensureMetricDefinitionsForPayload(parameters);
  const metricDefinitionMap = new Map(metricDefinitions.map((metric) => [metric.code, metric]));

  for (const [code, rawValue] of Object.entries(parameters)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    const metricDefinition = metricDefinitionMap.get(code);
    if (!metricDefinition) continue;

    const payload: any = {
      operationalLogId,
      metricDefinitionId: metricDefinition.id,
      readingTimestamp: new Date(),
    };

    if (metricDefinition.valueType === 'BOOLEAN') {
      payload.valueBoolean = Boolean(rawValue);
    } else if (metricDefinition.valueType === 'NUMBER' && isNumericLike(rawValue)) {
      payload.valueNumber = Number(rawValue);
    } else if (metricDefinition.valueType === 'ENUM') {
      payload.valueEnum = String(rawValue);
    } else {
      payload.valueText = String(rawValue);
    }

    await prisma.operationalLogMetric.create({ data: payload });
  }
};

const createOrUpdateOperationalLog = async (input: any) => {
  await ensureOperationalCatalog(prisma);

  const normalizedDate = toLogDate(input.logDate);
  const shift = input.shift || 'GENERAL';

  const equipment = await prisma.runningEquipmentMaster.findUnique({
    where: { equipmentTag: input.equipmentTag },
    include: { installation: true },
  });

  if (!equipment) {
    throw new Error('Running equipment not found');
  }

  const installationId = input.installationId || equipment.installationId;
  const profileCode = input.profileCode || detectProfileCode(equipment);
  const sourceMode = input.sourceMode || 'MANUAL';
  const sourceStatus =
    input.sourceStatus || (sourceMode === 'AUTO' ? 'AUTO_CAPTURED' : input.approvedBy ? 'APPROVED' : 'DRAFT');

  const persisted = await prisma.operationalLog.upsert({
    where: {
      logDate_shift_equipmentTag: {
        logDate: normalizedDate,
        shift,
        equipmentTag: equipment.equipmentTag,
      },
    },
    update: {
      granularity: input.granularity || 'DAILY',
      sourceMode,
      sourceStatus,
      assetClass: 'RUNNING_EQUIPMENT',
      profileCode,
      installationId,
      runtimeHours: input.runtimeHours ?? 0,
      downtimeHours: input.downtimeHours ?? 0,
      standbyHours: input.standbyHours ?? 0,
      cumulativeHours: input.cumulativeHours ?? 0,
      operatingState: input.operatingState || 'RUNNING',
      availabilityStatus: input.availabilityStatus || 'AVAILABLE',
      enteredBy: input.enteredBy,
      reviewedBy: input.reviewedBy,
      approvedBy: input.approvedBy,
      approvedAt: input.approvedBy ? new Date() : undefined,
      remarks: input.remarks,
      qualityScore: input.qualityScore,
    },
    create: {
      logDate: normalizedDate,
      shift,
      granularity: input.granularity || 'DAILY',
      sourceMode,
      sourceStatus,
      assetClass: 'RUNNING_EQUIPMENT',
      profileCode,
      installationId,
      equipmentTag: equipment.equipmentTag,
      runtimeHours: input.runtimeHours ?? 0,
      downtimeHours: input.downtimeHours ?? 0,
      standbyHours: input.standbyHours ?? 0,
      cumulativeHours: input.cumulativeHours ?? 0,
      operatingState: input.operatingState || 'RUNNING',
      availabilityStatus: input.availabilityStatus || 'AVAILABLE',
      enteredBy: input.enteredBy,
      reviewedBy: input.reviewedBy,
      approvedBy: input.approvedBy,
      approvedAt: input.approvedBy ? new Date() : undefined,
      remarks: input.remarks,
      qualityScore: input.qualityScore,
    },
  });

  await syncOperationalMetrics(persisted.id, input.parameters || {});

  return prisma.operationalLog.findUnique({
    where: { id: persisted.id },
    include: {
      installation: true,
      equipment: true,
      metrics: { include: { metricDefinition: true } },
      compressorProcessLog: true,
    },
  });
};

export const getOperationalProfiles = async (_req: Request, res: Response) => {
  try {
    await ensureOperationalCatalog(prisma);
    const profiles = await prisma.assetLogProfile.findMany({
      where: { active: true },
      include: {
        metrics: {
          include: { metricDefinition: true },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(profiles.map(serializeProfile));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch operational profiles' });
  }
};

export const getOperationalAssetProfile = async (req: Request, res: Response) => {
  try {
    await ensureOperationalCatalog(prisma);
    const equipment = await prisma.runningEquipmentMaster.findUnique({
      where: { equipmentTag: req.params.equipmentTag },
      include: { installation: true },
    });
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });

    const profileCode = detectProfileCode(equipment);
    const profile = await prisma.assetLogProfile.findUnique({
      where: { code: profileCode },
      include: {
        metrics: {
          include: { metricDefinition: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    res.json({
      equipment,
      profileCode,
      profile: profile ? serializeProfile(profile) : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch asset profile' });
  }
};

export const getOperationalLogs = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.installationId) where.installationId = String(req.query.installationId);
    if (req.query.equipmentTag) where.equipmentTag = String(req.query.equipmentTag);
    const range = buildRangeFilter(req.query.from as string | undefined, req.query.to as string | undefined);
    if (range) where.logDate = range;

    const logs = await prisma.operationalLog.findMany({
      where,
      include: {
        installation: true,
        equipment: true,
        metrics: { include: { metricDefinition: true } },
        compressorProcessLog: true,
      },
      orderBy: [{ logDate: 'desc' }, { shift: 'asc' }],
      take: 500,
    });

    res.json(logs.map(serializeOperationalLog));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch operational logs' });
  }
};

export const createOperationalLog = async (req: Request, res: Response) => {
  try {
    const persisted = await createOrUpdateOperationalLog(req.body || {});
    res.status(201).json(serializeOperationalLog(persisted));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create operational log' });
  }
};

export const deleteOperationalLog = async (req: Request, res: Response) => {
  try {
    await prisma.operationalLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Operational log deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete operational log' });
  }
};

export const getOperationalOverview = async (req: Request, res: Response) => {
  try {
    const todayKey = normalizeDateKey(new Date());
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 6);

    const where: any = {};
    if (req.query.installationId) where.installationId = String(req.query.installationId);
    where.logDate = buildRangeFilter((req.query.from as string) || normalizeDateKey(defaultFrom), (req.query.to as string) || todayKey);

    const [logs, compressors, equipmentCount] = await Promise.all([
      prisma.operationalLog.findMany({
        where,
        include: {
          equipment: true,
          metrics: { include: { metricDefinition: true } },
        },
        orderBy: { logDate: 'asc' },
      }),
      prisma.gasCompressionLog.findMany({
        where: {
          ...(req.query.installationId ? { installationId: String(req.query.installationId) } : {}),
          ...(where.logDate ? { date: where.logDate } : {}),
        },
        orderBy: { date: 'asc' },
      }),
      prisma.runningEquipmentMaster.count({
        where: req.query.installationId ? { installationId: String(req.query.installationId) } : undefined,
      }),
    ]);

    const serializedLogs = logs.map(serializeOperationalLog);
    const currentLogs = serializedLogs.filter((log) => log.logDate === todayKey);
    const currentLoggedEquipment = new Set(currentLogs.map((log) => log.equipmentTag));

    const totalRuntime = serializedLogs.reduce((sum, log) => sum + (log.runtimeHours || 0), 0);
    const totalDowntime = serializedLogs.reduce((sum, log) => sum + (log.downtimeHours || 0), 0);
    const totalStandby = serializedLogs.reduce((sum, log) => sum + (log.standbyHours || 0), 0);
    const autoCapturedCount = serializedLogs.filter((log) => log.sourceMode !== 'MANUAL').length;
    const unavailableCount = serializedLogs.filter((log) => log.availabilityStatus === 'UNAVAILABLE').length;

    const runtimeByDay = new Map<string, { runtime: number; downtime: number }>();
    const runtimeByAsset = new Map<string, { equipmentTag: string; description: string; runtime: number; downtime: number }>();
    const exceptionAssets = new Map<string, { equipmentTag: string; description: string; exceptions: number }>();

    for (const log of serializedLogs) {
      const dayKey = log.logDate;
      runtimeByDay.set(dayKey, {
        runtime: (runtimeByDay.get(dayKey)?.runtime || 0) + (log.runtimeHours || 0),
        downtime: (runtimeByDay.get(dayKey)?.downtime || 0) + (log.downtimeHours || 0),
      });

      const assetAggregate = runtimeByAsset.get(log.equipmentTag) || {
        equipmentTag: log.equipmentTag,
        description: log.equipmentDescription || log.equipmentTag,
        runtime: 0,
        downtime: 0,
      };
      assetAggregate.runtime += log.runtimeHours || 0;
      assetAggregate.downtime += log.downtimeHours || 0;
      runtimeByAsset.set(log.equipmentTag, assetAggregate);

      const metricExceptions = (log.metrics || []).filter((metric: any) => {
        const numericValue = typeof metric.value === 'number' ? metric.value : null;
        if (numericValue === null) return false;
        if (metric.alertMax !== null && metric.alertMax !== undefined && numericValue > metric.alertMax) return true;
        if (metric.alertMin !== null && metric.alertMin !== undefined && numericValue < metric.alertMin) return true;
        if (metric.warningMax !== null && metric.warningMax !== undefined && numericValue > metric.warningMax) return true;
        if (metric.warningMin !== null && metric.warningMin !== undefined && numericValue < metric.warningMin) return true;
        return false;
      }).length;

      const exceptionCount =
        metricExceptions +
        (log.downtimeHours > 0 ? 1 : 0) +
        (log.availabilityStatus === 'UNAVAILABLE' ? 1 : 0) +
        (log.sourceStatus === 'REJECTED' ? 1 : 0);

      if (exceptionCount > 0) {
        const existing = exceptionAssets.get(log.equipmentTag) || {
          equipmentTag: log.equipmentTag,
          description: log.equipmentDescription || log.equipmentTag,
          exceptions: 0,
        };
        existing.exceptions += exceptionCount;
        exceptionAssets.set(log.equipmentTag, existing);
      }
    }

    const trend = [...runtimeByDay.entries()].map(([date, values]) => ({
      date,
      runtime: Number(values.runtime.toFixed(2)),
      downtime: Number(values.downtime.toFixed(2)),
    }));

    const topRuntimeAssets = [...runtimeByAsset.values()]
      .sort((left, right) => right.runtime - left.runtime)
      .slice(0, 6);

    const topExceptionAssets = [...exceptionAssets.values()]
      .sort((left, right) => right.exceptions - left.exceptions)
      .slice(0, 6);

    const compressorTotals = compressors.reduce(
      (acc, item) => {
        acc.outputGas += item.outputGasVolume ?? item.gasCompressed ?? 0;
        acc.inputGas += item.inputGasVolume ?? 0;
        acc.fuelGas += item.fuelGasVolume ?? 0;
        acc.trips += item.tripCount ?? 0;
        acc.efficiencySamples += item.efficiencyPct ? 1 : 0;
        acc.efficiencyTotal += item.efficiencyPct ?? 0;
        return acc;
      },
      { outputGas: 0, inputGas: 0, fuelGas: 0, trips: 0, efficiencySamples: 0, efficiencyTotal: 0 },
    );

    res.json({
      stats: {
        totalRuntime: Number(totalRuntime.toFixed(2)),
        totalDowntime: Number(totalDowntime.toFixed(2)),
        totalStandby: Number(totalStandby.toFixed(2)),
        submittedLogs: serializedLogs.length,
        assetsLoggedToday: currentLoggedEquipment.size,
        pendingLogsToday: Math.max(equipmentCount - currentLoggedEquipment.size, 0),
        autoCapturedCount,
        unavailableCount,
      },
      compressorStats: {
        outputGas: Number(compressorTotals.outputGas.toFixed(2)),
        inputGas: Number(compressorTotals.inputGas.toFixed(2)),
        fuelGas: Number(compressorTotals.fuelGas.toFixed(2)),
        tripCount: compressorTotals.trips,
        avgEfficiency:
          compressorTotals.efficiencySamples > 0
            ? Number((compressorTotals.efficiencyTotal / compressorTotals.efficiencySamples).toFixed(2))
            : 0,
      },
      trend,
      topRuntimeAssets,
      topExceptionAssets,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch operations overview' });
  }
};

export const getOperationalAssetTimeline = async (req: Request, res: Response) => {
  try {
    const equipmentTag = req.params.equipmentTag;
    const [equipment, operationalLogs, maintenanceLogs, compressorLogs] = await Promise.all([
      prisma.runningEquipmentMaster.findUnique({
        where: { equipmentTag },
        include: { installation: true },
      }),
      prisma.operationalLog.findMany({
        where: { equipmentTag },
        include: {
          metrics: { include: { metricDefinition: true } },
        },
        orderBy: { logDate: 'desc' },
        take: 120,
      }),
      prisma.maintenanceLog.findMany({
        where: { equipmentTag },
        orderBy: { date: 'desc' },
        take: 120,
      }),
      prisma.gasCompressionLog.findMany({
        where: { compressorId: equipmentTag },
        orderBy: { date: 'desc' },
        take: 120,
      }),
    ]);

    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });

    const timeline = [
      ...operationalLogs.map((log) => {
        const serialized = serializeOperationalLog({
          ...log,
          installation: equipment.installation,
          equipment,
        });
        return {
          id: log.id,
          type: 'OPERATIONAL_LOG',
          timestamp: log.logDate,
          title: `${log.shift} operational log`,
          subtitle: `${serialized.operatingState || 'RUNNING'} • ${serialized.availabilityStatus || 'AVAILABLE'}`,
          payload: serialized,
        };
      }),
      ...maintenanceLogs.map((log) => ({
        id: log.id,
        type: 'MAINTENANCE_LOG',
        timestamp: log.startTime || log.date,
        title: log.description,
        subtitle: `${log.jobType} • ${log.status} • ${log.section}`,
        payload: log,
      })),
      ...compressorLogs.map((log) => ({
        id: log.id,
        type: 'COMPRESSOR_LOG',
        timestamp: log.date,
        title: 'Compressor process log',
        subtitle: `${log.shift} • Output ${(log.outputGasVolume ?? log.gasCompressed ?? 0).toLocaleString()} m³`,
        payload: log,
      })),
    ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());

    res.json({
      equipment,
      timeline,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch asset timeline' });
  }
};

export const getCompressorLogs = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.query.installationId) where.installationId = String(req.query.installationId);
    if (req.query.compressorId) where.compressorId = String(req.query.compressorId);
    const range = buildRangeFilter(req.query.from as string | undefined, req.query.to as string | undefined);
    if (range) where.date = range;

    const logs = await prisma.gasCompressionLog.findMany({
      where,
      orderBy: [{ date: 'desc' }, { shift: 'asc' }],
      take: 500,
    });

    res.json(
      logs.map((log) => ({
        ...log,
        logDate: normalizeDateKey(log.date),
        outputGasVolume: log.outputGasVolume ?? log.gasCompressed,
      })),
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch compressor logs' });
  }
};

export const createCompressorLog = async (req: Request, res: Response) => {
  try {
    const equipment = await prisma.runningEquipmentMaster.findUnique({
      where: { equipmentTag: req.body.compressorId },
      include: { installation: true },
    });
    if (!equipment) return res.status(404).json({ error: 'Compressor equipment not found' });

    const normalizedDate = toLogDate(req.body.logDate || req.body.date || new Date());
    const shift = req.body.shift || 'GENERAL';

    const operationalLog = await createOrUpdateOperationalLog({
      logDate: normalizedDate,
      shift,
      installationId: req.body.installationId || equipment.installationId,
      equipmentTag: equipment.equipmentTag,
      runtimeHours: req.body.runHours ?? req.body.runtimeHours ?? 0,
      downtimeHours: req.body.downtimeHours ?? 0,
      standbyHours: req.body.standbyHours ?? 0,
      cumulativeHours: req.body.cumulativeHours ?? 0,
      operatingState: req.body.operatingState || ((req.body.runHours ?? 0) > 0 ? 'RUNNING' : 'STOPPED'),
      availabilityStatus: req.body.availabilityStatus || 'AVAILABLE',
      sourceMode: req.body.sourceMode || 'HYBRID',
      sourceStatus: req.body.sourceStatus || 'REVIEWED',
      enteredBy: req.body.enteredBy,
      approvedBy: req.body.approvedBy,
      profileCode: 'COMPRESSOR_STANDARD',
      remarks: req.body.remarks,
      parameters: {
        flow_rate: req.body.flowRate,
        suction_pressure: req.body.suctionPressure,
        discharge_pressure: req.body.dischargePressure,
        suction_temp: req.body.suctionTemp,
        discharge_temp: req.body.dischargeTemp,
        oil_pressure: req.body.lubeOilPressure,
        vibration: req.body.vibration,
        load_pct: req.body.loadPct,
      },
    });

    const compressorLog = await prisma.gasCompressionLog.upsert({
      where: {
        date_shift_compressorId: {
          date: normalizedDate,
          shift,
          compressorId: equipment.equipmentTag,
        },
      },
      update: {
        sourceMode: req.body.sourceMode || 'HYBRID',
        installationId: req.body.installationId || equipment.installationId,
        operationalLogId: operationalLog.id,
        inputGasVolume: req.body.inputGasVolume ?? 0,
        outputGasVolume: req.body.outputGasVolume ?? req.body.gasCompressed ?? 0,
        fuelGasVolume: req.body.fuelGasVolume ?? 0,
        recycleGasVolume: req.body.recycleGasVolume ?? 0,
        flareGasVolume: req.body.flareGasVolume ?? 0,
        gasCompressed: req.body.gasCompressed ?? req.body.outputGasVolume ?? 0,
        runHours: req.body.runHours ?? req.body.runtimeHours ?? 0,
        flowRate: req.body.flowRate ?? 0,
        suctionPressure: req.body.suctionPressure,
        dischargePressure: req.body.dischargePressure,
        interstagePressure: req.body.interstagePressure,
        suctionTemp: req.body.suctionTemp,
        dischargeTemp: req.body.dischargeTemp,
        lubeOilPressure: req.body.lubeOilPressure,
        lubeOilTemp: req.body.lubeOilTemp,
        jacketWaterTemp: req.body.jacketWaterTemp,
        vibration: req.body.vibration,
        loadPct: req.body.loadPct,
        efficiencyPct: req.body.efficiencyPct,
        tripCount: req.body.tripCount ?? 0,
        shutdownReason: req.body.shutdownReason,
        remarks: req.body.remarks,
      },
      create: {
        date: normalizedDate,
        shift,
        sourceMode: req.body.sourceMode || 'HYBRID',
        compressorId: equipment.equipmentTag,
        installationId: req.body.installationId || equipment.installationId,
        operationalLogId: operationalLog.id,
        inputGasVolume: req.body.inputGasVolume ?? 0,
        outputGasVolume: req.body.outputGasVolume ?? req.body.gasCompressed ?? 0,
        fuelGasVolume: req.body.fuelGasVolume ?? 0,
        recycleGasVolume: req.body.recycleGasVolume ?? 0,
        flareGasVolume: req.body.flareGasVolume ?? 0,
        gasCompressed: req.body.gasCompressed ?? req.body.outputGasVolume ?? 0,
        runHours: req.body.runHours ?? req.body.runtimeHours ?? 0,
        flowRate: req.body.flowRate ?? 0,
        suctionPressure: req.body.suctionPressure,
        dischargePressure: req.body.dischargePressure,
        interstagePressure: req.body.interstagePressure,
        suctionTemp: req.body.suctionTemp,
        dischargeTemp: req.body.dischargeTemp,
        lubeOilPressure: req.body.lubeOilPressure,
        lubeOilTemp: req.body.lubeOilTemp,
        jacketWaterTemp: req.body.jacketWaterTemp,
        vibration: req.body.vibration,
        loadPct: req.body.loadPct,
        efficiencyPct: req.body.efficiencyPct,
        tripCount: req.body.tripCount ?? 0,
        shutdownReason: req.body.shutdownReason,
        remarks: req.body.remarks,
      },
    });

    res.status(201).json({
      ...compressorLog,
      logDate: normalizeDateKey(compressorLog.date),
      outputGasVolume: compressorLog.outputGasVolume ?? compressorLog.gasCompressed,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create compressor log' });
  }
};

export const deleteCompressorLog = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.gasCompressionLog.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Compressor log not found' });

    await prisma.gasCompressionLog.delete({ where: { id: req.params.id } });
    if (existing.operationalLogId) {
      await prisma.operationalLog.delete({ where: { id: existing.operationalLogId } }).catch(() => undefined);
    }

    res.json({ message: 'Compressor log deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete compressor log' });
  }
};
