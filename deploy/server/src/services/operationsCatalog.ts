import { PrismaClient, RunningEquipmentMaster } from '@prisma/client';

type MetricSeed = {
  code: string;
  label: string;
  unit?: string;
  assetClass?: string;
  valueType: string;
  captureType?: string;
  aggregationRule?: string;
  alertMin?: number;
  alertMax?: number;
  warningMin?: number;
  warningMax?: number;
  displayGroup?: string;
  sortOrder?: number;
  isRequired?: boolean;
};

type ProfileSeed = {
  code: string;
  name: string;
  description: string;
  matcherKeywords: string[];
  logGranularity?: string;
  defaultSourceMode?: string;
  requiresApproval?: boolean;
  metricCodes: Array<{ code: string; required?: boolean }>;
};

const METRIC_DEFINITIONS: MetricSeed[] = [
  { code: 'runtime_hours', label: 'Runtime Hours', unit: 'hrs', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'SUM', displayGroup: 'RUNTIME', sortOrder: 10, isRequired: true },
  { code: 'downtime_hours', label: 'Downtime Hours', unit: 'hrs', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'SUM', displayGroup: 'RUNTIME', sortOrder: 20 },
  { code: 'standby_hours', label: 'Standby Hours', unit: 'hrs', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'SUM', displayGroup: 'RUNTIME', sortOrder: 30 },
  { code: 'cumulative_hours', label: 'Cumulative Hours', unit: 'hrs', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'LAST', displayGroup: 'RUNTIME', sortOrder: 40 },
  { code: 'voltage', label: 'Voltage', unit: 'V', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'ELECTRICAL', sortOrder: 50, warningMin: 380, warningMax: 460 },
  { code: 'current', label: 'Current', unit: 'A', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'ELECTRICAL', sortOrder: 60 },
  { code: 'bearing_temp', label: 'Bearing Temperature', unit: '°C', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'MAX', displayGroup: 'THERMAL', sortOrder: 70, warningMax: 85, alertMax: 95 },
  { code: 'winding_temp', label: 'Winding Temperature', unit: '°C', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'MAX', displayGroup: 'THERMAL', sortOrder: 80, warningMax: 110, alertMax: 125 },
  { code: 'vibration', label: 'Vibration', unit: 'mm/s', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'MAX', displayGroup: 'HEALTH', sortOrder: 90, warningMax: 7.1, alertMax: 11 },
  { code: 'suction_pressure', label: 'Suction Pressure', unit: 'bar', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'PRESSURE', sortOrder: 100 },
  { code: 'discharge_pressure', label: 'Discharge Pressure', unit: 'bar', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'PRESSURE', sortOrder: 110 },
  { code: 'flow_rate', label: 'Flow Rate', unit: 'm3/hr', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'FLOW', sortOrder: 120 },
  { code: 'suction_temp', label: 'Suction Temperature', unit: '°C', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'THERMAL', sortOrder: 130 },
  { code: 'discharge_temp', label: 'Discharge Temperature', unit: '°C', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'THERMAL', sortOrder: 140 },
  { code: 'oil_pressure', label: 'Oil Pressure', unit: 'bar', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'LUBE', sortOrder: 150 },
  { code: 'power_kw', label: 'Power', unit: 'kW', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'ELECTRICAL', sortOrder: 160 },
  { code: 'frequency_hz', label: 'Frequency', unit: 'Hz', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'ELECTRICAL', sortOrder: 170, warningMin: 49, warningMax: 51 },
  { code: 'load_pct', label: 'Load', unit: '%', valueType: 'NUMBER', captureType: 'EITHER', aggregationRule: 'AVG', displayGroup: 'LOAD', sortOrder: 180, warningMax: 95, alertMax: 100 },
];

const PROFILE_DEFINITIONS: ProfileSeed[] = [
  {
    code: 'GENERIC_MECHANICAL',
    name: 'Generic Mechanical Equipment',
    description: 'Default daily operating profile for rotating or package equipment.',
    matcherKeywords: ['equipment', 'unit'],
    metricCodes: [
      { code: 'runtime_hours', required: true },
      { code: 'downtime_hours' },
      { code: 'standby_hours' },
      { code: 'bearing_temp' },
      { code: 'vibration' },
    ],
  },
  {
    code: 'MOTOR_STANDARD',
    name: 'Motor Standard',
    description: 'Daily motor operating profile with electrical and health metrics.',
    matcherKeywords: ['motor'],
    metricCodes: [
      { code: 'runtime_hours', required: true },
      { code: 'downtime_hours' },
      { code: 'voltage' },
      { code: 'current' },
      { code: 'bearing_temp' },
      { code: 'winding_temp' },
      { code: 'vibration' },
    ],
  },
  {
    code: 'PUMP_STANDARD',
    name: 'Pump Standard',
    description: 'Daily pump operating profile with pressure, flow, and health metrics.',
    matcherKeywords: ['pump'],
    metricCodes: [
      { code: 'runtime_hours', required: true },
      { code: 'downtime_hours' },
      { code: 'suction_pressure' },
      { code: 'discharge_pressure' },
      { code: 'flow_rate' },
      { code: 'bearing_temp' },
      { code: 'vibration' },
    ],
  },
  {
    code: 'GENERATOR_STANDARD',
    name: 'Generator Standard',
    description: 'Generator operations profile for electrical generation units.',
    matcherKeywords: ['generator', 'dg set', 'dg', 'gen set'],
    metricCodes: [
      { code: 'runtime_hours', required: true },
      { code: 'downtime_hours' },
      { code: 'voltage' },
      { code: 'current' },
      { code: 'frequency_hz' },
      { code: 'power_kw' },
      { code: 'bearing_temp' },
    ],
  },
  {
    code: 'COMPRESSOR_STANDARD',
    name: 'Compressor Standard',
    description: 'Compressor operations profile with process and health indicators.',
    matcherKeywords: ['compressor', 'gas comp', 'gas booster', 'off gas', 'lp gas', 'mp gas', 'hp gas'],
    defaultSourceMode: 'HYBRID',
    requiresApproval: true,
    metricCodes: [
      { code: 'runtime_hours', required: true },
      { code: 'downtime_hours' },
      { code: 'suction_pressure' },
      { code: 'discharge_pressure' },
      { code: 'suction_temp' },
      { code: 'discharge_temp' },
      { code: 'oil_pressure' },
      { code: 'vibration' },
      { code: 'load_pct' },
      { code: 'flow_rate' },
    ],
  },
];

export function normalizeDateKey(input: string | Date) {
  const raw = input instanceof Date ? input.toISOString().slice(0, 10) : String(input || '').slice(0, 10);
  return raw || new Date().toISOString().slice(0, 10);
}

export function toLogDate(input: string | Date) {
  return new Date(`${normalizeDateKey(input)}T00:00:00.000Z`);
}

export function detectProfileCode(equipment?: Pick<RunningEquipmentMaster, 'equipmentTag' | 'description' | 'equipmentTypeName' | 'serviceLine'> | null) {
  if (!equipment) return 'GENERIC_MECHANICAL';
  const haystack = [equipment.equipmentTag, equipment.description, equipment.equipmentTypeName, equipment.serviceLine]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const profile of PROFILE_DEFINITIONS) {
    if (profile.matcherKeywords.some((keyword) => haystack.includes(keyword))) {
      return profile.code;
    }
  }

  return 'GENERIC_MECHANICAL';
}

export async function ensureOperationalCatalog(prisma: PrismaClient) {
  for (const metric of METRIC_DEFINITIONS) {
    await prisma.operationalMetricDefinition.upsert({
      where: { code: metric.code },
      update: {
        label: metric.label,
        unit: metric.unit,
        assetClass: metric.assetClass,
        valueType: metric.valueType,
        captureType: metric.captureType || 'MANUAL',
        aggregationRule: metric.aggregationRule,
        alertMin: metric.alertMin,
        alertMax: metric.alertMax,
        warningMin: metric.warningMin,
        warningMax: metric.warningMax,
        displayGroup: metric.displayGroup,
        sortOrder: metric.sortOrder || 0,
        isRequired: metric.isRequired || false,
        isActive: true,
      },
      create: {
        code: metric.code,
        label: metric.label,
        unit: metric.unit,
        assetClass: metric.assetClass,
        valueType: metric.valueType,
        captureType: metric.captureType || 'MANUAL',
        aggregationRule: metric.aggregationRule,
        alertMin: metric.alertMin,
        alertMax: metric.alertMax,
        warningMin: metric.warningMin,
        warningMax: metric.warningMax,
        displayGroup: metric.displayGroup,
        sortOrder: metric.sortOrder || 0,
        isRequired: metric.isRequired || false,
      },
    });
  }

  const metricMap = new Map(
    (await prisma.operationalMetricDefinition.findMany({
      where: { code: { in: METRIC_DEFINITIONS.map((metric) => metric.code) } },
      select: { id: true, code: true },
    })).map((metric) => [metric.code, metric.id]),
  );

  for (const profile of PROFILE_DEFINITIONS) {
    const upsertedProfile = await prisma.assetLogProfile.upsert({
      where: { code: profile.code },
      update: {
        name: profile.name,
        description: profile.description,
        assetClass: 'RUNNING_EQUIPMENT',
        logGranularity: profile.logGranularity || 'DAILY',
        defaultSourceMode: profile.defaultSourceMode || 'MANUAL',
        requiresApproval: profile.requiresApproval || false,
        allowBackdated: true,
        active: true,
        matcherKeywords: profile.matcherKeywords,
      },
      create: {
        code: profile.code,
        name: profile.name,
        description: profile.description,
        assetClass: 'RUNNING_EQUIPMENT',
        logGranularity: profile.logGranularity || 'DAILY',
        defaultSourceMode: profile.defaultSourceMode || 'MANUAL',
        requiresApproval: profile.requiresApproval || false,
        allowBackdated: true,
        active: true,
        matcherKeywords: profile.matcherKeywords,
      },
    });

    const desiredMetricIds = profile.metricCodes
      .map((item) => metricMap.get(item.code))
      .filter((value): value is string => Boolean(value));

    await prisma.assetLogProfileMetric.deleteMany({
      where: {
        assetLogProfileId: upsertedProfile.id,
        metricDefinitionId: { notIn: desiredMetricIds },
      },
    });

    for (const [index, metricRef] of profile.metricCodes.entries()) {
      const metricDefinitionId = metricMap.get(metricRef.code);
      if (!metricDefinitionId) continue;

      await prisma.assetLogProfileMetric.upsert({
        where: {
          assetLogProfileId_metricDefinitionId: {
            assetLogProfileId: upsertedProfile.id,
            metricDefinitionId,
          },
        },
        update: {
          isRequired: metricRef.required || false,
          sequence: (index + 1) * 10,
          defaultVisible: true,
        },
        create: {
          assetLogProfileId: upsertedProfile.id,
          metricDefinitionId,
          isRequired: metricRef.required || false,
          sequence: (index + 1) * 10,
          defaultVisible: true,
        },
      });
    }
  }
}

export function extractMetricValue(metric: {
  valueNumber: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
  valueEnum: string | null;
}) {
  if (metric.valueNumber !== null) return metric.valueNumber;
  if (metric.valueBoolean !== null) return metric.valueBoolean;
  if (metric.valueEnum !== null) return metric.valueEnum;
  return metric.valueText;
}
