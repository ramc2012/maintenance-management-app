import ExcelJS from 'exceljs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EQUIPMENT_FILE =
  process.argv[2] ||
  '/Users/chinnadurairamachandran/Downloads/Equipment Status.xlsx';

const SOURCE_WORKBOOK = path.basename(EQUIPMENT_FILE);

const INSTALLATION_MAP: Record<string, { installationId: string; location: string; type: string }> = {
  'GGS - 2': { installationId: 'ANK-GGS-2', location: 'GGS - 2, Ankleshwar', type: 'Surface' },
  'GGS - 3': { installationId: 'ANK-GGS-3', location: 'GGS - 3, Ankleshwar', type: 'Surface' },
  'GGS - 4': { installationId: 'ANK-GGS-4', location: 'GGS - 4, Ankleshwar', type: 'Surface' },
  'GGS - 5': { installationId: 'ANK-GGS-5', location: 'GGS - 5, Ankleshwar', type: 'Surface' },
  'GGS - 6': { installationId: 'ANK-GGS-6', location: 'GGS - 6, Ankleshwar', type: 'Surface' },
  'GGS 253': { installationId: 'ANK-GGS-253', location: 'GGS 253, Ankleshwar', type: 'Surface' },
  'CTF - Ank.': { installationId: 'CTF-ANK', location: 'CTF Ankleshwar', type: 'Surface' },
  'MPH ANK': { installationId: 'MPH-ANK', location: 'MPH Ankleshwar', type: 'Surface' },
  'GCS Motwan': { installationId: 'GCS-MOTWAN', location: 'GCS Motwan', type: 'Surface' },
  'GGS Motwan': { installationId: 'GGS-MOTWAN', location: 'GGS Motwan', type: 'Surface' },
  'GCS Olpad': { installationId: 'GCS-OLPAD', location: 'GCS Olpad', type: 'Surface' },
  'KIM EPS': { installationId: 'EPS-KIM', location: 'KIM EPS', type: 'Surface' },
  NADA: { installationId: 'GGS-NADA', location: 'NADA GGS', type: 'Surface' },
  'Intake Well Kathor': { installationId: 'INTAKE-KATHOR', location: 'Intake Well Kathor', type: 'Surface' },
  'ZANORE WTP': { installationId: 'WTP-ZANORE', location: 'Zanore WTP', type: 'Surface' },
  'GGS.1': { installationId: 'GDR-GGS-1', location: 'GGS-1, Gandhar', type: 'Surface' },
  'GGS.2': { installationId: 'GDR-GGS-2', location: 'GGS-2, Gandhar', type: 'Surface' },
  'GGS.3': { installationId: 'GDR-GGS-3', location: 'GGS-3, Gandhar', type: 'Surface' },
  'GGS.4': { installationId: 'GDR-GGS-4', location: 'GGS-4, Gandhar', type: 'Surface' },
  'GGS.5': { installationId: 'GDR-GGS-5', location: 'GGS-5, Gandhar', type: 'Surface' },
  'GGS.6': { installationId: 'GDR-GGS-6', location: 'GGS-6, Gandhar', type: 'Surface' },
  'GGS.7': { installationId: 'GDR-GGS-7', location: 'GGS-7, Gandhar', type: 'Surface' },
  'GGS.8': { installationId: 'GDR-GGS-8', location: 'GGS-8, Gandhar', type: 'Surface' },
  'DSA MULLER': { installationId: 'DSA-MULLER', location: 'DSA Muller', type: 'Surface' },
  'GGS JOLWA': { installationId: 'GGS-JOLWA', location: 'GGS Jolwa', type: 'Surface' },
  'GGS KOSAMBA': { installationId: 'GGS-KOSAMBA', location: 'GGS Kosamba', type: 'Surface' },
  'GGS JAMBUSAR': { installationId: 'GGS-JAMBUSAR', location: 'GGS Jambusar', type: 'Surface' },
  'GGS.- DAHEJ': { installationId: 'GGS-DAHEJ', location: 'GGS Dahej', type: 'Surface' },
  'GGS DABKA': { installationId: 'GGS-DABKA', location: 'GGS Dabka', type: 'Surface' },
  'GGS GNAQ GANDHAR': { installationId: 'GGS-GNAQ', location: 'GGS GNAQ Gandhar', type: 'Surface' },
  'CPF GANDHAR': { installationId: 'CPF-GANDHAR', location: 'CPF Gandhar', type: 'Surface' },
  'CCPP, CPF GANDHAR': { installationId: 'CCPP-GANDHAR', location: 'CCPP, CPF Gandhar', type: 'Surface' },
  'CW-50-VII': { installationId: 'RIG-CW50-VII', location: 'CW-50-VII', type: 'Workover Rig' },
  'AHWR-50-03': { installationId: 'RIG-AHWR50-03', location: 'AHWR-50-03', type: 'Workover Rig' },
  'AHWR-50-06': { installationId: 'RIG-AHWR50-06', location: 'AHWR-50-06', type: 'Workover Rig' },
  'RG-150-I': { installationId: 'RIG-RG150-I', location: 'RG-150-I', type: 'Workover Rig' },
  'ROM-100-I': { installationId: 'RIG-ROM100-I', location: 'ROM-100-I', type: 'Workover Rig' },
  'ROM-100-II': { installationId: 'RIG-ROM100-II', location: 'ROM-100-II', type: 'Workover Rig' },
};

type ParsedLogRow = {
  installationRaw: string;
  normalizedInstallationId: string;
  equipmentName: string;
  date: Date;
  status: string;
  reason: string;
  sourceSheet: string;
};

function normalizeInstallation(rawName: unknown) {
  const key = String(rawName || '').trim();
  return INSTALLATION_MAP[key] || null;
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .toUpperCase();
}

function parseSheetDate(value: unknown, fallbackYear = 2026) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = String(value || '').trim();
  const match = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return new Date(Number(yyyy.length === 2 ? `20${yyyy}` : yyyy), Number(mm) - 1, Number(dd));
  }

  return new Date(fallbackYear, 0, 1);
}

function statusToRunStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized.includes('not') ||
    normalized.includes('spare') ||
    normalized.includes('removed') ||
    normalized.includes('moh') ||
    normalized.includes('overhaul') ||
    normalized.includes('sent to') ||
    normalized.includes('not available') ||
    normalized.includes('not applicable')
  ) {
    return false;
  }
  if (normalized.includes('working')) return true;
  return false;
}

async function parseWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EQUIPMENT_FILE);

  const parsedRows: ParsedLogRow[] = [];

  for (const worksheet of workbook.worksheets) {
    const sheetDateCell = worksheet.name === 'Workover Rig' ? worksheet.getRow(2).getCell(1).value : worksheet.getRow(1).getCell(2).value;
    const sheetDate = parseSheetDate(sheetDateCell, 2026);
    let currentInstallation = '';

    const startRow = worksheet.name === 'Workover Rig' ? 5 : 3;

    for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);

      const installationCell = worksheet.name === 'Workover Rig' ? row.getCell(2).value : row.getCell(1).value;
      const equipmentCell = worksheet.name === 'Workover Rig' ? row.getCell(3).value : row.getCell(2).value;
      const statusCell = worksheet.name === 'Workover Rig' ? row.getCell(8).value : row.getCell(6).value;
      const reasonCell = worksheet.name === 'Workover Rig' ? row.getCell(9).value : row.getCell(7).value;

      if (installationCell) {
        currentInstallation = String(installationCell).trim();
      }

      const equipmentName = String(equipmentCell || '').trim();
      const status = String(statusCell || '').trim();
      const reason = String(reasonCell || '').trim();

      if (!equipmentName || !currentInstallation || !status) {
        continue;
      }

      const normalizedInstallation = normalizeInstallation(currentInstallation);
      if (!normalizedInstallation) {
        continue;
      }

      parsedRows.push({
        installationRaw: currentInstallation,
        normalizedInstallationId: normalizedInstallation.installationId,
        equipmentName,
        date: sheetDate,
        status,
        reason,
        sourceSheet: worksheet.name,
      });
    }
  }

  return parsedRows;
}

async function main() {
  const parsedRows = await parseWorkbook();
  const installations = await prisma.installation.findMany({
    select: { id: true, installationId: true },
  });
  const installationLookup = new Map(installations.map((item) => [item.installationId, item.id]));

  const equipment = await prisma.runningEquipmentMaster.findMany({
    select: { equipmentTag: true, description: true, installationId: true },
  });

  const equipmentLookup = new Map<string, string>();
  for (const item of equipment) {
    equipmentLookup.set(`${item.installationId}::${normalizeText(item.description)}`, item.equipmentTag);
  }

  let created = 0;
  let updated = 0;
  let skippedMissingInstallation = 0;
  let skippedMissingEquipment = 0;

  for (const row of parsedRows) {
    const dbInstallationId = installationLookup.get(row.normalizedInstallationId);
    if (!dbInstallationId) {
      skippedMissingInstallation += 1;
      continue;
    }

    const equipmentTag = equipmentLookup.get(`${dbInstallationId}::${normalizeText(row.equipmentName)}`);
    if (!equipmentTag) {
      skippedMissingEquipment += 1;
      continue;
    }

    const runStatus = statusToRunStatus(row.status);
    if (runStatus === null) {
      continue;
    }

    const existing = await prisma.equipmentLog.findFirst({
      where: {
        equipmentTag,
        shift: 'Day',
        date: row.date,
      },
      select: { id: true },
    });

    const payload = {
      date: row.date,
      shift: 'Day',
      equipmentTag,
      runStatus,
      remarks: row.reason || row.status,
      parameters: {
        sourceWorkbook: SOURCE_WORKBOOK,
        sourceSheet: row.sourceSheet,
        reportedStatus: row.status,
        installationRaw: row.installationRaw,
      },
      assignedBy: 'Attachment Seed',
    };

    if (existing) {
      await prisma.equipmentLog.update({
        where: { id: existing.id },
        data: payload,
      });
      updated += 1;
    } else {
      await prisma.equipmentLog.create({
        data: payload,
      });
      created += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        source: EQUIPMENT_FILE,
        parsedRows: parsedRows.length,
        created,
        updated,
        skippedMissingInstallation,
        skippedMissingEquipment,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
