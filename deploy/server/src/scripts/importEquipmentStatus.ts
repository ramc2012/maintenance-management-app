import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

interface ParsedInstallation {
  installationId: string;
  location: string;
  type: string;
  serviceLine: string;
  sourceSheet: string;
}

interface ParsedEquipment {
  equipmentTag: string;
  installationId: string;
  description: string;
  make?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  assetCode?: string | null;
  category: string;
  equipmentTypeName: string;
  serviceLine: string;
  operationalStatus: string;
  statusReason?: string | null;
  statusUpdatedAt?: string | null;
  sheetName: string;
  sourceRow: number;
  rawStatus?: string | null;
}

interface ParsedPayload {
  sourceWorkbook: string;
  generatedAt: string;
  installations: ParsedInstallation[];
  equipment: ParsedEquipment[];
}

const DEFAULT_INPUT_PATH = path.resolve(
  __dirname,
  '../../../output/spreadsheet/equipment_status_normalized.json'
);

const normalizeDate = (value?: string | null) => (value ? new Date(value) : null);

async function main() {
  const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INPUT_PATH;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Normalized equipment file not found: ${inputPath}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as ParsedPayload;
  const installationMap = new Map<string, string>();
  const workbookInstallationIds = payload.installations.map((installation) => installation.installationId);
  const workbookEquipmentTags = new Set(payload.equipment.map((item) => item.equipmentTag));

  await prisma.installation.updateMany({
    data: {
      isActive: false,
    },
  });

  const existingEquipment = await prisma.runningEquipmentMaster.findMany({
    select: {
      equipmentTag: true,
      specifications: true,
    },
  });

  const staleImportedEquipmentTags = existingEquipment
    .filter((item) => {
      if (workbookEquipmentTags.has(item.equipmentTag)) {
        return false;
      }

      if (!item.specifications || typeof item.specifications !== 'object' || Array.isArray(item.specifications)) {
        return false;
      }

      return Boolean((item.specifications as Record<string, unknown>).importedFromWorkbook);
    })
    .map((item) => item.equipmentTag);

  if (staleImportedEquipmentTags.length > 0) {
    await prisma.runningEquipmentMaster.deleteMany({
      where: {
        equipmentTag: {
          in: staleImportedEquipmentTags,
        },
      },
    });
  }

  for (const installation of payload.installations) {
    const upserted = await prisma.installation.upsert({
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

    installationMap.set(installation.installationId, upserted.id);
  }

  let created = 0;
  let updated = 0;

  for (const item of payload.equipment) {
    const installationDbId = installationMap.get(item.installationId);
    if (!installationDbId) {
      throw new Error(`Installation not found in import map: ${item.installationId}`);
    }

    const existing = await prisma.runningEquipmentMaster.findUnique({
      where: { equipmentTag: item.equipmentTag },
      select: { equipmentTag: true },
    });

    const specifications = {
      importedFromWorkbook: true,
      importWorkbook: payload.sourceWorkbook,
      importGeneratedAt: payload.generatedAt,
      importSheet: item.sheetName,
      importRow: item.sourceRow,
      rawStatus: item.rawStatus ?? null,
    };

    await prisma.runningEquipmentMaster.upsert({
      where: { equipmentTag: item.equipmentTag },
      update: {
        description: item.description,
        category: item.category,
        equipmentTypeName: item.equipmentTypeName,
        serviceLine: item.serviceLine,
        make: item.make ?? null,
        model: item.model ?? null,
        serialNumber: item.serialNumber ?? null,
        assetCode: item.assetCode ?? null,
        installationId: installationDbId,
        operationalStatus: item.operationalStatus,
        statusReason: item.statusReason ?? null,
        statusUpdatedAt: normalizeDate(item.statusUpdatedAt),
        specifications,
      },
      create: {
        equipmentTag: item.equipmentTag,
        description: item.description,
        category: item.category,
        equipmentTypeName: item.equipmentTypeName,
        serviceLine: item.serviceLine,
        make: item.make ?? null,
        model: item.model ?? null,
        serialNumber: item.serialNumber ?? null,
        assetCode: item.assetCode ?? null,
        installationId: installationDbId,
        operationalStatus: item.operationalStatus,
        statusReason: item.statusReason ?? null,
        statusUpdatedAt: normalizeDate(item.statusUpdatedAt),
        specifications,
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        source: inputPath,
        installations: payload.installations.length,
        activeInstallations: workbookInstallationIds.length,
        removedImportedEquipment: staleImportedEquipmentTags.length,
        created,
        updated,
        totalEquipment: payload.equipment.length,
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
