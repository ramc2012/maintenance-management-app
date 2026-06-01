import { Discipline, PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.POSTGRES_PORT && process.env.DATABASE_URL?.includes('@localhost:')) {
  process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
}

const prisma = new PrismaClient();

const SEED_SOURCE = 'equipment-status-seed';
const DATA_PATH = path.resolve(__dirname, '../prisma/seed-data/equipment_status_normalized.json');

type InstallationSeed = {
  installationId: string;
  location: string;
  type: string;
  serviceLine?: string;
  sourceSheet?: string;
  rawInstallationName?: string;
};

type EquipmentSeed = {
  equipmentTag: string;
  installationId: string;
  rawInstallationName?: string;
  description: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  assetCode?: string | null;
  category: string;
  primaryDiscipline?: string;
  equipmentTypeName?: string | null;
  serviceLine?: string | null;
  operationalStatus?: string | null;
  statusReason?: string | null;
  statusUpdatedAt?: string | null;
  sheetName?: string;
  sourceRow?: number;
  rawStatus?: string | null;
};

type EquipmentStatusSeed = {
  generatedAt: string;
  sourceWorkbook: string;
  installations: InstallationSeed[];
  equipment: EquipmentSeed[];
};

function parseSeedData(): EquipmentStatusSeed {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8')) as EquipmentStatusSeed;
}

function toDiscipline(value?: string | null): Discipline {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'ELECTRICAL') return Discipline.ELECTRICAL;
  if (normalized === 'INSTRUMENTATION') return Discipline.INSTRUMENTATION;
  return Discipline.MECHANICAL;
}

function toLogDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusToState(status?: string | null) {
  switch (status) {
    case 'WORKING':
      return { operatingState: 'RUNNING', availabilityStatus: 'AVAILABLE' };
    case 'NOT_WORKING':
      return { operatingState: 'STOPPED', availabilityStatus: 'UNAVAILABLE' };
    case 'UNDER_MOH':
    case 'OVERHAULING':
      return { operatingState: 'MAINTENANCE', availabilityStatus: 'DEGRADED' };
    default:
      return { operatingState: 'UNKNOWN', availabilityStatus: 'DEGRADED' };
  }
}

async function main() {
  const seed = parseSeedData();

  console.log(`Seeding equipment status from ${DATA_PATH}`);
  console.log(`Source workbook: ${seed.sourceWorkbook}`);

  for (const installation of seed.installations) {
    await prisma.installation.upsert({
      where: { installationId: installation.installationId },
      update: {
        location: installation.location,
        type: installation.type,
        isActive: true,
      },
      create: {
        installationId: installation.installationId,
        location: installation.location,
        type: installation.type,
        isActive: true,
      },
    });
  }

  const installations = await prisma.installation.findMany();
  const installationLookup = new Map(installations.map((installation) => [installation.installationId, installation.id]));

  let equipmentCount = 0;
  let statusSnapshotCount = 0;
  let skippedCount = 0;

  for (const equipment of seed.equipment) {
    const installationId = installationLookup.get(equipment.installationId);
    if (!installationId) {
      skippedCount += 1;
      console.warn(`Skipping ${equipment.equipmentTag}: installation ${equipment.installationId} was not seeded.`);
      continue;
    }

    const primaryDiscipline = toDiscipline(equipment.primaryDiscipline);
    const specifications = {
      serialNumber: equipment.serialNumber || undefined,
      assetCode: equipment.assetCode || undefined,
      sourceWorkbook: seed.sourceWorkbook,
      sourceSheet: equipment.sheetName,
      sourceRow: equipment.sourceRow,
      rawInstallationName: equipment.rawInstallationName,
      equipmentStatus: {
        status: equipment.operationalStatus || 'UNKNOWN',
        rawStatus: equipment.rawStatus || null,
        reason: equipment.statusReason || null,
        updatedAt: equipment.statusUpdatedAt || null,
      },
    };

    await prisma.runningEquipmentMaster.upsert({
      where: { equipmentTag: equipment.equipmentTag },
      update: {
        category: 'RUNNING',
        description: equipment.description,
        make: equipment.make || null,
        model: equipment.model || null,
        equipmentTypeName: equipment.equipmentTypeName || null,
        serviceLine: equipment.serviceLine || null,
        installationId,
        primaryDiscipline,
        specifications,
      },
      create: {
        equipmentTag: equipment.equipmentTag,
        category: 'RUNNING',
        description: equipment.description,
        make: equipment.make || null,
        model: equipment.model || null,
        equipmentTypeName: equipment.equipmentTypeName || null,
        serviceLine: equipment.serviceLine || null,
        installationId,
        primaryDiscipline,
        specifications,
      },
    });
    equipmentCount += 1;

    const logDate = toLogDate(equipment.statusUpdatedAt);
    if (logDate) {
      const status = statusToState(equipment.operationalStatus);
      await prisma.operationalLog.upsert({
        where: {
          logDate_shift_equipmentTag: {
            logDate,
            shift: 'EQUIPMENT_STATUS',
            equipmentTag: equipment.equipmentTag,
          },
        },
        update: {
          granularity: 'DAILY',
          sourceMode: 'AUTO',
          sourceStatus: 'REVIEWED',
          assetClass: 'RUNNING_EQUIPMENT',
          profileCode: 'EQUIPMENT_STATUS',
          installationId,
          primaryDiscipline,
          operatingState: status.operatingState,
          availabilityStatus: status.availabilityStatus,
          enteredBy: SEED_SOURCE,
          remarks: equipment.statusReason || equipment.rawStatus || null,
        },
        create: {
          logDate,
          shift: 'EQUIPMENT_STATUS',
          granularity: 'DAILY',
          sourceMode: 'AUTO',
          sourceStatus: 'REVIEWED',
          assetClass: 'RUNNING_EQUIPMENT',
          profileCode: 'EQUIPMENT_STATUS',
          installationId,
          primaryDiscipline,
          equipmentTag: equipment.equipmentTag,
          operatingState: status.operatingState,
          availabilityStatus: status.availabilityStatus,
          enteredBy: SEED_SOURCE,
          remarks: equipment.statusReason || equipment.rawStatus || null,
        },
      });
      statusSnapshotCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        installations: seed.installations.length,
        equipment: equipmentCount,
        statusSnapshots: statusSnapshotCount,
        skipped: skippedCount,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
